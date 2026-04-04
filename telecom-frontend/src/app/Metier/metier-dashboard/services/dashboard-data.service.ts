import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { TicketService } from '../../../services/ticket.service';
import { SettingsService, SlaConfig } from '../../../services/SettingsService';
import { Ticket, TicketPriority, TicketStatus } from '../../../models/ticket.model';
import { DashboardState, SlaMetrics, DashboardFilters } from '../models/dashboard-state.model';

const INITIAL_STATE: DashboardState = {
  isLoading: true,
  error: null,
  totalTickets: 0,
  statusCounts: {},
  priorityCounts: {},
  slaMetrics: { rate: 0, breachedCount: 0, onTrackCount: 0, metCount: 0, avgResolutionHours: 0 },
  urgentTickets: [],
  recentTickets: [],
  trendData: { labels: [], values: [] }
};

@Injectable()
export class DashboardDataService implements OnDestroy {
  private state$ = new BehaviorSubject<DashboardState>(INITIAL_STATE);
  private filters$ = new BehaviorSubject<DashboardFilters>({
    status: null,
    priority: null,
    dateRange: 'all',
    search: ''
  });

  private ticketsCache: Ticket[] = [];
  private slaConfigs: SlaConfig[] = [];
  private destroyRef?: { unsubscribe: () => void };

  constructor(
    private ticketService: TicketService,
    private settingsService: SettingsService
  ) {}

  getState(): Observable<DashboardState> {
    return this.state$.asObservable();
  }

  getFilters(): Observable<DashboardFilters> {
    return this.filters$.asObservable();
  }

  updateFilters(filters: Partial<DashboardFilters>): void {
    const current = this.filters$.getValue();
    this.filters$.next({ ...current, ...filters });
    if (this.ticketsCache.length > 0) this.recomputeState();
  }

  loadDashboardData(): void {
    this.state$.next({ ...this.state$.getValue(), isLoading: true, error: null });

    combineLatest([
      this.ticketService.getMyTickets().pipe(
        catchError(() => of([]))
      ),
      this.settingsService.getAllSla().pipe(
        catchError(() => of([]))
      )
    ]).pipe(
      tap(([tickets, sla]) => {
        this.ticketsCache = tickets;
        this.slaConfigs = sla;
        this.recomputeState();
      })
    ).subscribe();
  }

  refresh(): void {
    this.loadDashboardData();
  }

  private recomputeState(): void {
    const filters = this.filters$.getValue();
    let tickets = this.applyFilters(this.ticketsCache, filters);

    const statusCounts = this.countByField(tickets, 'status');
    const priorityCounts = this.countByField(tickets, 'priority');
    const slaMetrics = this.computeSlaMetrics(tickets);
    const trendData = this.computeWeeklyTrend(tickets);

    const urgent = tickets.filter(t =>
      t.slaStatus === 'BREACHED' ||
      (t.priority === 'CRITICAL' && (t.status === 'NEW' || t.status === 'ASSIGNED'))
    ).slice(0, 5);

    const recent = [...tickets].sort((a, b) =>
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    ).slice(0, 6);

    this.state$.next({
      isLoading: false,
      error: null,
      totalTickets: tickets.length,
      statusCounts,
      priorityCounts,
      slaMetrics,
      urgentTickets: urgent,
      recentTickets: recent,
      trendData
    });
  }

  private applyFilters(tickets: Ticket[], filters: DashboardFilters): Ticket[] {
    let result = [...tickets];

    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    if (filters.dateRange !== 'all') {
      const now = Date.now();
      const days = filters.dateRange === '7d' ? 7 : filters.dateRange === '30d' ? 30 : 90;
      const cutoff = now - (days * 86400000);
      result = result.filter(t => new Date(t.createdDate).getTime() >= cutoff);
    }

    return result;
  }

  private countByField(tickets: Ticket[], field: 'status' | 'priority'): Record<string, number> {
    return tickets.reduce((acc, t) => {
      const key = t[field] as string;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private computeSlaMetrics(tickets: Ticket[]): SlaMetrics {
    const breached = tickets.filter(t => t.slaStatus === 'BREACHED').length;
    const onTrack = tickets.filter(t => t.slaStatus === 'ON_TRACK').length;
    const met = tickets.filter(t => t.slaStatus === 'MET').length;
    const resolved = tickets.filter(t => t.resolvedDate);
    const totalResolvable = resolved.length + breached;

    const rate = totalResolvable > 0
      ? Math.round(((met + onTrack) / totalResolvable) * 100)
      : 100;

    let avgHours = 0;
    if (resolved.length > 0) {
      const totalHours = resolved.reduce((sum, t) => {
        return sum + (new Date(t.resolvedDate!).getTime() - new Date(t.createdDate).getTime()) / 3600000;
      }, 0);
      avgHours = Math.round(totalHours / resolved.length);
    }

    return { rate, breachedCount: breached, onTrackCount: onTrack, metCount: met, avgResolutionHours: avgHours };
  }

  private computeWeeklyTrend(tickets: Ticket[]): { labels: string[]; values: number[] } {
    const weeks: Record<string, number> = {};
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      weeks[key] = 0;
    }

    tickets.forEach(t => {
      const d = new Date(t.createdDate);
      const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (weeks[key] !== undefined) weeks[key]++;
    });

    return { labels: Object.keys(weeks), values: Object.values(weeks) };
  }

  getSlaLabel(priority: string): string {
    const sla = this.slaConfigs.find(s => s.priorityLevel === priority);
    if (sla) return sla.resolutionHours >= 24 ? `${sla.resolutionHours / 24}j` : `${sla.resolutionHours}h`;
    return { 'CRITICAL': '4h', 'HIGH': '8h', 'MEDIUM': '24h', 'LOW': '72h' }[priority] || '24h';
  }

  ngOnDestroy(): void {
    this.state$.complete();
    this.filters$.complete();
  }
}

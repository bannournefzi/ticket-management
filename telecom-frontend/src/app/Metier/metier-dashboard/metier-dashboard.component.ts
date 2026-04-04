import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../auth/service/auth.service';
import { SettingsService, SlaConfig } from '../../services/SettingsService';
import { Ticket, TicketPriority, TicketStatus } from '../../models/ticket.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-metier-dashboard',
  templateUrl: './metier-dashboard.component.html',
  styleUrls: ['./metier-dashboard.component.scss']
})
export class MetierDashboardComponent implements OnInit, AfterViewInit {

  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('priorityChart') priorityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart') trendChartRef!: ElementRef<HTMLCanvasElement>;

  myTickets: Ticket[] = [];
  slaConfigs: SlaConfig[] = [];
  isLoading = true;

  totalCount = 0;
  openCount = 0;
  inProgressCount = 0;
  onHoldCount = 0;
  resolvedCount = 0;
  closedCount = 0;
  rejectedCount = 0;

  lowCount = 0;
  mediumCount = 0;
  highCount = 0;
  criticalCount = 0;

  slaBreachedCount = 0;
  slaOnTrackCount = 0;
  slaMetCount = 0;
  slaRate = 0;
  avgResolutionHours = 0;

  urgentTickets: Ticket[] = [];
  recentTickets: Ticket[] = [];

  weeklyData: number[] = [];
  weeklyLabels: string[] = [];

  private statusChart: Chart | null = null;
  private priorityChart: Chart | null = null;
  private trendChart: Chart | null = null;
  private chartsReady = false;
  private dataReady = false;

  statusLabels: Record<string, string> = {
    'OPEN': 'Ouvert', 'IN_PROGRESS': 'En cours', 'ON_HOLD': 'En attente',
    'RESOLVED': 'Résolu', 'CLOSED': 'Fermé', 'REJECTED': 'Rejeté'
  };

  priorityConfig: Record<string, { label: string; icon: string }> = {
    'LOW': { label: 'Basse', icon: 'fas fa-arrow-down' },
    'MEDIUM': { label: 'Moyenne', icon: 'fas fa-equals' },
    'HIGH': { label: 'Haute', icon: 'fas fa-arrow-up' },
    'CRITICAL': { label: 'Critique', icon: 'fas fa-fire' }
  };

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    if (this.dataReady) this.buildCharts();
  }

  private loadData(): void {
    this.isLoading = true;
    this.ticketService.getMyTickets().subscribe({
      next: (tickets) => {
        this.myTickets = tickets;
        this.computeStats();
        this.isLoading = false;
        this.dataReady = true;
        if (this.chartsReady) this.buildCharts();
      },
      error: () => { this.isLoading = false; }
    });

    this.settingsService.getAllSla().subscribe({
      next: (configs) => this.slaConfigs = configs,
      error: () => {}
    });
  }

  private computeStats(): void {
    const t = this.myTickets;
    this.totalCount = t.length;
    this.openCount = t.filter(x => x.status === 'NEW').length;
    this.inProgressCount = t.filter(x => x.status === 'ASSIGNED').length;
    this.onHoldCount = t.filter(x => x.status === 'FEEDBACK').length;
    this.resolvedCount = t.filter(x => x.status === 'RESOLVED').length;
    this.closedCount = t.filter(x => x.status === 'CLOSED').length;

    this.lowCount = t.filter(x => x.priority === 'LOW').length;
    this.mediumCount = t.filter(x => x.priority === 'MEDIUM').length;
    this.highCount = t.filter(x => x.priority === 'HIGH').length;
    this.criticalCount = t.filter(x => x.priority === 'CRITICAL').length;

    this.slaBreachedCount = t.filter(x => x.slaStatus === 'BREACHED').length;
    this.slaOnTrackCount = t.filter(x => x.slaStatus === 'ON_TRACK').length;
    this.slaMetCount = t.filter(x => x.slaStatus === 'MET').length;

    const resolved = t.filter(x => x.resolvedDate);
    const totalResolvable = resolved.length + this.slaBreachedCount;
    this.slaRate = totalResolvable > 0 ? Math.round(((this.slaMetCount + this.slaOnTrackCount) / totalResolvable) * 100) : 100;

    if (resolved.length > 0) {
      const totalHours = resolved.reduce((sum, ticket) => {
        const created = new Date(ticket.createdDate).getTime();
        const res = new Date(ticket.resolvedDate!).getTime();
        return sum + (res - created) / 3600000;
      }, 0);
      this.avgResolutionHours = Math.round(totalHours / resolved.length);
    }

    this.urgentTickets = t.filter(x =>
      x.slaStatus === 'BREACHED' || x.priority === 'CRITICAL' && (x.status === 'NEW' || x.status === 'ASSIGNED')
    ).slice(0, 5);

    this.recentTickets = [...t].sort((a, b) =>
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    ).slice(0, 6);

    this.computeWeeklyTrend();
  }

  private computeWeeklyTrend(): void {
    const weeks: Record<string, number> = {};
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = this.getWeekLabel(d);
      weeks[key] = 0;
    }

    this.myTickets.forEach(t => {
      const d = new Date(t.createdDate);
      const key = this.getWeekLabel(d);
      if (weeks[key] !== undefined) weeks[key]++;
    });

    this.weeklyLabels = Object.keys(weeks);
    this.weeklyData = Object.values(weeks);
  }

  private getWeekLabel(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}/${m}`;
  }

  private buildCharts(): void {
    this.buildStatusChart();
    this.buildPriorityChart();
    this.buildTrendChart();
  }

  private buildStatusChart(): void {
    if (this.statusChart) this.statusChart.destroy();
    const ctx = this.statusChartRef?.nativeElement;
    if (!ctx) return;

    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ouvert', 'En cours', 'En attente', 'Résolu', 'Fermé', 'Rejeté'],
        datasets: [{
          data: [this.openCount, this.inProgressCount, this.onHoldCount, this.resolvedCount, this.closedCount, this.rejectedCount],
          backgroundColor: ['#3b82f6', '#d4a24e', '#8b5cf6', '#1a7a4c', '#6b7280', '#c0392b'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: 'bold' }, color: '#5e6470' } }
        }
      }
    });
  }

  private buildPriorityChart(): void {
    if (this.priorityChart) this.priorityChart.destroy();
    const ctx = this.priorityChartRef?.nativeElement;
    if (!ctx) return;

    this.priorityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Basse', 'Moyenne', 'Haute', 'Critique'],
        datasets: [{
          data: [this.lowCount, this.mediumCount, this.highCount, this.criticalCount],
          backgroundColor: ['#8cb89c', '#7a9bc5', '#d4a24e', '#c56a60'],
          borderRadius: 4,
          barThickness: 36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 }, color: '#8b919d' }, grid: { color: '#eef0f2' } },
          x: { ticks: { font: { size: 11, weight: 'bold' }, color: '#5e6470' }, grid: { display: false } }
        }
      }
    });
  }

  private buildTrendChart(): void {
    if (this.trendChart) this.trendChart.destroy();
    const ctx = this.trendChartRef?.nativeElement;
    if (!ctx) return;

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.weeklyLabels,
        datasets: [{
          label: 'Tickets créés',
          data: this.weeklyData,
          borderColor: '#2c3e6b',
          backgroundColor: 'rgba(44,62,107,0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#2c3e6b',
          pointBorderWidth: 2,
          pointBorderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 }, color: '#8b919d' }, grid: { color: '#eef0f2' } },
          x: { ticks: { font: { size: 10 }, color: '#8b919d' }, grid: { display: false } }
        }
      }
    });
  }

  getSlaLabel(priority: string): string {
    const sla = this.slaConfigs.find(s => s.priorityLevel === priority);
    if (sla) return sla.resolutionHours >= 24 ? `${sla.resolutionHours / 24}j` : `${sla.resolutionHours}h`;
    return { 'CRITICAL': '4h', 'HIGH': '8h', 'MEDIUM': '24h', 'LOW': '72h' }[priority] || '24h';
  }

  getStatusClass(s: string): string {
    return { 'OPEN': 's-open', 'IN_PROGRESS': 's-prog', 'ON_HOLD': 's-hold', 'RESOLVED': 's-ok', 'CLOSED': 's-closed', 'REJECTED': 's-rej' }[s] || '';
  }

  getPriorityClass(p: string): string {
    return { 'LOW': 'p-low', 'MEDIUM': 'p-med', 'HIGH': 'p-high', 'CRITICAL': 'p-crit' }[p] || '';
  }

  getTimeAgo(d: string): string {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant"; if (m < 60) return `${m}min`; if (h < 24) return `${h}h`; if (dy < 7) return `${dy}j`;
    return new Date(d).toLocaleDateString('fr-FR');
  }

  formatHours(h: number): string {
    if (h < 1) return '< 1h';
    if (h < 24) return `${h}h`;
    return `${Math.round(h / 24)}j`;
  }

  goToCreateTicket(): void { this.router.navigate(['/create-ticket']); }
  goToMyTickets(): void { this.router.navigate(['/my-tickets']); }
}
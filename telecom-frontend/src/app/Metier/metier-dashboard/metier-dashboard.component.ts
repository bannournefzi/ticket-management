import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardState, DashboardFilters, KpiData, SlaMetrics } from './models/dashboard-state.model';
import { DashboardDataService } from './services/dashboard-data.service';

@Component({
  selector: 'app-metier-dashboard',
  templateUrl: './metier-dashboard.component.html',
  styleUrls: ['./metier-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DashboardDataService]
})
export class MetierDashboardComponent implements OnInit, OnDestroy {
  state$: Observable<DashboardState>;
  filters$: Observable<DashboardFilters>;

  kpiCards: KpiData[] = [];
  statusLabels: Record<string, string> = {
    'NEW': 'Nouveau', 'FEEDBACK': 'En attente', 'ACKNOWLEDGED': 'Reconnu',
    'CONFIRMED': 'Confirmé', 'ASSIGNED': 'En cours', 'RESOLVED': 'Résolu', 'CLOSED': 'Fermé'
  };

  statusColors = ['#3b82f6', '#d4a24e', '#8b5cf6', '#6366f1', '#10b981', '#6b7280'];
  priorityColors = ['#8cb89c', '#7a9bc5', '#d4a24e', '#c56a60'];
  trendColors = ['#6366f1', 'rgba(99,102,241,0.08)'];

  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardDataService,
    private router: Router
  ) {
    this.state$ = this.dashboardService.getState();
    this.filters$ = this.dashboardService.getFilters();
  }

  ngOnInit(): void {
    this.dashboardService.loadDashboardData();

    this.state$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (state) => { this.buildKpiCards(state); }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildKpiCards(state: DashboardState): void {
    this.kpiCards = [
      {
        label: 'Total', value: state.totalTickets,
        icon: 'fas fa-ticket-alt', color: '#6366f1', bgColor: '#eef2ff'
      },
      {
        label: 'Nouveaux', value: state.statusCounts['NEW'] || 0,
        icon: 'fas fa-circle', color: '#3b82f6', bgColor: '#eff6ff'
      },
      {
        label: 'En cours', value: state.statusCounts['ASSIGNED'] || 0,
        icon: 'fas fa-play-circle', color: '#f59e0b', bgColor: '#fffbeb'
      },
      {
        label: 'En attente', value: state.statusCounts['FEEDBACK'] || 0,
        icon: 'fas fa-pause-circle', color: '#8b5cf6', bgColor: '#f5f3ff'
      },
      {
        label: 'Résolus', value: state.statusCounts['RESOLVED'] || 0,
        icon: 'fas fa-check-circle', color: '#10b981', bgColor: '#ecfdf5'
      },
      {
        label: 'Fermés', value: state.statusCounts['CLOSED'] || 0,
        icon: 'fas fa-lock', color: '#6b7280', bgColor: '#f9fafb'
      }
    ];
  }

  getStatusChartData(state: DashboardState): number[] {
    return [
      state.statusCounts['NEW'] || 0,
      state.statusCounts['ASSIGNED'] || 0,
      state.statusCounts['FEEDBACK'] || 0,
      state.statusCounts['RESOLVED'] || 0,
      state.statusCounts['CLOSED'] || 0
    ];
  }

  getStatusLabels(): string[] {
    return ['Nouveau', 'En cours', 'En attente', 'Résolu', 'Fermé'];
  }

  getPriorityChartData(state: DashboardState): number[] {
    return [
      state.priorityCounts['LOW'] || 0,
      state.priorityCounts['MEDIUM'] || 0,
      state.priorityCounts['HIGH'] || 0,
      state.priorityCounts['CRITICAL'] || 0
    ];
  }

  getPriorityLabels(): string[] {
    return ['Basse', 'Moyenne', 'Haute', 'Critique'];
  }

  onFilterChange(changes: Partial<DashboardFilters>): void {
    this.dashboardService.updateFilters(changes);
  }

  onRefresh(): void {
    this.dashboardService.refresh();
  }

  goToCreateTicket(): void { this.router.navigate(['/create-ticket']); }
  goToMyTickets(): void { this.router.navigate(['/my-tickets']); }

  trackByLabel(_index: number, kpi: KpiData): string {
    return kpi.label;
  }
}

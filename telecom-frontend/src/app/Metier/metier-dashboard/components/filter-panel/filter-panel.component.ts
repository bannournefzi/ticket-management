import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DashboardFilters } from '../../models/dashboard-state.model';

@Component({
  selector: 'app-filter-panel',
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterPanelComponent {
  @Input() filters!: DashboardFilters;
  @Output() filterChange = new EventEmitter<Partial<DashboardFilters>>();

  statusOptions = [
    { value: null, label: 'Tous' },
    { value: 'NEW', label: 'Nouveau' },
    { value: 'ASSIGNED', label: 'En cours' },
    { value: 'FEEDBACK', label: 'En attente' },
    { value: 'RESOLVED', label: 'Résolu' },
    { value: 'CLOSED', label: 'Fermé' }
  ];

  priorityOptions = [
    { value: null, label: 'Toutes' },
    { value: 'LOW', label: 'Basse' },
    { value: 'MEDIUM', label: 'Moyenne' },
    { value: 'HIGH', label: 'Haute' },
    { value: 'CRITICAL', label: 'Critique' }
  ];

  dateOptions = [
    { value: '7d' as const, label: '7j' },
    { value: '30d' as const, label: '30j' },
    { value: '90d' as const, label: '90j' },
    { value: 'all' as const, label: 'Tout' }
  ];

  expanded = false;

  onStatusChange(status: string | null): void {
    this.filterChange.emit({ status });
  }

  onPriorityChange(priority: string | null): void {
    this.filterChange.emit({ priority });
  }

  onDateChange(dateRange: '7d' | '30d' | '90d' | 'all'): void {
    this.filterChange.emit({ dateRange });
  }

  onSearch(search: string): void {
    this.filterChange.emit({ search });
  }

  clearAll(): void {
    this.filterChange.emit({ status: null, priority: null, dateRange: 'all', search: '' });
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }
}

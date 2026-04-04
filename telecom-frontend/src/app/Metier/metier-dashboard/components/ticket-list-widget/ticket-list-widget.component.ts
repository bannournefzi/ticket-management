import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Ticket } from '../../../../models/ticket.model';

@Component({
  selector: 'app-ticket-list-widget',
  templateUrl: './ticket-list-widget.component.html',
  styleUrls: ['./ticket-list-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketListWidgetComponent {
  @Input() tickets: Ticket[] = [];
  @Input() title = '';
  @Input() icon = 'fas fa-list';
  @Input() variant: 'default' | 'urgent' = 'default';
  @Output() ticketClick = new EventEmitter<Ticket>();
  @Output() actionClick = new EventEmitter<void>();

  priorityConfig: Record<string, { label: string; class: string }> = {
    'LOW': { label: 'Basse', class: 'p-low' },
    'MEDIUM': { label: 'Moyenne', class: 'p-med' },
    'HIGH': { label: 'Haute', class: 'p-high' },
    'CRITICAL': { label: 'Critique', class: 'p-crit' }
  };

  statusConfig: Record<string, { label: string; class: string }> = {
    'NEW': { label: 'Nouveau', class: 's-open' },
    'FEEDBACK': { label: 'Feedback', class: 's-hold' },
    'ACKNOWLEDGED': { label: 'Reconnu', class: 's-prog' },
    'CONFIRMED': { label: 'Confirmé', class: 's-prog' },
    'ASSIGNED': { label: 'Assigné', class: 's-prog' },
    'RESOLVED': { label: 'Résolu', class: 's-ok' },
    'CLOSED': { label: 'Fermé', class: 's-closed' }
  };

  onTicketClick(ticket: Ticket): void {
    this.ticketClick.emit(ticket);
  }

  onAction(): void {
    this.actionClick.emit();
  }

  trackById(_index: number, ticket: Ticket): number {
    return ticket.id;
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}min`;
    if (h < 24) return `${h}h`;
    if (d < 7) return `${d}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }
}

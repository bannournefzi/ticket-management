import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CalendarOptions, EventApi, EventClickArg } from '@fullcalendar/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { ToastrService } from 'ngx-toastr';
import { TicketService } from '../../services/ticket.service';
import { Ticket, TicketStatus } from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-calendar',
  templateUrl: './ticket-calendar.component.html',
  styleUrls: ['./ticket-calendar.component.scss']
})
export class TicketCalendarComponent implements OnInit {

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  calendarVisible = signal(true);
  allTickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];

  // Stats
  totalTickets = 0;
  slaViolations = 0;
  resolvedTickets = 0;
  criticalTickets = 0;
  onHoldTickets = 0;

  // Controls
  showSlaAlerts = true;
  currentFilter = 'ALL';
  currentView = 'dayGridMonth';

  // Modal
  selectedTicket: Ticket | null = null;
  isDetailModalOpen = false;

  // Statut labels
  statusLabels: Record<string, string> = {
    'OPEN': 'Ouvert',
    'IN_PROGRESS': 'En cours',
    'ON_HOLD': 'En attente',
    'RESOLVED': 'Résolu',
    'CLOSED': 'Fermé',
    'REJECTED': 'Rejeté'
  };

  priorityConfig: Record<string, { label: string; icon: string }> = {
    'LOW':      { label: 'Basse',    icon: 'fas fa-arrow-down' },
    'MEDIUM':   { label: 'Moyenne',  icon: 'fas fa-equals' },
    'HIGH':     { label: 'Haute',    icon: 'fas fa-arrow-up' },
    'CRITICAL': { label: 'Critique', icon: 'fas fa-fire' }
  };

  calendarOptions = signal<CalendarOptions>({
    plugins: [interactionPlugin, dayGridPlugin, timeGridPlugin, listPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    initialView: 'dayGridMonth',
    locale: 'fr',
    weekends: true,
    editable: false,
    selectable: false,
    dayMaxEvents: true,
    height: 'auto',
    eventDisplay: 'block',
    eventClick: this.handleEventClick.bind(this),
    events: (_fetchInfo, successCallback, _failureCallback) => {
      this.loadCalendarEvents(successCallback);
    },
    eventDidMount: (info) => {
      const el = info.el;
      const ticket = info.event.extendedProps as any;
      el.setAttribute('title',
        `#${ticket.ticketId} — ${info.event.title}\n${this.statusLabels[ticket.status] || ticket.status}\nPriorité: ${this.priorityConfig[ticket.priority]?.label || ticket.priority}`
      );

      // SLA warning
      if (ticket.slaStatus === 'BREACHED') {
        el.classList.add('sla-violated');
      } else if (ticket.slaStatus === 'AT_RISK') {
        el.classList.add('sla-at-risk');
      }
    }
  });

  constructor(
    private ticketService: TicketService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    this.setupSlaAlerts();
  }

  // ══════════════════════════════════════════
  //  DATA
  // ══════════════════════════════════════════

  loadTickets(): void {
    this.ticketService.getMyTickets().subscribe({
      next: (data) => {
        this.allTickets = data;
        this.filteredTickets = [...data];
        this.calculateStats();
        this.refreshCalendar();
      },
      error: () => { this.toastr.error('Erreur lors du chargement des tickets'); }
    });
  }

  calculateStats(): void {
    this.totalTickets = this.allTickets.length;
    this.slaViolations = this.allTickets.filter(t => t.slaStatus === 'BREACHED').length;
    this.resolvedTickets = this.allTickets.filter(t => t.status === 'RESOLVED').length;
    this.criticalTickets = this.allTickets.filter(t => t.priority === 'CRITICAL').length;
    this.onHoldTickets = this.allTickets.filter(t => t.status === 'FEEDBACK').length;
  }

  loadCalendarEvents(successCallback: Function): void {
    const events = this.filteredTickets.map(ticket => ({
      id: ticket.id.toString(),
      title: `#${ticket.id} ${ticket.title}`,
      start: ticket.createdDate,
      end: ticket.dueDate || ticket.createdDate,
      backgroundColor: this.getEventColor(ticket),
      borderColor: this.getEventBorderColor(ticket.priority),
      textColor: '#fff',
      extendedProps: {
        ticketId: ticket.id,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        slaStatus: ticket.slaStatus,
        departement: ticket.departement,
        creatorFullName: ticket.creatorFullName,
        assignedToFullName: ticket.assignedToFullName,
        description: ticket.description,
        createdDate: ticket.createdDate,
        dueDate: ticket.dueDate,
        resolvedDate: ticket.resolvedDate
      }
    }));
    successCallback(events);
  }

  refreshCalendar(): void {
    if (this.calendarComponent) {
      this.calendarComponent.getApi().refetchEvents();
    }
  }

  // ══════════════════════════════════════════
  //  SLA ALERTS
  // ══════════════════════════════════════════

  setupSlaAlerts(): void {
    // Check every 5 minutes
    setInterval(() => {
      if (this.showSlaAlerts) this.checkSlaAlerts();
    }, 5 * 60 * 1000);

    // Check immediately
    setTimeout(() => this.checkSlaAlerts(), 3000);
  }

  checkSlaAlerts(): void {
    const now = Date.now();
    this.allTickets.forEach(ticket => {
      if (!ticket.dueDate || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return;
      const due = new Date(ticket.dueDate).getTime();
      const diffMin = (due - now) / 60000;

      if (diffMin <= 60 && diffMin > 0) {
        this.toastr.warning(
          `#${ticket.id} "${ticket.title}" expire dans ${Math.round(diffMin)} min`,
          '⚠️ SLA à risque', { timeOut: 10000 }
        );
      } else if (diffMin <= 0) {
        this.toastr.error(
          `#${ticket.id} "${ticket.title}" — SLA dépassé !`,
          '🔴 Violation SLA', { timeOut: 15000 }
        );
      }
    });
  }

  toggleSlaAlerts(): void {
    this.toastr.info(this.showSlaAlerts ? 'Alertes SLA activées' : 'Alertes SLA désactivées');
  }

  // ══════════════════════════════════════════
  //  FILTERS
  // ══════════════════════════════════════════

  filterByStatus(status: string): void {
    this.currentFilter = status;
    if (status === 'ALL') {
      this.filteredTickets = [...this.allTickets];
    } else {
      this.filteredTickets = this.allTickets.filter(t => t.status === status);
    }
    this.refreshCalendar();
    this.toastr.info(`Filtre : ${status === 'ALL' ? 'Tous' : this.statusLabels[status] || status}`);
  }

  filterBySLA(slaStatus: string): void {
    if (slaStatus === 'ALL') {
      this.filteredTickets = [...this.allTickets];
    } else {
      this.filteredTickets = this.allTickets.filter(t => t.slaStatus === slaStatus);
    }
    this.refreshCalendar();
  }

  // ══════════════════════════════════════════
  //  VIEW CONTROLS
  // ══════════════════════════════════════════

  changeView(viewType: string): void {
    this.currentView = viewType;
    if (this.calendarComponent) {
      this.calendarComponent.getApi().changeView(viewType);
    }
  }

  // ══════════════════════════════════════════
  //  EVENT HANDLERS
  // ══════════════════════════════════════════

  handleEventClick(clickInfo: EventClickArg): void {
    const ticketId = parseInt(clickInfo.event.id, 10);
    this.selectedTicket = this.allTickets.find(t => t.id === ticketId) || null;
    this.isDetailModalOpen = true;
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedTicket = null;
  }

  // ══════════════════════════════════════════
  //  EXPORT
  // ══════════════════════════════════════════

  exportCalendar(): void {
    const data = this.filteredTickets.map(t => ({
      id: t.id,
      titre: t.title,
      statut: this.statusLabels[t.status],
      priorite: this.priorityConfig[t.priority]?.label,
      categorie: t.category,
      departement: t.departement,
      cree_par: t.creatorFullName,
      assigne_a: t.assignedToFullName || 'Non assigné',
      date_creation: t.createdDate,
      date_echeance: t.dueDate,
      sla: t.slaStatus
    }));

    const csv = this.convertToCSV(data);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendrier-tickets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastr.success('Calendrier exporté !');
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(';'));
    return [headers.join(';'), ...rows].join('\n');
  }

  // ══════════════════════════════════════════
  //  COLORS
  // ══════════════════════════════════════════

  getEventColor(ticket: Ticket): string {
    // Priorité au SLA
    if (ticket.slaStatus === 'BREACHED') return '#dc2626';
    if (ticket.slaStatus === 'AT_RISK') return '#f59e0b';

    const colors: Record<string, string> = {
      'OPEN': '#3b82f6',
      'IN_PROGRESS': '#f59e0b',
      'ON_HOLD': '#8b5cf6',
      'RESOLVED': '#10b981',
      'CLOSED': '#6b7280',
      'REJECTED': '#ef4444'
    };
    return colors[ticket.status] || '#6b7280';
  }

  getEventBorderColor(priority: string): string {
    const colors: Record<string, string> = {
      'LOW': '#10b981',
      'MEDIUM': '#3b82f6',
      'HIGH': '#f59e0b',
      'CRITICAL': '#ef4444'
    };
    return colors[priority] || '#6b7280';
  }

  getPriorityClass(p: string): string {
    return { 'LOW': 'p-low', 'MEDIUM': 'p-medium', 'HIGH': 'p-high', 'CRITICAL': 'p-critical' }[p] || '';
  }

  getStatusClass(s: string): string {
    return { 'OPEN': 's-open', 'IN_PROGRESS': 's-progress', 'ON_HOLD': 's-hold',
             'RESOLVED': 's-resolved', 'CLOSED': 's-closed', 'REJECTED': 's-rejected' }[s] || '';
  }

  getSLAClass(sla?: string): string {
    return { 'ON_TRACK': 'sla-on-track', 'AT_RISK': 'sla-at-risk',
             'BREACHED': 'sla-breached', 'MET': 'sla-met' }[sla || ''] || '';
  }

  getSLALabel(sla?: string): string {
    return { 'ON_TRACK': '✅ Dans les délais', 'AT_RISK': '⚠️ À risque',
             'BREACHED': '🔴 Dépassé', 'MET': '✅ Résolu à temps' }[sla || ''] || '';
  }

  getTimeAgo(d: string): string {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}min`;
    if (h < 24) return `${h}h`;
    if (dy < 7) return `${dy}j`;
    return new Date(d).toLocaleDateString('fr-FR');
  }
}
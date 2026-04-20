import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { TicketService } from '../../services/ticket.service';
import { CommentService } from '../../services/CommentService';
import { AuthService } from '../../auth/service/auth.service';
import {
  Ticket,
  TicketHistory,
  TicketStatus
} from '../../models/ticket.model';
import { TicketComment, CreateCommentRequest } from '../../models/TicketComment';

interface KanbanColumn {
  id: TicketStatus;
  label: string;
  icon: string;
  color: string;
  tickets: Ticket[];
}

@Component({
  selector: 'app-ba-ticket-management',
  templateUrl: './ba-ticket-management.component.html',
  styleUrls: ['./ba-ticket-management.component.scss']
})
export class BaTicketManagementComponent implements OnInit {

  columns: KanbanColumn[] = [];
  allTickets: Ticket[] = [];

  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  searchQuery = '';

  // Detail modal
  isDetailModalOpen = false;
  selectedTicket: Ticket | null = null;
  activeTab: 'details' | 'comments' | 'history' = 'details';

  // Commentaires
  comments: TicketComment[] = [];
  newComment = '';
  isInternalNote = false;
  isLoadingComments = false;
  isSendingComment = false;

  // Historique
  ticketHistory: TicketHistory[] = [];
  isLoadingHistory = false;

  // Reject modal
  isRejectModalOpen = false;
  rejectTicket: Ticket | null = null;
  rejectReason = '';

  // Status change with comment modal
  isStatusModalOpen = false;
  statusTicket: Ticket | null = null;
  targetStatus: TicketStatus | null = null;
  statusComment = '';

  currentUserId = 0;

  connectedLists = ['col-OPEN', 'col-IN_PROGRESS', 'col-ON_HOLD', 'col-RESOLVED', 'col-CLOSED', 'col-REJECTED'];

    allowedTransitions: Record<string, TicketStatus[]> = {
    'OPEN':        ['IN_PROGRESS', 'ON_HOLD', 'REJECTED', 'CLOSED'],
    'IN_PROGRESS': ['ON_HOLD', 'RESOLVED', 'REJECTED', 'CLOSED'],
    'ON_HOLD':     ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    'RESOLVED':    ['CLOSED', 'IN_PROGRESS', 'OPEN'],
    'CLOSED':      ['OPEN'],
    'REJECTED':    ['OPEN']
  };

  priorityConfig: Record<string, { label: string; icon: string }> = {
    'LOW':      { label: 'Basse',    icon: 'fas fa-arrow-down' },
    'MEDIUM':   { label: 'Moyenne',  icon: 'fas fa-equals' },
    'HIGH':     { label: 'Haute',    icon: 'fas fa-arrow-up' },
    'CRITICAL': { label: 'Critique', icon: 'fas fa-fire' }
  };

  categoryConfig: Record<string, { label: string; icon: string }> = {
    'BUG':             { label: 'Bug',            icon: 'fas fa-bug' },
    'FEATURE_REQUEST': { label: 'Fonctionnalité', icon: 'fas fa-lightbulb' },
    'IMPROVEMENT':     { label: 'Amélioration',   icon: 'fas fa-chart-line' },
    'SUPPORT':         { label: 'Support',         icon: 'fas fa-headset' },
    'DOCUMENTATION':   { label: 'Documentation',  icon: 'fas fa-book' },
    'OTHER':           { label: 'Autre',           icon: 'fas fa-ellipsis-h' }
  };

  statusLabels: Record<string, string> = {
    'OPEN': 'Ouvert',
    'IN_PROGRESS': 'En cours',
    'ON_HOLD': 'En attente',
    'RESOLVED': 'Résolu',
    'CLOSED': 'Fermé',
    'REJECTED': 'Rejeté'
  };

  // Stats
  get totalTickets(): number { return this.allTickets.length; }
  get slaBreachedCount(): number { return this.allTickets.filter(t => t.slaStatus === 'BREACHED').length; }
  get criticalCount(): number { return this.allTickets.filter(t => t.priority === 'CRITICAL').length; }
  get unassignedCount(): number { return this.allTickets.filter(t => !t.assignedToId).length; }

  constructor(
    private ticketService: TicketService,
    private commentService: CommentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    try { this.currentUserId = this.authService.getUserId(); } catch {}
    this.initColumns();
    this.loadTickets();
  }

  // ══════════════════════════════════════════
  //  KANBAN
  // ══════════════════════════════════════════

  initColumns(): void {
    this.columns = [
      { id: 'OPEN', label: 'Ouvert', icon: 'fas fa-circle', color: '#3b82f6', tickets: [] },
      { id: 'IN_PROGRESS', label: 'En cours', icon: 'fas fa-play-circle', color: '#f59e0b', tickets: [] },
      { id: 'ON_HOLD', label: 'En attente', icon: 'fas fa-pause-circle', color: '#8b5cf6', tickets: [] },
      { id: 'RESOLVED', label: 'Résolu', icon: 'fas fa-check-circle', color: '#10b981', tickets: [] },
      { id: 'CLOSED', label: 'Fermé', icon: 'fas fa-lock', color: '#6b7280', tickets: [] }
    ];
  }

  loadTickets(): void {
    this.isLoading = true;
    this.ticketService.getMyTickets().subscribe({
      next: (data) => {
        this.allTickets = data;
        this.distributeTickets();
        this.isLoading = false;
      },
      error: () => { this.showError('Erreur lors du chargement'); this.isLoading = false; }
    });
  }

  distributeTickets(): void {
    const filtered = this.getFilteredTickets();
    this.columns.forEach(col => {
      col.tickets = filtered
        .filter(t => t.status === col.id)
        .sort((a, b) => {
          const order: Record<string, number> = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
          const priorityDiff = (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
          if (priorityDiff !== 0) return priorityDiff;
          // SLA breached first
          if (a.slaStatus === 'BREACHED' && b.slaStatus !== 'BREACHED') return -1;
          if (b.slaStatus === 'BREACHED' && a.slaStatus !== 'BREACHED') return 1;
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
        });
    });
  }

  getFilteredTickets(): Ticket[] {
    if (!this.searchQuery) return this.allTickets;
    const q = this.searchQuery.toLowerCase();
    return this.allTickets.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.id.toString().includes(q) ||
      (t.creatorFullName && t.creatorFullName.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  onSearch(): void { this.distributeTickets(); }

  // ══════════════════════════════════════════
  //  DRAG & DROP
  // ══════════════════════════════════════════

  drop(event: CdkDragDrop<Ticket[]>, targetColumn: KanbanColumn): void {
    if (event.previousContainer === event.container) return;

    const ticket = event.previousContainer.data[event.previousIndex];
    const fromStatus = ticket.status;
    const toStatus = targetColumn.id;

    // Utiliser les transitions du backend si disponibles
    const allowed = ticket.allowedTransitions && ticket.allowedTransitions.length > 0
      ? ticket.allowedTransitions
      : (this.allowedTransitions[fromStatus] || []);

    if (!allowed.includes(toStatus)) {
      this.showError(`${this.statusLabels[fromStatus]} → ${this.statusLabels[toStatus]} non autorisé`);
      return;
    }

    if (toStatus === 'REJECTED') {
      this.rejectTicket = ticket;
      this.rejectReason = '';
      this.isRejectModalOpen = true;
      return;
    }

    // Pour RESOLVED, demander un commentaire optionnel
    if (toStatus === 'RESOLVED') {
      this.statusTicket = ticket;
      this.targetStatus = toStatus;
      this.statusComment = '';
      this.isStatusModalOpen = true;
      return;
    }

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    this.ticketService.updateTicketStatus(ticket.id, toStatus).subscribe({
      next: () => {
        ticket.status = toStatus;
        this.showSuccess(`#${ticket.id} → ${this.statusLabels[toStatus]}`);
      },
      error: (err) => {
        this.showError(err.error?.message || 'Erreur lors du changement de statut');
        this.loadTickets();
      }
    });
  }

  // ══════════════════════════════════════════
  //  DETAIL MODAL
  // ══════════════════════════════════════════

  openDetailModal(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.isDetailModalOpen = true;
    this.activeTab = 'details';
    this.comments = [];
    this.newComment = '';
    this.isInternalNote = false;
    this.ticketHistory = [];
    this.loadComments(ticket.id);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedTicket = null;
    this.comments = [];
    this.ticketHistory = [];
  }

  // ══════════════════════════════════════════
  //  COMMENTAIRES
  // ══════════════════════════════════════════

  loadComments(ticketId: number): void {
    this.isLoadingComments = true;
    this.commentService.getComments(ticketId).subscribe({
      next: (data) => { this.comments = data; this.isLoadingComments = false; },
      error: () => { this.isLoadingComments = false; }
    });
  }

  sendComment(): void {
    if (!this.newComment.trim() || !this.selectedTicket) return;
    this.isSendingComment = true;
    const req: CreateCommentRequest = {
      content: this.newComment.trim(),
      internalNote: this.isInternalNote
    };
    this.commentService.addComment(this.selectedTicket.id, req).subscribe({
      next: (c) => {
        this.comments.push(c);
        this.newComment = '';
        this.isInternalNote = false;
        this.isSendingComment = false;
      },
      error: () => { this.isSendingComment = false; }
    });
  }

  deleteComment(c: TicketComment): void {
    if (!this.selectedTicket || !confirm('Supprimer ?')) return;
    this.commentService.deleteComment(this.selectedTicket.id, c.id).subscribe({
      next: () => { this.comments = this.comments.filter(x => x.id !== c.id); }
    });
  }

  canDeleteComment(c: TicketComment): boolean { return c.authorId === this.currentUserId; }

  // ══════════════════════════════════════════
  //  HISTORIQUE
  // ══════════════════════════════════════════

  loadHistory(ticketId: number): void {
    this.isLoadingHistory = true;
    this.ticketHistory = [];
    this.ticketService.getTicketHistory(ticketId).subscribe({
      next: (data) => { this.ticketHistory = data; this.isLoadingHistory = false; },
      error: () => { this.isLoadingHistory = false; }
    });
  }

  getHistoryFieldLabel(field: string): string {
    return { 'status': 'Statut', 'priority': 'Priorité', 'assignee': 'Assigné à',
             'title': 'Titre', 'description': 'Description', 'category': 'Catégorie' }[field] || field;
  }

  getHistoryDotClass(field: string): string {
    return { 'status': 'dot-status', 'priority': 'dot-priority', 'assignee': 'dot-assignee' }[field] || 'dot-default';
  }

  // ══════════════════════════════════════════
  //  REJECT
  // ══════════════════════════════════════════

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
    this.rejectTicket = null;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (!this.rejectTicket || !this.rejectReason.trim()) {
      this.showError('Motif obligatoire');
      return;
    }
    this.ticketService.updateTicketStatus(this.rejectTicket.id, 'REJECTED', this.rejectReason.trim()).subscribe({
      next: () => {
        this.showSuccess(`#${this.rejectTicket!.id} rejeté`);
        this.closeRejectModal();
        this.loadTickets();
      },
      error: (err) => this.showError(err.error?.message || 'Erreur')
    });
  }

  // ══════════════════════════════════════════
  //  STATUS CHANGE WITH COMMENT
  // ══════════════════════════════════════════

  closeStatusModal(): void {
    this.isStatusModalOpen = false;
    this.statusTicket = null;
    this.targetStatus = null;
    this.statusComment = '';
  }

  confirmStatusChange(): void {
    if (!this.statusTicket || !this.targetStatus) return;

    const comment = this.statusComment.trim() || undefined;
    this.ticketService.updateTicketStatus(this.statusTicket.id, this.targetStatus, comment).subscribe({
      next: () => {
        this.showSuccess(`#${this.statusTicket!.id} → ${this.statusLabels[this.targetStatus!]}`);
        this.closeStatusModal();
        this.loadTickets();
      },
      error: (err) => this.showError(err.error?.message || 'Erreur')
    });
  }

  // ══════════════════════════════════════════
  //  QUICK STATUS (from modal)
  // ══════════════════════════════════════════

  changeStatus(ticket: Ticket, newStatus: TicketStatus): void {
    if (newStatus === 'REJECTED') {
      this.rejectTicket = ticket;
      this.rejectReason = '';
      this.closeDetailModal();
      this.isRejectModalOpen = true;
      return;
    }

    if (newStatus === 'RESOLVED') {
      this.statusTicket = ticket;
      this.targetStatus = newStatus;
      this.statusComment = '';
      this.closeDetailModal();
      this.isStatusModalOpen = true;
      return;
    }

    this.ticketService.updateTicketStatus(ticket.id, newStatus).subscribe({
      next: () => {
        this.showSuccess(`#${ticket.id} → ${this.statusLabels[newStatus]}`);
        this.loadTickets();
        if (this.selectedTicket?.id === ticket.id) {
          this.selectedTicket.status = newStatus;
        }
      },
      error: (err) => this.showError(err.error?.message || 'Erreur')
    });
  }

  getAvailableTransitions(ticket: Ticket): TicketStatus[] {
    if (ticket.allowedTransitions && ticket.allowedTransitions.length > 0) {
      return ticket.allowedTransitions;
    }
    return this.allowedTransitions[ticket.status] || [];
  }

  // ══════════════════════════════════════════
  //  SLA
  // ══════════════════════════════════════════

  getSLAClass(slaStatus?: string): string {
    return { 'ON_TRACK': 'sla-on-track', 'AT_RISK': 'sla-at-risk',
             'BREACHED': 'sla-breached', 'MET': 'sla-met' }[slaStatus || ''] || '';
  }

  getSLALabel(slaStatus?: string): string {
    return { 'ON_TRACK': '✅ Dans les délais', 'AT_RISK': '⚠️ À risque',
             'BREACHED': '🔴 SLA dépassé', 'MET': '✅ Résolu à temps' }[slaStatus || ''] || '';
  }

  getSLAIcon(slaStatus?: string): string {
    return { 'ON_TRACK': 'fas fa-check-circle', 'AT_RISK': 'fas fa-exclamation-triangle',
             'BREACHED': 'fas fa-times-circle', 'MET': 'fas fa-check-double' }[slaStatus || ''] || 'fas fa-minus-circle';
  }

  // ══════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════

  getPriorityClass(p: string): string {
    return { 'LOW': 'p-low', 'MEDIUM': 'p-medium', 'HIGH': 'p-high', 'CRITICAL': 'p-critical' }[p] || '';
  }

  getStatusClass(s: string): string {
    return { 'OPEN': 's-open', 'IN_PROGRESS': 's-progress', 'ON_HOLD': 's-hold',
             'RESOLVED': 's-resolved', 'CLOSED': 's-closed', 'REJECTED': 's-rejected' }[s] || '';
  }

  getTimeAgo(d: string): string {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}min`;
    if (h < 24) return `${h}h`;
    if (dy < 7) return `${dy}j`;
    return new Date(d).toLocaleDateString('fr-FR');
  }

  getInitial(n: string): string { return n ? n.charAt(0).toUpperCase() : '?'; }

  getCommentRoleLabel(r: string): string {
    return { 'ADMIN': 'Admin', 'BUSINESS_ANALYST': 'BA', 'USER': 'Utilisateur' }[r] || r;
  }

  private showSuccess(msg: string): void { this.successMessage = msg; setTimeout(() => this.successMessage = null, 3000); }
  private showError(msg: string): void { this.errorMessage = msg; setTimeout(() => this.errorMessage = null, 4000); }
}
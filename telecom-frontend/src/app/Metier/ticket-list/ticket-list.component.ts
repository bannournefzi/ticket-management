import { Component, OnInit } from '@angular/core';
import { TicketService } from '../../services/ticket.service';
import { CommentService } from '../../services/CommentService';
import { AuthService } from '../../auth/service/auth.service';
import {
  Ticket,
  CreateTicketRequest,
  TicketHistory,
  TicketPriority,
  TicketStatus,
  TicketCategory
} from '../../models/ticket.model';
import { TicketComment, CreateCommentRequest } from '../../models/TicketComment';

@Component({
  selector: 'app-ticket-list',
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.scss']
})
export class TicketListComponent implements OnInit {

  allTickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];

  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Filtres
  searchQuery = '';
  statusFilter = '';
  priorityFilter = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  Math = Math;

  // Modal détails
  isViewModalOpen = false;
  viewedTicket: Ticket | null = null;
  activeTab: 'details' | 'comments' | 'history' = 'details';

  // Commentaires
  comments: TicketComment[] = [];
  newComment = '';
  isInternalNote = false;
  isLoadingComments = false;
  isSendingComment = false;
  currentUserId = 0;

  // Historique
  ticketHistory: TicketHistory[] = [];
  isLoadingHistory = false;

  // Modal priorité
  isPriorityModalOpen = false;
  priorityTicket: Ticket | null = null;
  newPriority: TicketPriority = 'MEDIUM';
  private readonly MAX_PRIORITY_CHANGES_PER_WEEK = 2;

  // Config
  priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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

  statusConfig: Record<string, { label: string }> = {
    'OPEN':        { label: 'Ouvert' },
    'IN_PROGRESS': { label: 'En cours' },
    'ON_HOLD':     { label: 'En attente' },
    'RESOLVED':    { label: 'Résolu' },
    'CLOSED':      { label: 'Fermé' },
    'REJECTED':    { label: 'Rejeté' }
  };

  constructor(
    private ticketService: TicketService,
    private commentService: CommentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    try { this.currentUserId = this.authService.getUserId(); } catch {}
  }

  // ══════════════════════════════════════════
  //  CHARGEMENT
  // ══════════════════════════════════════════

  loadTickets(): void {
    this.isLoading = true;
    this.ticketService.getMyTickets().subscribe({
      next: (data) => {
        this.allTickets = data.sort((a, b) =>
          new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
        );
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement des tickets');
        this.isLoading = false;
      }
    });
  }

  // ══════════════════════════════════════════
  //  FILTRES
  // ══════════════════════════════════════════

  applyFilters(): void {
    this.filteredTickets = this.allTickets.filter(t => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        t.id.toString().includes(q) ||
        (t.assignedToFullName && t.assignedToFullName.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)));
      const matchStatus = !this.statusFilter || t.status === this.statusFilter;
      const matchPriority = !this.priorityFilter || t.priority === this.priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.statusFilter || this.priorityFilter);
  }

  // ══════════════════════════════════════════
  //  PAGINATION
  // ══════════════════════════════════════════

  get paginatedTickets(): Ticket[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTickets.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTickets.length / this.itemsPerPage);
  }

  // ══════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════

  get openCount(): number { return this.allTickets.filter(t =>  t.status === 'NEW').length; }
  get progressCount(): number { return this.allTickets.filter(t => t.status === 'ASSIGNED').length; }
  get onHoldCount(): number { return this.allTickets.filter(t => t.status === 'FEEDBACK').length; }
  get resolvedCount(): number { return this.allTickets.filter(t => t.status === 'RESOLVED').length; }
  get closedCount(): number { return this.allTickets.filter(t => t.status === 'CLOSED').length; }
  get slaBreachedCount(): number { return this.allTickets.filter(t => t.slaStatus === 'BREACHED').length; }

  // ══════════════════════════════════════════
  //  MODAL DÉTAILS
  // ══════════════════════════════════════════

  openViewModal(ticket: Ticket): void {
    this.viewedTicket = ticket;
    this.isViewModalOpen = true;
    this.activeTab = 'details';
    this.comments = [];
    this.newComment = '';
    this.isInternalNote = false;
    this.ticketHistory = [];
    this.loadComments(ticket.id);
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedTicket = null;
    this.comments = [];
    this.ticketHistory = [];
    this.newComment = '';
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
    if (!this.newComment.trim() || !this.viewedTicket) return;
    this.isSendingComment = true;
    const request: CreateCommentRequest = {
      content: this.newComment.trim(),
      internalNote: this.isInternalNote
    };
    this.commentService.addComment(this.viewedTicket.id, request).subscribe({
      next: (comment) => {
        this.comments.push(comment);
        this.newComment = '';
        this.isInternalNote = false;
        this.isSendingComment = false;
      },
      error: () => { this.isSendingComment = false; }
    });
  }

  deleteComment(comment: TicketComment): void {
    if (!this.viewedTicket || !confirm('Supprimer ce commentaire ?')) return;
    this.commentService.deleteComment(this.viewedTicket.id, comment.id).subscribe({
      next: () => { this.comments = this.comments.filter(c => c.id !== comment.id); }
    });
  }

  canDeleteComment(comment: TicketComment): boolean {
    return comment.authorId === this.currentUserId;
  }

  getCommentRoleLabel(role: string): string {
    return { 'ADMIN': 'Admin', 'BUSINESS_ANALYST': 'BA', 'METIER': 'Métier' }[role] || role;
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

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

  getSLAShortLabel(slaStatus?: string): string {
    return { 'ON_TRACK': 'OK', 'AT_RISK': 'Risque', 'BREACHED': 'Dépassé', 'MET': 'OK' }[slaStatus || ''] || '—';
  }

  getSLAIcon(slaStatus?: string): string {
    return { 'ON_TRACK': 'fas fa-check-circle', 'AT_RISK': 'fas fa-exclamation-triangle',
             'BREACHED': 'fas fa-times-circle', 'MET': 'fas fa-check-double' }[slaStatus || ''] || 'fas fa-minus-circle';
  }

  // ══════════════════════════════════════════
  //  MODAL PRIORITÉ
  // ══════════════════════════════════════════

  openPriorityModal(ticket: Ticket): void {
    if (!this.canChangePriority(ticket)) {
      this.showError('Limite de changement de priorité atteinte cette semaine (max 2)');
      return;
    }
    this.priorityTicket = ticket;
    this.newPriority = ticket.priority;
    this.isPriorityModalOpen = true;
  }

  closePriorityModal(): void {
    this.isPriorityModalOpen = false;
    this.priorityTicket = null;
  }

  confirmPriorityChange(): void {
    if (!this.priorityTicket) return;
    if (this.newPriority === this.priorityTicket.priority) {
      this.closePriorityModal();
      return;
    }
    const request: CreateTicketRequest = {
      title: this.priorityTicket.title,
      description: this.priorityTicket.description,
      priority: this.newPriority,
      category: this.priorityTicket.category,
      departement: this.priorityTicket.departement
    };
    this.ticketService.updateTicket(this.priorityTicket.id, request).subscribe({
      next: () => {
        this.recordPriorityChange(this.priorityTicket!.id);
        this.showSuccess(`Priorité du ticket #${this.priorityTicket!.id} modifiée`);
        this.closePriorityModal();
        this.loadTickets();
      },
      error: (err) => { this.showError(err.error?.message || 'Erreur'); }
    });
  }

  canChangePriority(ticket: Ticket): boolean {
    if (ticket.status === 'CLOSED' ) return false;
    const key = `priority_changes_${ticket.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return true;
    try {
      const changes: number[] = JSON.parse(raw);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return changes.filter(ts => ts > oneWeekAgo).length < this.MAX_PRIORITY_CHANGES_PER_WEEK;
    } catch { return true; }
  }

  getRemainingChanges(ticket: Ticket): number {
    const key = `priority_changes_${ticket.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return this.MAX_PRIORITY_CHANGES_PER_WEEK;
    try {
      const changes: number[] = JSON.parse(raw);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return Math.max(0, this.MAX_PRIORITY_CHANGES_PER_WEEK - changes.filter(ts => ts > oneWeekAgo).length);
    } catch { return this.MAX_PRIORITY_CHANGES_PER_WEEK; }
  }

  private recordPriorityChange(ticketId: number): void {
    const key = `priority_changes_${ticketId}`;
    const raw = localStorage.getItem(key);
    let changes: number[] = [];
    if (raw) { try { changes = JSON.parse(raw); } catch {} }
    changes.push(Date.now());
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    changes = changes.filter(ts => ts > oneWeekAgo);
    localStorage.setItem(key, JSON.stringify(changes));
  }

  // ══════════════════════════════════════════
  //  EXPORT CSV
  // ══════════════════════════════════════════

  exportCSV(): void {
    const headers = ['ID', 'Titre', 'Priorité', 'Type', 'Statut', 'SLA', 'Département', 'Tags', 'Assigné à', 'Créé le'];
    const rows = this.filteredTickets.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      this.priorityConfig[t.priority]?.label || t.priority,
      this.categoryConfig[t.category]?.label || t.category,
      this.statusConfig[t.status]?.label || t.status,
      this.getSLAShortLabel(t.slaStatus),
      t.departement || '',
      (t.tags || []).join(', '),
      t.assignedToFullName || 'Non assigné',
      t.createdDate ? new Date(t.createdDate).toLocaleDateString('fr-FR') : ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-tickets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ══════════════════════════════════════════
  //  HELPERS CSS
  // ══════════════════════════════════════════

  getPriorityClass(priority: string): string {
    return { 'LOW': 'priority-low', 'MEDIUM': 'priority-medium',
             'HIGH': 'priority-high', 'CRITICAL': 'priority-critical' }[priority] || '';
  }

  getStatusClass(status: string): string {
    return { 'OPEN': 'status-open', 'IN_PROGRESS': 'status-progress', 'ON_HOLD': 'status-hold',
             'RESOLVED': 'status-resolved', 'CLOSED': 'status-closed', 'REJECTED': 'status-rejected' }[status] || '';
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}min`;
    if (h < 24) return `${h}h`;
    if (d < 7) return `${d}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 4000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = null, 4000);
  }
}
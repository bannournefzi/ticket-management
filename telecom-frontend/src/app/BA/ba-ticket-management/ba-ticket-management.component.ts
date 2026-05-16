import { Component, OnInit, HostListener } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { TicketService } from '../../services/ticket.service';
import { CommentService } from '../../services/CommentService';
import { AuthService } from '../../auth/service/auth.service';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Ticket,
  TicketHistory,
  TicketStatus,
  MantisProject
} from '../../models/ticket.model';
import { TicketComment, CreateCommentRequest } from '../../models/TicketComment';

@Component({
  selector: 'app-ba-ticket-management',
  templateUrl: './ba-ticket-management.component.html',
  styleUrls: ['./ba-ticket-management.component.scss']
})
export class BaTicketManagementComponent implements OnInit {

  allTickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];

  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  searchQuery    = '';
  filterStatus   = '';
  filterPriority = '';
  filterSLA      = '';

  sortColumn    = 'createdDate';
  sortAscending = false;

  // ── Pagination ────────────────────────────────────────────────────────
  currentPage = 1;

  // FIX #3: pageSize is stored as number. The select uses [ngValue] to bind
  // numbers directly, avoiding the "string from <select>" arithmetic bug.
  pageSize = 10;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTickets.length / this.pageSize));
  }

  get pagedTickets(): Ticket[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTickets.slice(start, start + this.pageSize);
  }

  // ── Dropdown ──────────────────────────────────────────────────────────
  openDropdownId: number | null = null;

  // ── Detail modal ──────────────────────────────────────────────────────
  isDetailModalOpen = false;
  selectedTicket: Ticket | null = null;
  activeTab: 'details' | 'comments' | 'history' = 'details';

  // ── Comments ──────────────────────────────────────────────────────────
  comments: TicketComment[] = [];
  mantisComments: TicketComment[] = [];
  commentTab: 'internal' | 'mantis' = 'internal';
  newComment = '';
  isInternalNote    = false;
  isLoadingComments = false;
  isSendingComment  = false;

  // ── History ───────────────────────────────────────────────────────────
  ticketHistory:   TicketHistory[] = [];
  isLoadingHistory = false;

  // ── Status-change-with-comment modal ──────────────────────────────────
  isStatusModalOpen = false;
  statusTicket: Ticket | null = null;
  targetStatus: TicketStatus | null = null;
  statusComment = '';

  // ── Knowledge Base modal ──────────────────────────────────────────────
  isKbModalOpen = false;
  kbTitle = '';
  kbDescription = '';
  kbSolution = '';
  isSavingKb = false;

  currentUserId = 0;

  // ── Config ────────────────────────────────────────────────────────────
  allowedTransitions: Record<string, TicketStatus[]> = {
    'NEW':          ['FEEDBACK', 'ACKNOWLEDGED', 'CONFIRMED', 'ASSIGNED', 'RESOLVED', 'CLOSED'],
    'FEEDBACK':     ['NEW', 'ACKNOWLEDGED', 'CONFIRMED', 'ASSIGNED', 'RESOLVED', 'CLOSED'],
    'ACKNOWLEDGED': ['FEEDBACK', 'CONFIRMED', 'ASSIGNED', 'RESOLVED', 'CLOSED'],
    'CONFIRMED':    ['FEEDBACK', 'ACKNOWLEDGED', 'ASSIGNED', 'RESOLVED', 'CLOSED'],
    'ASSIGNED':     ['FEEDBACK', 'ACKNOWLEDGED', 'CONFIRMED', 'RESOLVED', 'CLOSED'],
    'RESOLVED':     ['FEEDBACK', 'ACKNOWLEDGED', 'CONFIRMED', 'ASSIGNED', 'CLOSED'],
    'CLOSED':       ['FEEDBACK', 'ACKNOWLEDGED', 'CONFIRMED', 'ASSIGNED', 'RESOLVED']
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
    'NEW':          'Nouveau',
    'FEEDBACK':     'Retour',
    'ACKNOWLEDGED': 'Pris en compte',
    'CONFIRMED':    'Confirmé',
    'ASSIGNED':     'Assigné',
    'RESOLVED':     'Résolu',
    'CLOSED':       'Fermé'
  };

  statusKeys   = Object.keys(this.statusLabels) as TicketStatus[];
  priorityKeys = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  // ── Stats ─────────────────────────────────────────────────────────────
  get totalTickets():     number { return this.allTickets.length; }
  get slaBreachedCount(): number { return this.allTickets.filter(t => t.slaStatus === 'BREACHED').length; }
  get criticalCount():    number { return this.allTickets.filter(t => t.priority === 'CRITICAL').length; }
  get unassignedCount():  number { return this.allTickets.filter(t => !t.assignedToId).length; }

  // ── Sort order helpers ────────────────────────────────────────────────
  private readonly priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  private readonly slaOrder:      Record<string, number> = { BREACHED: 0, AT_RISK: 1, ON_TRACK: 2, MET: 3 };

  constructor(
    private ticketService: TicketService,
    private commentService: CommentService,
    private authService: AuthService,
    private kbService: KnowledgeBaseService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    try { this.currentUserId = this.authService.getUserId(); } catch {}
    this.loadTickets();
  }

  // ── Close dropdown on outside click ───────────────────────────────────
  @HostListener('document:click')
  onDocumentClick(): void { this.openDropdownId = null; }

  toggleDropdown(id: number, event?: MouseEvent): void {
    event?.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
  }

  // ══════════════════════════════════════════
  //  LOAD
  // ══════════════════════════════════════════

  loadTickets(): void {
    this.isLoading = true;
    this.ticketService.getMyTickets().subscribe({
      next: (data) => {
        this.allTickets = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.showError('Erreur lors du chargement'); this.isLoading = false; }
    });
  }

  // ══════════════════════════════════════════
  //  FILTER + SORT
  // ══════════════════════════════════════════

  onSearch(): void { this.applyFilters(); }
  onFilter(): void { this.applyFilters(); }

  applyFilters(): void {
    const q = this.searchQuery.toLowerCase();

    const result = this.allTickets.filter(t => {
      if (this.filterStatus   && t.status   !== this.filterStatus)   return false;
      if (this.filterPriority && t.priority !== this.filterPriority) return false;
      if (this.filterSLA      && t.slaStatus !== this.filterSLA)     return false;

      if (q && !(
        t.title.toLowerCase().includes(q) ||
        t.id.toString().includes(q) ||
        (t.mantisId?.toString() || '').includes(q) ||
        (t.creatorFullName && t.creatorFullName.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      )) return false;

      return true;
    });

    // FIX #4: update filteredTickets first, THEN ensure valid page
    this.filteredTickets = this.sortTickets(result);
    this.currentPage = 1;
    this.ensureValidPage();
  }

  sortBy(col: string): void {
    if (this.sortColumn === col) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn    = col;
      this.sortAscending = true;
    }
    this.filteredTickets = this.sortTickets([...this.filteredTickets]);
    this.currentPage = 1;
    this.ensureValidPage();
  }

  private sortTickets(list: Ticket[]): Ticket[] {
    return list.sort((a, b) => {
      let av: any = (a as any)[this.sortColumn];
      let bv: any = (b as any)[this.sortColumn];

      if (this.sortColumn === 'priority')  { av = this.priorityOrder[av] ?? 9; bv = this.priorityOrder[bv] ?? 9; }
      if (this.sortColumn === 'slaStatus') { av = this.slaOrder[av]      ?? 9; bv = this.slaOrder[bv]      ?? 9; }
      if (this.sortColumn === 'createdDate' || this.sortColumn === 'dueDate') {
        const dateA = av ? new Date(av).getTime() : 0;
        const dateB = bv ? new Date(bv).getTime() : 0;
        return this.sortAscending ? dateA - dateB : dateB - dateA;
      }

      if (typeof av === 'string' && typeof bv === 'string') {
        return this.sortAscending ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (av < bv) return this.sortAscending ? -1 : 1;
      if (av > bv) return this.sortAscending ?  1 : -1;
      return 0;
    });
  }

  getSortIcon(col: string): string {
    if (this.sortColumn !== col) return 'fa-sort';
    return this.sortAscending ? 'fa-sort-up' : 'fa-sort-down';
  }

  // ══════════════════════════════════════════
  //  PAGINATION
  // ══════════════════════════════════════════

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
  }

  getPageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredTickets.length);
  }

  getPages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end   = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // FIX #8: called when pageSize select changes — resets page and reapplies
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.ensureValidPage();
  }

  // ══════════════════════════════════════════
  //  DETAIL MODAL
  // ══════════════════════════════════════════

  openDetailModal(ticket: Ticket): void {
    this.selectedTicket    = ticket;
    this.isDetailModalOpen = true;
    this.activeTab         = 'details';
    this.comments          = [];
    this.mantisComments    = [];
    this.commentTab        = 'internal';
    this.newComment        = '';
    this.isInternalNote    = false;
    this.ticketHistory     = [];
    this.loadComments(ticket.id);
    this.loadMantisComments(ticket.id);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedTicket    = null;
    this.comments          = [];
    this.mantisComments    = [];
    this.ticketHistory     = [];
  }

  // ══════════════════════════════════════════
  //  COMMENTS
  // ══════════════════════════════════════════

  loadComments(ticketId: number): void {
    this.isLoadingComments = true;
    this.commentService.getComments(ticketId, 'INTERNAL').subscribe({
      next: (data) => { this.comments = data; this.isLoadingComments = false; },
      error: ()     => { this.isLoadingComments = false; }
    });
  }

  loadMantisComments(ticketId: number): void {
    this.commentService.getComments(ticketId, 'MANTIS').subscribe({
      next: (data) => { this.mantisComments = data; },
      error: ()     => {}
    });
  }

  switchCommentTab(tab: 'internal' | 'mantis'): void {
    this.commentTab = tab;
    this.newComment = '';
    this.isInternalNote = false;
  }

  sendComment(): void {
    if (!this.newComment.trim() || !this.selectedTicket) return;
    this.isSendingComment = true;
    const source = this.commentTab === 'mantis' ? 'MANTIS' : 'INTERNAL';
    const req: CreateCommentRequest = {
      content:      this.newComment.trim(),
      internalNote: this.isInternalNote,
      source:       source
    };
    this.commentService.addComment(this.selectedTicket.id, req).subscribe({
      next: (c) => {
        if (this.commentTab === 'mantis') {
          this.mantisComments.push(c);
        } else {
          this.comments.push(c);
        }
        this.newComment       = '';
        this.isInternalNote   = false;
        this.isSendingComment = false;
      },
      error: () => { this.isSendingComment = false; }
    });
  }

  deleteComment(c: TicketComment): void {
    if (!this.selectedTicket || !confirm('Supprimer ce commentaire ?')) return;
    this.commentService.deleteComment(this.selectedTicket.id, c.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(x => x.id !== c.id);
        this.mantisComments = this.mantisComments.filter(x => x.id !== c.id);
      }
    });
  }

  canDeleteComment(c: TicketComment): boolean { return c.authorId === this.currentUserId; }

  // ══════════════════════════════════════════
  //  HISTORY
  // ══════════════════════════════════════════

  loadHistory(ticketId: number): void {
    this.isLoadingHistory = true;
    this.ticketHistory = [];
    this.ticketService.getTicketHistory(ticketId).subscribe({
      next: (data) => { this.ticketHistory = data; this.isLoadingHistory = false; },
      error: ()     => { this.isLoadingHistory = false; }
    });
  }

  getHistoryFieldLabel(field: string): string {
    return ({
      status: 'Statut', priority: 'Priorité', assignee: 'Assigné à',
      title: 'Titre', description: 'Description', category: 'Catégorie'
    } as any)[field] || field;
  }

  getHistoryDotClass(field: string): string {
    return ({ status: 'dot-status', priority: 'dot-priority', assignee: 'dot-assignee' } as any)[field] || 'dot-default';
  }

  // ══════════════════════════════════════════
  //  STATUS CHANGE WITH COMMENT
  // ══════════════════════════════════════════

  closeStatusModal(): void {
    this.isStatusModalOpen = false;
    this.statusTicket      = null;
    this.targetStatus      = null;
    this.statusComment     = '';
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
  //  QUICK STATUS (from modal or dropdown)
  // ══════════════════════════════════════════

  changeStatus(ticket: Ticket, newStatus: TicketStatus): void {
    if (newStatus === 'RESOLVED') {
      // FIX #1: save a reference to the ticket BEFORE closing the detail modal,
      // so statusTicket is never null when confirmStatusChange() is called.
      this.statusTicket  = ticket;
      this.targetStatus  = newStatus;
      this.statusComment = '';
      // Only close detail modal if it was the one that triggered this action
      if (this.isDetailModalOpen) this.closeDetailModal();
      this.isStatusModalOpen = true;
      return;
    }
    this.ticketService.updateTicketStatus(ticket.id, newStatus).subscribe({
      next: () => {
        this.showSuccess(`#${ticket.id} → ${this.statusLabels[newStatus]}`);
        this.loadTickets();
        // Update in-place so the open modal reflects the new status immediately
        if (this.selectedTicket?.id === ticket.id) {
          this.selectedTicket = { ...this.selectedTicket, status: newStatus };
        }
      },
      error: (err) => this.showError(err.error?.message || 'Erreur')
    });
  }

  getAvailableTransitions(ticket: Ticket): TicketStatus[] {
    if (ticket.allowedTransitions && ticket.allowedTransitions.length > 0) return ticket.allowedTransitions;
    return this.allowedTransitions[ticket.status] || [];
  }

  // ══════════════════════════════════════════
  //  MANTIS
  // ══════════════════════════════════════════

  

  mantisProjects: MantisProject[] = [];
selectedMantisProjectId: number | null = null;
isMantisModalOpen = false;

openMantisModal(ticket: Ticket): void {
  this.selectedTicket = ticket;
  this.isDetailModalOpen = false;
  this.isMantisModalOpen = true;
  this.selectedMantisProjectId = this.mantisProjects.length ? this.mantisProjects[0].id : null;
  this.ticketService.getMantisProjects().subscribe({
    next: (projects) => {
      this.mantisProjects = projects;
      this.selectedMantisProjectId = projects.length ? projects[0].id : null;
    },
    error: () => {
      this.isMantisModalOpen = false;
      this.toastr.error('Impossible de charger les projets Mantis');
    }
  });
}

confirmPushToMantis(): void {
  console.log('projectId =', this.selectedMantisProjectId);

  if (!this.selectedTicket) return;
  if (!this.selectedMantisProjectId) {
    this.toastr.error('Aucun projet Mantis sélectionné');
    return;
  }

  this.ticketService.pushToMantis(this.selectedTicket.id, this.selectedMantisProjectId).subscribe({
    next: (updated) => {
      this.selectedTicket = updated;
      this.isMantisModalOpen = false;
      this.toastr.success(`Ticket #${updated.id} envoyé vers Mantis`);
      this.loadTickets();
    },
    error: (err) => {
      this.isMantisModalOpen = false;
      const backendMsg = err.error?.error || err.error?.message || err.message || '';
      this.toastr.error(backendMsg || 'Erreur envoi vers Mantis');
      console.error('Mantis push error:', err);
    }
  });
}

  // ══════════════════════════════════════════
  //  CONFIG SAFE ACCESSORS (FIX #2 & #5)
  // ══════════════════════════════════════════

  getPriorityConfig(priority: string): { label: string; icon: string } {
    return this.priorityConfig[priority] ?? { label: priority, icon: 'fas fa-minus' };
  }

  getCategoryConfig(category: string): { label: string; icon: string } {
    return this.categoryConfig[category] ?? { label: category, icon: 'fas fa-tag' };
  }

  // ══════════════════════════════════════════
  //  SLA
  // ══════════════════════════════════════════

  getSLAClass(slaStatus?: string): string {
    return ({ ON_TRACK: 'sla-on-track', AT_RISK: 'sla-at-risk', BREACHED: 'sla-breached', MET: 'sla-met' } as any)[slaStatus ?? ''] ?? '';
  }

  getSLACellClass(slaStatus?: string): string {
    return ({ BREACHED: 'cell-breached', AT_RISK: 'cell-at-risk' } as any)[slaStatus ?? ''] ?? '';
  }

  getSLADotClass(slaStatus?: string): string {
    return ({ ON_TRACK: 'dot-on', AT_RISK: 'dot-risk', BREACHED: 'dot-breach', MET: 'dot-on' } as any)[slaStatus ?? ''] ?? '';
  }

  getSLALabel(slaStatus?: string): string {
    return ({ ON_TRACK: 'Dans les délais', AT_RISK: 'À risque', BREACHED: 'SLA dépassé', MET: 'Résolu à temps' } as any)[slaStatus ?? ''] ?? '—';
  }

  getSLAIcon(slaStatus?: string): string {
    return ({ ON_TRACK: 'fas fa-check-circle', AT_RISK: 'fas fa-exclamation-triangle', BREACHED: 'fas fa-times-circle', MET: 'fas fa-check-double' } as any)[slaStatus ?? ''] ?? 'fas fa-minus-circle';
  }

  // ══════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════

  getPriorityClass(p: string): string {
    return ({ LOW: 'p-low', MEDIUM: 'p-medium', HIGH: 'p-high', CRITICAL: 'p-critical' } as any)[p] ?? '';
  }

  getStatusClass(s: string): string {
    return ({
      NEW: 's-new', FEEDBACK: 's-feedback', ACKNOWLEDGED: 's-ack',
      CONFIRMED: 's-confirmed', ASSIGNED: 's-assigned', RESOLVED: 's-resolved', CLOSED: 's-closed'
    } as any)[s] ?? '';
  }

  // FIX #5: guard against null/undefined date
  getTimeAgo(d: string | null | undefined): string {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    const diff = Date.now() - date.getTime();
    const m  = Math.floor(diff / 60000);
    const h  = Math.floor(diff / 3600000);
    const dy = Math.floor(diff / 86400000);
    if (m  < 1)  return "À l'instant";
    if (m  < 60) return `${m}min`;
    if (h  < 24) return `${h}h`;
    if (dy < 7)  return `${dy}j`;
    return date.toLocaleDateString('fr-FR');
  }

  getInitial(n: string): string { return n ? n.charAt(0).toUpperCase() : '?'; }

  getCommentRoleLabel(r: string): string {
    return ({ ADMIN: 'Admin', BUSINESS_ANALYST: 'BA', USER: 'Utilisateur' } as any)[r] ?? r;
  }

  downloadAttachment(ticketId: number, attachmentId: number, fileName: string): void {
    this.ticketService.downloadAttachment(ticketId, attachmentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => this.showError('Erreur lors du téléchargement')
    });
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFileIcon(contentType?: string): string {
    if (!contentType) return 'fas fa-file';
    if (contentType.startsWith('image/')) return 'fas fa-file-image';
    if (contentType.startsWith('video/')) return 'fas fa-file-video';
    if (contentType.startsWith('audio/')) return 'fas fa-file-audio';
    if (contentType.includes('pdf')) return 'fas fa-file-pdf';
    if (contentType.includes('word') || contentType.includes('document')) return 'fas fa-file-word';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (contentType.includes('zip') || contentType.includes('archive')) return 'fas fa-file-archive';
    return 'fas fa-file';
  }

  isUserBA(): boolean {
    return this.authService.isBusinessAnalyst();
  }

  get isCommentsEnabled(): boolean {
    return this.selectedTicket?.commentsEnabled !== false;
  }

  toggleCommentsEnabled(enabled: boolean): void {
    if (!this.selectedTicket) return;
    this.ticketService.toggleCommentsEnabled(this.selectedTicket.id, enabled).subscribe({
      next: (updated) => {
        if (this.selectedTicket) {
          this.selectedTicket = { ...this.selectedTicket, commentsEnabled: updated.commentsEnabled };
        }
        const idx = this.allTickets.findIndex(t => t.id === updated.id);
        if (idx !== -1) this.allTickets[idx] = { ...this.allTickets[idx], commentsEnabled: updated.commentsEnabled };
        this.showSuccess(enabled ? 'Commentaires activés pour les utilisateurs Métier' : 'Commentaires désactivés pour les utilisateurs Métier');
      },
      error: (err) => this.showError(err.error?.message || 'Erreur lors du changement')
    });
  }

  convertToKnowledgeBase(): void {
    if (!this.selectedTicket) return;
    if (this.selectedTicket.status !== 'RESOLVED' && this.selectedTicket.status !== 'CLOSED') {
      this.showError('Le ticket doit être en statut Résolu ou Fermé pour être converti en article');
      return;
    }
    // Open modal with pre-filled data
    this.kbTitle = this.selectedTicket.title;
    this.kbDescription = this.selectedTicket.description;
    this.kbSolution = '';
    this.isKbModalOpen = true;
  }

  saveKnowledgeBase(): void {
    if (!this.selectedTicket) return;
    if (!this.kbSolution.trim()) {
      this.showError('La solution est obligatoire');
      return;
    }

    this.isSavingKb = true;
    this.kbService.createFromTicket(this.selectedTicket.id, {
      title: this.kbTitle.trim(),
      description: this.kbDescription.trim(),
      solution: this.kbSolution.trim()
    }).subscribe({
      next: () => {
        this.isSavingKb = false;
        this.isKbModalOpen = false;
        this.showSuccess('Article de base de connaissances créé avec succès!');
      },
      error: (err) => {
        this.isSavingKb = false;
        this.showError(err.error?.message || 'Erreur lors de la création');
      }
    });
  }

  closeKbModal(): void {
    this.isKbModalOpen = false;
    this.kbTitle = '';
    this.kbDescription = '';
    this.kbSolution = '';
  }

  canConvertToKB(): boolean {
    return this.selectedTicket?.status === 'RESOLVED' || this.selectedTicket?.status === 'CLOSED';
  }

  private showSuccess(msg: string): void { this.successMessage = msg; setTimeout(() => this.successMessage = null, 3000); }
  private showError(msg: string):   void { this.errorMessage   = msg; setTimeout(() => this.errorMessage   = null, 4000); }

  private ensureValidPage(): void {
    const total = this.totalPages;  
    if (this.currentPage > total) this.currentPage = total;
    if (this.currentPage < 1)     this.currentPage = 1;
  }

  exportToExcel(): void {
  const headers = ['ID', 'Mantis ID', 'Titre', 'Statut', 'Priorité', 'Catégorie', 
                   'SLA', 'Créateur', 'Assigné à', 'Département', 'Créé le', 'Tags'];

  const rows = this.filteredTickets.map(t => [
    t.id,
    t.mantisId || '',
    t.title,
    this.statusLabels[t.status] || t.status,
    this.getPriorityConfig(t.priority).label,
    this.getCategoryConfig(t.category).label,
    this.getSLALabel(t.slaStatus),
    t.creatorFullName || '',
    t.assignedToFullName || 'Non assigné',
    t.departement || '',
    t.createdDate ? new Date(t.createdDate).toLocaleDateString('fr-FR') : '',
    (t.tags || []).join(', ')
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const BOM = '\uFEFF'; // Pour que Excel ouvre correctement l'UTF-8
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
}
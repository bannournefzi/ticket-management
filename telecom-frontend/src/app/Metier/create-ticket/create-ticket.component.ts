import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../auth/service/auth.service';
import { AdminService, UserDTO } from '../../services/admin.service';
import { CommentService } from '../../services/CommentService';
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
  selector: 'app-create-ticket',
  templateUrl: './create-ticket.component.html',
  styleUrls: ['./create-ticket.component.scss']
})
export class CreateTicketComponent implements OnInit {

  newTicket: CreateTicketRequest = this.emptyTicket();
  businessAnalysts: UserDTO[] = [];
  myTickets: Ticket[] = [];

  isLoading = false;
  isLoadingTickets = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Tags
  tagInput = '';
  comments: TicketComment[] = [];
  newComment = '';
  isInternalNote = false;
  isLoadingComments = false;
  isSendingComment = false;
  currentUserId = 0;

  // Modal
  isViewModalOpen = false;
  viewedTicket: Ticket | null = null;
  activeTab: 'details' | 'comments' | 'history' = 'details';
  ticketHistory: TicketHistory[] = [];
  isLoadingHistory = false;

  // Config
  priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  categories: TicketCategory[] = ['BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'SUPPORT', 'DOCUMENTATION', 'OTHER'];

  departements = [
    'DME', 'DMFI', 'IT', 'DRC', 'DFR', 'DCF',
    'DMM', 'DRT', 'INFO_CENTRE', 'NOC_DATA',
    'BOM', 'PORTAIL', 'DCWI', 'SERVICE_1200'
  ];

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

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private commentService: CommentService, 
  ) {}

  ngOnInit(): void {
    this.loadMyTickets();
    this.loadBusinessAnalysts();
    try { this.currentUserId = this.authService.getUserId(); } catch {}
  }

  // ══════════════════════════════════════════
  //  FORMULAIRE
  // ══════════════════════════════════════════

  emptyTicket(): CreateTicketRequest {
    return {
      title: '',
      description: '',
      priority: 'MEDIUM',
      category: 'SUPPORT',
      departement: undefined,
      assignedToId: undefined,
      tags: []
    };
  }

  resetForm(): void {
    this.newTicket = this.emptyTicket();
    this.tagInput = '';
  }

  // ══════════════════════════════════════════
  //  TAGS
  // ══════════════════════════════════════════

  addTag(event: Event): void {
    event.preventDefault();
    const tag = this.tagInput.trim();
    if (tag && (!this.newTicket.tags || !this.newTicket.tags.includes(tag))) {
      if (!this.newTicket.tags) this.newTicket.tags = [];
      this.newTicket.tags.push(tag);
    }
    this.tagInput = '';
  }

  removeTag(index: number): void {
    this.newTicket.tags?.splice(index, 1);
  }

  // ══════════════════════════════════════════
  //  CHARGEMENT DES DONNÉES
  // ══════════════════════════════════════════

  countByStatus(status: TicketStatus): number {
    return this.myTickets.filter(t => t.status === status).length;
  }

  loadMyTickets(): void {
    this.isLoadingTickets = true;
    this.ticketService.getMyTickets().subscribe({
      next: (data) => {
        this.myTickets = data.sort((a, b) =>
          new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
        );
        this.isLoadingTickets = false;
      },
      error: () => { this.isLoadingTickets = false; }
    });
  }

  loadBusinessAnalysts(): void {
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.businessAnalysts = users.filter(u =>
          u.roles.includes('ROLE_BUSINESS_ANALYST') && u.enabled
        );
      },
      error: () => {}
    });
  }

  // ══════════════════════════════════════════
  //  SOUMISSION
  // ══════════════════════════════════════════

  submitTicket(): void {
    if (!this.newTicket.title?.trim()) {
      this.showError('Le titre est obligatoire');
      return;
    }
    if (!this.newTicket.description?.trim()) {
      this.showError('La description est obligatoire');
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const request: CreateTicketRequest = {
      ...this.newTicket,
      title: this.newTicket.title.trim(),
      description: this.newTicket.description.trim(),
      departement: this.newTicket.departement || undefined,
      assignedToId: this.newTicket.assignedToId || undefined
    };

    this.ticketService.createTicket(request).subscribe({
      next: (ticket) => {
        this.isLoading = false;
        this.showSuccess(`Ticket #${ticket.id} créé avec succès !`);
        this.resetForm();
        this.loadMyTickets();
      },
      error: (err) => {
        this.isLoading = false;
        this.showError(err.error?.message || 'Erreur lors de la création du ticket');
      }
    });
  }

  // ══════════════════════════════════════════
  //  MODAL
  // ══════════════════════════════════════════

  openViewModal(ticket: Ticket): void {
    this.viewedTicket = ticket;
    this.isViewModalOpen = true;
    this.activeTab = 'details';
    this.ticketHistory = [];
    this.comments = [];
    this.newComment = '';
    this.isInternalNote = false;
    this.loadComments(ticket.id);
  }
loadComments(ticketId: number): void {
    this.isLoadingComments = true;
    this.commentService.getComments(ticketId).subscribe({
      next: (data) => {
        this.comments = data;
        this.isLoadingComments = false;
      },
      error: () => { this.isLoadingComments = false; }
    });
  }

  sendComment(): void {
    if (!this.newComment.trim() || !this.viewedTicket) return;
    this.isSendingComment = true;

    const req: CreateCommentRequest = {
      content: this.newComment.trim(),
      internalNote: this.isInternalNote
    };

    this.commentService.addComment(this.viewedTicket.id, req).subscribe({
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
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
      }
    });
  }

  canDeleteComment(comment: TicketComment): boolean {
    return comment.authorId === this.currentUserId;
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getCommentRoleLabel(role: string): string {
    const map: Record<string, string> = {
      'ADMIN': 'Admin',
      'BUSINESS_ANALYST': 'BA',
      'METIER': 'Métier'
    };
    return map[role] || role;
  }
  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedTicket = null;
    this.ticketHistory = [];
  }

  // ══════════════════════════════════════════
  //  HISTORIQUE
  // ══════════════════════════════════════════

  loadHistory(ticketId: number): void {
    this.isLoadingHistory = true;
    this.ticketHistory = [];
    this.ticketService.getTicketHistory(ticketId).subscribe({
      next: (data) => {
        this.ticketHistory = data;
        this.isLoadingHistory = false;
      },
      error: () => { this.isLoadingHistory = false; }
    });
  }

  getHistoryFieldLabel(field: string): string {
    const map: Record<string, string> = {
      'status': 'Statut',
      'priority': 'Priorité',
      'assignee': 'Assigné à',
      'title': 'Titre',
      'description': 'Description',
      'category': 'Catégorie'
    };
    return map[field] || field;
  }

  getHistoryDotClass(field: string): string {
    const map: Record<string, string> = {
      'status': 'dot-status',
      'priority': 'dot-priority',
      'assignee': 'dot-assignee'
    };
    return map[field] || 'dot-default';
  }

  // ══════════════════════════════════════════
  //  SLA
  // ══════════════════════════════════════════

  getSLADeadlineLabel(priority: string): string {
    const map: Record<string, string> = {
      'CRITICAL': '4 heures',
      'HIGH': '8 heures',
      'MEDIUM': '24 heures',
      'LOW': '72 heures'
    };
    return map[priority] || '72 heures';
  }

  getSLAClass(slaStatus?: string): string {
    const map: Record<string, string> = {
      'ON_TRACK': 'sla-on-track',
      'AT_RISK': 'sla-at-risk',
      'BREACHED': 'sla-breached',
      'MET': 'sla-met'
    };
    return map[slaStatus || ''] || '';
  }

  getSLALabel(slaStatus?: string): string {
    const map: Record<string, string> = {
      'ON_TRACK': '✅ Dans les délais',
      'AT_RISK': '⚠️ À risque',
      'BREACHED': '🔴 SLA dépassé',
      'MET': '✅ Résolu à temps'
    };
    return map[slaStatus || ''] || '';
  }

  getSLAShortLabel(slaStatus?: string): string {
    const map: Record<string, string> = {
      'ON_TRACK': 'OK',
      'AT_RISK': 'Risque',
      'BREACHED': 'Dépassé',
      'MET': 'OK'
    };
    return map[slaStatus || ''] || '—';
  }

  getSLAIcon(slaStatus?: string): string {
    const map: Record<string, string> = {
      'ON_TRACK': 'fas fa-check-circle',
      'AT_RISK': 'fas fa-exclamation-triangle',
      'BREACHED': 'fas fa-times-circle',
      'MET': 'fas fa-check-double'
    };
    return map[slaStatus || ''] || 'fas fa-minus-circle';
  }

  // ══════════════════════════════════════════
  //  HELPERS CSS
  // ══════════════════════════════════════════

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      'LOW': 'priority-low',
      'MEDIUM': 'priority-medium',
      'HIGH': 'priority-high',
      'CRITICAL': 'priority-critical'
    };
    return map[priority] || '';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'OPEN': 'status-open',
      'IN_PROGRESS': 'status-progress',
      'ON_HOLD': 'status-hold',
      'RESOLVED': 'status-resolved',
      'CLOSED': 'status-closed',
      'REJECTED': 'status-rejected'
    };
    return map[status] || '';
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  }

  // ══════════════════════════════════════════
  //  MESSAGES
  // ══════════════════════════════════════════

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 4000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = null, 4000);
  }
}
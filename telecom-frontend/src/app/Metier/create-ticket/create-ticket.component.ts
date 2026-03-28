import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../auth/service/auth.service';
import { AdminService, UserDTO } from '../../services/admin.service';
import { CommentService } from '../../services/CommentService';
import { AiService, VoiceToTicketResponse } from '../../services/AiService';
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
export class CreateTicketComponent implements OnInit, OnDestroy {

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

  // ── Voice-to-Ticket AI ──────────────────
  isRecording = false;
  isProcessingVoice = false;
  voiceTranscript = '';
  voiceConfidence = 0;
  showVoiceResult = false;
  recordingDuration = 0;
  private recordingInterval: any = null;
  private recognition: any = null;
  voiceSupported = false;
  voiceError: string | null = null;

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
    private aiService: AiService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadMyTickets();
    this.loadBusinessAnalysts();
    try { this.currentUserId = this.authService.getUserId(); } catch {}
    this.initVoiceRecognition();
  }

  ngOnDestroy(): void {
    this.stopRecording();
  }

  // ══════════════════════════════════════════
  //  VOICE-TO-TICKET AI
  // ══════════════════════════════════════════

  private initVoiceRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.voiceSupported = false;
      return;
    }
    this.voiceSupported = true;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      this.ngZone.run(() => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.voiceTranscript = transcript;
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        if (event.error === 'no-speech') {
          this.voiceError = 'Aucune voix détectée. Réessayez.';
        } else if (event.error === 'not-allowed') {
          this.voiceError = 'Accès au micro refusé. Vérifiez les permissions.';
        } else {
          this.voiceError = 'Erreur de reconnaissance vocale.';
        }
        this.stopRecording();
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        if (this.isRecording) {
          this.isRecording = false;
          this.clearRecordingTimer();
          if (this.voiceTranscript.trim()) {
            this.processVoiceText();
          }
        }
      });
    };
  }

  startRecording(): void {
    if (!this.voiceSupported || !this.recognition) {
      this.voiceError = 'La reconnaissance vocale n\'est pas supportée par votre navigateur.';
      return;
    }
    this.voiceTranscript = '';
    this.voiceError = null;
    this.showVoiceResult = false;
    this.isRecording = true;
    this.recordingDuration = 0;

    this.recordingInterval = setInterval(() => {
      this.recordingDuration++;
      if (this.recordingDuration >= 60) this.stopRecording();
    }, 1000);

    try { this.recognition.start(); }
    catch { this.isRecording = false; this.voiceError = 'Impossible de démarrer le micro.'; }
  }

  stopRecording(): void {
    this.isRecording = false;
    this.clearRecordingTimer();
    if (this.recognition) { try { this.recognition.stop(); } catch {} }
    if (this.voiceTranscript.trim()) this.processVoiceText();
  }

  private clearRecordingTimer(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  private processVoiceText(): void {
    if (!this.voiceTranscript.trim()) return;
    this.isProcessingVoice = true;
    this.voiceError = null;

    this.aiService.voiceToTicket(this.voiceTranscript).subscribe({
      next: (response: VoiceToTicketResponse) => {
        this.isProcessingVoice = false;
        this.voiceConfidence = response.confidence;
        this.showVoiceResult = true;

        // Auto-fill the form
        this.newTicket.title = response.title || '';
        this.newTicket.description = response.description || '';
        this.newTicket.priority = (response.priority as TicketPriority) || 'MEDIUM';
        this.newTicket.category = (response.category as TicketCategory) || 'SUPPORT';
        if (response.departement) this.newTicket.departement = response.departement;
        if (response.tags && response.tags.length > 0) {
  this.newTicket.tags = response.tags;
}

        this.showSuccess('Ticket rempli automatiquement par l\'IA ! Vérifiez et modifiez si nécessaire.');
      },
      error: () => {
        this.isProcessingVoice = false;
        this.voiceError = 'Erreur lors du traitement IA. Veuillez réessayer.';
        this.newTicket.description = this.voiceTranscript;
      }
    });
  }

  cancelVoice(): void {
    this.isRecording = false;
    this.isProcessingVoice = false;
    this.voiceTranscript = '';
    this.showVoiceResult = false;
    this.voiceError = null;
    this.clearRecordingTimer();
    if (this.recognition) { try { this.recognition.stop(); } catch {} }
  }

  getConfidenceLabel(): string {
    if (this.voiceConfidence >= 0.8) return 'Excellente';
    if (this.voiceConfidence >= 0.6) return 'Bonne';
    if (this.voiceConfidence >= 0.4) return 'Moyenne';
    return 'Faible';
  }

  getConfidenceClass(): string {
    if (this.voiceConfidence >= 0.8) return 'confidence-high';
    if (this.voiceConfidence >= 0.6) return 'confidence-good';
    if (this.voiceConfidence >= 0.4) return 'confidence-medium';
    return 'confidence-low';
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
    this.cancelVoice();
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
    if (!this.newTicket.title?.trim()) { this.showError('Le titre est obligatoire'); return; }
    if (!this.newTicket.description?.trim()) { this.showError('La description est obligatoire'); return; }

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
      next: (data) => { this.comments = data; this.isLoadingComments = false; },
      error: () => { this.isLoadingComments = false; }
    });
  }

  sendComment(): void {
    if (!this.newComment.trim() || !this.viewedTicket) return;
    this.isSendingComment = true;
    const req: CreateCommentRequest = { content: this.newComment.trim(), internalNote: this.isInternalNote };
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
      next: () => { this.comments = this.comments.filter(c => c.id !== comment.id); }
    });
  }

  canDeleteComment(comment: TicketComment): boolean {
    return comment.authorId === this.currentUserId;
  }

  getInitial(name: string): string { return name ? name.charAt(0).toUpperCase() : '?'; }

  getCommentRoleLabel(role: string): string {
    return { 'ADMIN': 'Admin', 'BUSINESS_ANALYST': 'BA', 'METIER': 'Métier' }[role] || role;
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
      next: (data) => { this.ticketHistory = data; this.isLoadingHistory = false; },
      error: () => { this.isLoadingHistory = false; }
    });
  }

  getHistoryFieldLabel(field: string): string {
    return { 'status': 'Statut', 'priority': 'Priorité', 'assignee': 'Assigné à', 'title': 'Titre', 'description': 'Description', 'category': 'Catégorie' }[field] || field;
  }

  getHistoryDotClass(field: string): string {
    return { 'status': 'dot-status', 'priority': 'dot-priority', 'assignee': 'dot-assignee' }[field] || 'dot-default';
  }

  // ══════════════════════════════════════════
  //  SLA
  // ══════════════════════════════════════════

  getSLADeadlineLabel(priority: string): string {
    return { 'CRITICAL': '4 heures', 'HIGH': '8 heures', 'MEDIUM': '24 heures', 'LOW': '72 heures' }[priority] || '72 heures';
  }

  getSLAClass(slaStatus?: string): string {
    return { 'ON_TRACK': 'sla-on-track', 'AT_RISK': 'sla-at-risk', 'BREACHED': 'sla-breached', 'MET': 'sla-met' }[slaStatus || ''] || '';
  }

  getSLALabel(slaStatus?: string): string {
    return { 'ON_TRACK': 'Dans les délais', 'AT_RISK': 'À risque', 'BREACHED': 'SLA dépassé', 'MET': 'Résolu à temps' }[slaStatus || ''] || '';
  }

  getSLAShortLabel(slaStatus?: string): string {
    return { 'ON_TRACK': 'OK', 'AT_RISK': 'Risque', 'BREACHED': 'Dépassé', 'MET': 'OK' }[slaStatus || ''] || '—';
  }

  getSLAIcon(slaStatus?: string): string {
    return { 'ON_TRACK': 'fas fa-check-circle', 'AT_RISK': 'fas fa-exclamation-triangle', 'BREACHED': 'fas fa-times-circle', 'MET': 'fas fa-check-double' }[slaStatus || ''] || 'fas fa-minus-circle';
  }

  // ══════════════════════════════════════════
  //  HELPERS CSS
  // ══════════════════════════════════════════

  getPriorityClass(priority: string): string {
    return { 'LOW': 'priority-low', 'MEDIUM': 'priority-medium', 'HIGH': 'priority-high', 'CRITICAL': 'priority-critical' }[priority] || '';
  }

  getStatusClass(status: string): string {
    return { 'OPEN': 'status-open', 'IN_PROGRESS': 'status-progress', 'ON_HOLD': 'status-hold', 'RESOLVED': 'status-resolved', 'CLOSED': 'status-closed', 'REJECTED': 'status-rejected' }[status] || '';
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `Il y a ${m}min`;
    if (h < 24) return `Il y a ${h}h`;
    if (d < 7) return `Il y a ${d}j`;
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
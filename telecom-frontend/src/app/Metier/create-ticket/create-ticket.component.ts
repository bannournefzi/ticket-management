import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../auth/service/auth.service';
import { AdminService, UserDTO } from '../../services/admin.service';
import { CommentService } from '../../services/CommentService';
import { AiService, VoiceToTicketResponse } from '../../services/AiService';
import { SettingsService, SlaConfig, CategoryConfig } from '../../services/SettingsService';
import {
  Ticket, CreateTicketRequest, TicketHistory,
  TicketPriority, TicketStatus, TicketCategory
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

  tagInput = '';
  comments: TicketComment[] = [];
  newComment = '';
  isInternalNote = false;
  isLoadingComments = false;
  isSendingComment = false;
  currentUserId = 0;

  isViewModalOpen = false;
  viewedTicket: Ticket | null = null;
  activeTab: 'details' | 'comments' | 'history' = 'details';
  ticketHistory: TicketHistory[] = [];
  isLoadingHistory = false;

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

  priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  categories: TicketCategory[] = ['BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'SUPPORT', 'DOCUMENTATION', 'OTHER'];
  slaConfigs: SlaConfig[] = [];
  dynamicCategories: CategoryConfig[] = [];

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
    'OPEN': 'Ouvert', 'IN_PROGRESS': 'En cours', 'ON_HOLD': 'En attente',
    'RESOLVED': 'Résolu', 'CLOSED': 'Fermé', 'REJECTED': 'Rejeté'
  };

  constructor(
    private settingsService: SettingsService,
    private ticketService: TicketService,
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private commentService: CommentService,
    private aiService: AiService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadSlaConfigs();
    this.loadDynamicCategories();
    this.loadMyTickets();
    this.loadBusinessAnalysts();
    try { this.currentUserId = this.authService.getUserId(); } catch {}
    this.initVoiceRecognition();
  }

  ngOnDestroy(): void { this.stopRecording(); }

  private initVoiceRecognition(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this.voiceSupported = false; return; }
    this.voiceSupported = true;
    this.recognition = new SR();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      this.ngZone.run(() => {
        let t = '';
        for (let i = 0; i < event.results.length; i++) t += event.results[i][0].transcript;
        this.voiceTranscript = t;
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        this.voiceError = event.error === 'no-speech' ? 'Aucune voix détectée.'
          : event.error === 'not-allowed' ? 'Accès au micro refusé.'
          : 'Erreur de reconnaissance vocale.';
        this.stopRecording();
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        if (this.isRecording) {
          this.isRecording = false;
          this.clearRecordingTimer();
          if (this.voiceTranscript.trim()) this.processVoiceText();
        }
      });
    };
  }

  startRecording(): void {
    if (!this.voiceSupported || !this.recognition) {
      this.voiceError = 'Reconnaissance vocale non supportée.'; return;
    }
    this.voiceTranscript = ''; this.voiceError = null; this.showVoiceResult = false;
    this.isRecording = true; this.recordingDuration = 0;
    this.recordingInterval = setInterval(() => {
      this.recordingDuration++;
      if (this.recordingDuration >= 60) this.stopRecording();
    }, 1000);
    try { this.recognition.start(); }
    catch { this.isRecording = false; this.voiceError = 'Impossible de démarrer le micro.'; }
  }

  stopRecording(): void {
    this.isRecording = false; this.clearRecordingTimer();
    if (this.recognition) { try { this.recognition.stop(); } catch {} }
    if (this.voiceTranscript.trim()) this.processVoiceText();
  }

  private clearRecordingTimer(): void {
    if (this.recordingInterval) { clearInterval(this.recordingInterval); this.recordingInterval = null; }
  }

  private processVoiceText(): void {
    if (!this.voiceTranscript.trim()) return;
    this.isProcessingVoice = true; this.voiceError = null;
    this.aiService.voiceToTicket(this.voiceTranscript).subscribe({
      next: (r: VoiceToTicketResponse) => {
        this.isProcessingVoice = false; this.voiceConfidence = r.confidence; this.showVoiceResult = true;
        this.newTicket.title = r.title || '';
        this.newTicket.description = r.description || '';
        this.newTicket.priority = (r.priority as TicketPriority) || 'MEDIUM';
        this.newTicket.category = (r.category as TicketCategory) || 'SUPPORT';
        if (r.tags?.length) this.newTicket.tags = r.tags;
        this.showSuccess('Formulaire rempli par l\'IA. Vérifiez avant de soumettre.');
      },
      error: () => {
        this.isProcessingVoice = false;
        this.voiceError = 'Erreur IA. Réessayez.';
        this.newTicket.description = this.voiceTranscript;
      }
    });
  }

  cancelVoice(): void {
    this.isRecording = false; this.isProcessingVoice = false;
    this.voiceTranscript = ''; this.showVoiceResult = false; this.voiceError = null;
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

  formatDuration(s: number): string {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  emptyTicket(): CreateTicketRequest {
    return { title: '', description: '', priority: 'MEDIUM', category: 'SUPPORT', departement: undefined, assignedToId: undefined, tags: [] };
  }

  resetForm(): void { this.newTicket = this.emptyTicket(); this.tagInput = ''; this.cancelVoice(); }

  addTag(event: Event): void {
    event.preventDefault();
    const tag = this.tagInput.trim();
    if (tag && (!this.newTicket.tags || !this.newTicket.tags.includes(tag))) {
      if (!this.newTicket.tags) this.newTicket.tags = [];
      this.newTicket.tags.push(tag);
    }
    this.tagInput = '';
  }

  removeTag(i: number): void { this.newTicket.tags?.splice(i, 1); }

  countByStatus(status: TicketStatus): number { return this.myTickets.filter(t => t.status === status).length; }

  loadSlaConfigs(): void {
    this.settingsService.getAllSla().subscribe({ next: (d) => this.slaConfigs = d, error: () => {} });
  }

  loadDynamicCategories(): void {
    this.settingsService.getEnabledCategories().subscribe({
      next: (data) => {
        this.dynamicCategories = data;
        const newConfig: Record<string, { label: string; icon: string }> = {};
        data.forEach(c => { newConfig[c.code] = { label: c.label, icon: c.icon }; });
        this.categoryConfig = { ...this.categoryConfig, ...newConfig };
        this.categories = data.map(c => c.code as any);
      },
      error: () => {}
    });
  }

  loadMyTickets(): void {
    this.isLoadingTickets = true;
    this.ticketService.getMyTickets().subscribe({
      next: (d) => { this.myTickets = d.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()); this.isLoadingTickets = false; },
      error: () => { this.isLoadingTickets = false; }
    });
  }

  loadBusinessAnalysts(): void {
    this.adminService.getAllUsers().subscribe({
      next: (u) => { this.businessAnalysts = u.filter(x => x.roles.includes('ROLE_BUSINESS_ANALYST') && x.enabled); },
      error: () => {}
    });
  }

  submitTicket(): void {
    if (!this.newTicket.title?.trim()) { this.showError('Le titre est obligatoire'); return; }
    if (!this.newTicket.description?.trim()) { this.showError('La description est obligatoire'); return; }
    this.isLoading = true; this.errorMessage = null;
    const request: CreateTicketRequest = {
      ...this.newTicket, title: this.newTicket.title.trim(), description: this.newTicket.description.trim(),
      departement: this.newTicket.departement || undefined, assignedToId: this.newTicket.assignedToId || undefined
    };
    this.ticketService.createTicket(request).subscribe({
      next: (t) => { this.isLoading = false; this.showSuccess(`Ticket #${t.id} créé avec succès !`); this.resetForm(); this.loadMyTickets(); },
      error: (e) => { this.isLoading = false; this.showError(e.error?.message || 'Erreur lors de la création'); }
    });
  }

  openViewModal(ticket: Ticket): void {
    this.viewedTicket = ticket; this.isViewModalOpen = true; this.activeTab = 'details';
    this.ticketHistory = []; this.comments = []; this.newComment = ''; this.isInternalNote = false;
    this.loadComments(ticket.id);
  }

  loadComments(id: number): void {
    this.isLoadingComments = true;
    this.commentService.getComments(id).subscribe({
      next: (d) => { this.comments = d; this.isLoadingComments = false; }, error: () => { this.isLoadingComments = false; }
    });
  }

  sendComment(): void {
    if (!this.newComment.trim() || !this.viewedTicket) return;
    this.isSendingComment = true;
    this.commentService.addComment(this.viewedTicket.id, { content: this.newComment.trim(), internalNote: this.isInternalNote }).subscribe({
      next: (c) => { this.comments.push(c); this.newComment = ''; this.isInternalNote = false; this.isSendingComment = false; },
      error: () => { this.isSendingComment = false; }
    });
  }

  deleteComment(c: TicketComment): void {
    if (!this.viewedTicket || !confirm('Supprimer ce commentaire ?')) return;
    this.commentService.deleteComment(this.viewedTicket.id, c.id).subscribe({ next: () => { this.comments = this.comments.filter(x => x.id !== c.id); } });
  }

  canDeleteComment(c: TicketComment): boolean { return c.authorId === this.currentUserId; }
  getInitial(n: string): string { return n ? n.charAt(0).toUpperCase() : '?'; }
  getCommentRoleLabel(r: string): string { return { 'ADMIN': 'Admin', 'BUSINESS_ANALYST': 'BA', 'METIER': 'Métier' }[r] || r; }
  closeViewModal(): void { this.isViewModalOpen = false; this.viewedTicket = null; this.ticketHistory = []; }

  loadHistory(id: number): void {
    this.isLoadingHistory = true; this.ticketHistory = [];
    this.ticketService.getTicketHistory(id).subscribe({
      next: (d) => { this.ticketHistory = d; this.isLoadingHistory = false; }, error: () => { this.isLoadingHistory = false; }
    });
  }

  getHistoryFieldLabel(f: string): string { return { 'status': 'Statut', 'priority': 'Priorité', 'assignee': 'Assigné à', 'title': 'Titre', 'description': 'Description', 'category': 'Catégorie' }[f] || f; }
  getHistoryDotClass(f: string): string { return { 'status': 'dot-status', 'priority': 'dot-priority', 'assignee': 'dot-assignee' }[f] || 'dot-default'; }

  getSLADeadlineLabel(priority: string): string {
    const sla = this.slaConfigs.find(s => s.priorityLevel === priority);
    if (sla) return sla.resolutionHours >= 24 ? `${sla.resolutionHours / 24} jour(s)` : `${sla.resolutionHours} heures`;
    return { 'CRITICAL': '4 heures', 'HIGH': '8 heures', 'MEDIUM': '24 heures', 'LOW': '72 heures' }[priority] || '24 heures';
  }

  getSLAClass(s?: string): string { return { 'ON_TRACK': 'sla-on-track', 'AT_RISK': 'sla-at-risk', 'BREACHED': 'sla-breached', 'MET': 'sla-met' }[s || ''] || ''; }
  getSLALabel(s?: string): string { return { 'ON_TRACK': 'Dans les délais', 'AT_RISK': 'À risque', 'BREACHED': 'SLA dépassé', 'MET': 'Résolu à temps' }[s || ''] || ''; }
  getSLAShortLabel(s?: string): string { return { 'ON_TRACK': 'OK', 'AT_RISK': 'Risque', 'BREACHED': 'Dépassé', 'MET': 'OK' }[s || ''] || '—'; }
  getSLAIcon(s?: string): string { return { 'ON_TRACK': 'fas fa-check-circle', 'AT_RISK': 'fas fa-exclamation-triangle', 'BREACHED': 'fas fa-times-circle', 'MET': 'fas fa-check-double' }[s || ''] || 'fas fa-minus-circle'; }
  getPriorityClass(p: string): string { return { 'LOW': 'priority-low', 'MEDIUM': 'priority-medium', 'HIGH': 'priority-high', 'CRITICAL': 'priority-critical' }[p] || ''; }
  getStatusClass(s: string): string { return { 'OPEN': 'status-open', 'IN_PROGRESS': 'status-progress', 'ON_HOLD': 'status-hold', 'RESOLVED': 'status-resolved', 'CLOSED': 'status-closed', 'REJECTED': 'status-rejected' }[s] || ''; }

  getTimeAgo(d: string): string {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant"; if (m < 60) return `${m}min`; if (h < 24) return `${h}h`; if (dy < 7) return `${dy}j`;
    return new Date(d).toLocaleDateString('fr-FR');
  }

  private showSuccess(m: string): void { this.successMessage = m; setTimeout(() => this.successMessage = null, 4000); }
  private showError(m: string): void { this.errorMessage = m; setTimeout(() => this.errorMessage = null, 4000); }
}
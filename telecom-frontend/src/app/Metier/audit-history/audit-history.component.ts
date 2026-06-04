import { Component, OnInit } from '@angular/core';
import { AuditLogService } from '../../services/audit-log.service';
import { AuditLog } from '../../models/audit-log.model';
import { PageResponse } from '../../models/ticket.model';

@Component({
  selector: 'app-audit-history',
  templateUrl: './audit-history.component.html',
  styleUrls: ['./audit-history.component.scss']
})
export class AuditHistoryComponent implements OnInit {

  // Data
  logs: AuditLog[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  // Filters
  actionTypeFilter = '';

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;
  Math = Math;

  actionTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
    'LOGIN':              { label: 'Connexion',       icon: 'fas fa-sign-in-alt',      color: 'action-login' },
    'LOGOUT':             { label: 'Déconnexion',     icon: 'fas fa-sign-out-alt',     color: 'action-logout' },
    'REGISTER':           { label: 'Inscription',     icon: 'fas fa-user-plus',        color: 'action-create' },
    'ACTIVATE_ACCOUNT':   { label: 'Activation',      icon: 'fas fa-check-circle',     color: 'action-login' },
    'CREATE_TICKET':      { label: 'Création ticket', icon: 'fas fa-plus-circle',      color: 'action-create' },
    'UPDATE_TICKET':      { label: 'Modification',    icon: 'fas fa-edit',             color: 'action-update' },
    'CHANGE_TICKET_STATUS': { label: 'Changement statut', icon: 'fas fa-exchange-alt', color: 'action-status' },
    'DELETE_TICKET':      { label: 'Suppression',     icon: 'fas fa-trash-alt',        color: 'action-delete' },
    'ASSIGN_TICKET':      { label: 'Assignation',     icon: 'fas fa-user-check',       color: 'action-assign' },
    'PUSH_TO_MANTIS':     { label: 'Push Mantis',     icon: 'fas fa-bug',              color: 'action-mantis' },
    'CREATE_COMMENT':     { label: 'Commentaire',     icon: 'fas fa-comment',          color: 'action-comment' },
    'DELETE_COMMENT':     { label: 'Suppr. commentaire', icon: 'fas fa-comment-slash', color: 'action-delete' },
    'UPLOAD_ATTACHMENT':  { label: 'Pièce jointe',    icon: 'fas fa-paperclip',        color: 'action-view' },
    'TOGGLE_COMMENTS':    { label: 'Commentaires ON/OFF', icon: 'fas fa-comment-dots', color: 'action-status' },
    'CREATE_USER':        { label: 'Création utilisateur', icon: 'fas fa-user-plus',   color: 'action-create' },
    'UPDATE_USER':        { label: 'Modification utilisateur', icon: 'fas fa-user-edit', color: 'action-update' },
    'DELETE_USER':        { label: 'Suppression utilisateur', icon: 'fas fa-user-minus', color: 'action-delete' },
    'TOGGLE_USER_STATUS': { label: 'Activation/Désactivation', icon: 'fas fa-toggle-on', color: 'action-status' },
    'UPDATE_USER_ROLE':   { label: 'Changement rôle', icon: 'fas fa-user-shield',      color: 'action-mantis' },
    'CHANGE_PASSWORD':    { label: 'Changement mot de passe', icon: 'fas fa-key',       color: 'action-update' },
    'FORGOT_PASSWORD':    { label: 'Mot de passe oublié', icon: 'fas fa-question-circle', color: 'action-view' },
    'RESET_PASSWORD':     { label: 'Réinitialisation mot de passe', icon: 'fas fa-key', color: 'action-login' },
    'UPDATE_PROFILE_PHOTO': { label: 'Photo de profil', icon: 'fas fa-camera',           color: 'action-update' },
    'DELETE_PROFILE_PHOTO': { label: 'Suppression photo', icon: 'fas fa-user-slash',     color: 'action-delete' }
  };

  constructor(private auditLogService: AuditLogService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  // ══════════════════════════════════════════
  //  CHARGEMENT
  // ══════════════════════════════════════════

  loadHistory(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.auditLogService.getMyHistory(this.currentPage, this.pageSize, 'desc', this.actionTypeFilter || undefined).subscribe({
      next: (page: PageResponse<AuditLog>) => {
        this.logs = page.content;
        this.totalElements = page.totalElements;
        this.totalPages = page.totalPages;
        this.isLoading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement de l\'historique');
        this.isLoading = false;
      }
    });
  }

  // ══════════════════════════════════════════
  //  FILTRES
  // ══════════════════════════════════════════

  applyFilters(): void {
    this.currentPage = 0;
    this.loadHistory();
  }

  resetFilters(): void {
    this.actionTypeFilter = '';
    this.currentPage = 0;
    this.loadHistory();
  }

  get hasActiveFilters(): boolean {
    return !!this.actionTypeFilter;
  }

  // ══════════════════════════════════════════
  //  PAGINATION
  // ══════════════════════════════════════════

  getPageStart(): number {
    if (this.totalElements === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  getPageEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadHistory();
  }

  getPages(): number[] {
    const pages: number[] = [];
    const delta = 2;
    for (let i = Math.max(0, this.currentPage - delta); i <= Math.min(this.totalPages - 1, this.currentPage + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  // ══════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════

  getActionConfig(actionType: string): { label: string; icon: string; color: string } {
    return this.actionTypeConfig[actionType] ?? { label: actionType, icon: 'fas fa-circle', color: '' };
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1)  return "À l'instant";
    if (m < 60) return `${m}min`;
    if (h < 24) return `${h}h`;
    if (d < 7)  return `${d}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = null, 4000);
  }
}

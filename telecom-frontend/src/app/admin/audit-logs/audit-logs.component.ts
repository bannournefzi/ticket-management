import { Component, OnInit } from '@angular/core';
import { AuditLogService } from '../../services/audit-log.service';
import { AuditLog, AuditLogFilters } from '../../models/audit-log.model';
import { PageResponse } from '../../models/ticket.model';

@Component({
  selector: 'app-audit-logs',
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.scss']
})
export class AuditLogsComponent implements OnInit {

  // Data
  logs: AuditLog[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Filters
  filters: AuditLogFilters = {};
  userIdFilter = '';
  actionTypeFilter = '';
  moduleFilter = '';
  dateFromFilter = '';
  dateToFilter = '';
  keywordFilter = '';

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
    this.loadLogs();
  }

  // ══════════════════════════════════════════
  //  CHARGEMENT
  // ══════════════════════════════════════════

  loadLogs(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.filters = {};
    if (this.userIdFilter) this.filters.userId = Number(this.userIdFilter);
    if (this.actionTypeFilter) this.filters.actionType = this.actionTypeFilter;
    if (this.moduleFilter) this.filters.module = this.moduleFilter;
    if (this.dateFromFilter) this.filters.dateFrom = this.dateFromFilter;
    if (this.dateToFilter) this.filters.dateTo = this.dateToFilter;
    if (this.keywordFilter) this.filters.keyword = this.keywordFilter;

    this.auditLogService.getAllHistory(this.currentPage, this.pageSize, 'desc', this.filters).subscribe({
      next: (page: PageResponse<AuditLog>) => {
        this.logs = page.content;
        this.totalElements = page.totalElements;
        this.totalPages = page.totalPages;
        this.isLoading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement des journaux d\'audit');
        this.isLoading = false;
      }
    });
  }

  // ══════════════════════════════════════════
  //  FILTRES
  // ══════════════════════════════════════════

  applyFilters(): void {
    this.currentPage = 0;
    this.loadLogs();
  }

  resetFilters(): void {
    this.userIdFilter = '';
    this.actionTypeFilter = '';
    this.moduleFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.keywordFilter = '';
    this.currentPage = 0;
    this.loadLogs();
  }

  get hasActiveFilters(): boolean {
    return !!(this.userIdFilter || this.actionTypeFilter || this.moduleFilter ||
              this.dateFromFilter || this.dateToFilter || this.keywordFilter);
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
    this.loadLogs();
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

  // ══════════════════════════════════════════
  //  EXPORT CSV
  // ══════════════════════════════════════════

  exportCSV(): void {
    const headers = ['ID', 'Utilisateur', 'Action', 'Module', 'Entité', 'ID Entité', 'Date'];
    const rows = this.logs.map(l => [
      l.id,
      `"${l.userFullName.replace(/"/g, '""')}"`,
      this.getActionConfig(l.actionType).label,
      l.module,
      l.entityType,
      l.entityId ?? '',
      l.createdDate ? new Date(l.createdDate).toLocaleDateString('fr-FR') : ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = null, 4000);
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 4000);
  }
}

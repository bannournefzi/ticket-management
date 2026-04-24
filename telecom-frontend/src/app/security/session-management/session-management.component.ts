import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionService, UserSession } from '../../services/session.service';

@Component({
  selector: 'app-session-management',
  templateUrl: './session-management.component.html',
  styleUrls: ['./session-management.component.scss']
})
export class SessionManagementComponent implements OnInit, OnDestroy {

  sessions: UserSession[] = [];
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  isRevokeModalOpen = false;
  sessionToRevoke: UserSession | null = null;

  private destroy$ = new Subject<void>();

  constructor(private sessionService: SessionService) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSessions(): void {
    this.isLoading = true;
    this.sessionService.getMySessions().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.sessions = data;
        this.isLoading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement des sessions');
        this.isLoading = false;
      }
    });
  }

  openRevokeModal(session: UserSession): void {
    this.sessionToRevoke = session;
    this.isRevokeModalOpen = true;
  }

  closeRevokeModal(): void {
    this.isRevokeModalOpen = false;
    this.sessionToRevoke = null;
  }

  confirmRevoke(): void {
    if (!this.sessionToRevoke) return;
    this.sessionService.revokeSession(this.sessionToRevoke.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showSuccess('Session révoquée avec succès. Cet appareil a été déconnecté.');
        this.loadSessions();
        this.closeRevokeModal();
      },
      error: () => {
        this.showError('Erreur lors de la révocation de la session');
        this.closeRevokeModal();
      }
    });
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
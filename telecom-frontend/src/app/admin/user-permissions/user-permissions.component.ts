import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminService, UserDTO } from '../../services/admin.service';
import { PUBLIC_PAGES } from '../../constants/public-pages.constant';

interface PageConfig {
  key: string;
  label: string;
  icon: string;
}

const ALL_PAGES: PageConfig[] = [
  { key: 'DASHBOARD', label: 'Dashboard', icon: 'fa-tachometer-alt' },
  { key: 'CREER_TICKET', label: 'Créer un Ticket', icon: 'fa-plus-circle' },
  { key: 'MES_TICKETS', label: 'Mes Tickets', icon: 'fa-ticket-alt' },
  { key: 'ASSISTANT_DEPANNAGE', label: 'Assistant de Dépannage', icon: 'fa-robot' },
  { key: 'BASE_CONNAISSANCES', label: 'Base de Connaissances', icon: 'fa-book' },
  { key: 'CALENDRIER_SLA', label: 'Calendrier SLA', icon: 'fa-calendar-check' },
  { key: 'MESSAGES', label: 'Messages', icon: 'fa-comments' },
  { key: 'CALENDRIER_REUNIONS', label: 'Calendrier Réunions', icon: 'fa-calendar-alt' },
  { key: 'REUNIONS', label: 'Réunions', icon: 'fa-users' },
  { key: 'MON_PROFIL', label: 'Mon Profil', icon: 'fa-user' },
];

@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-permissions.component.html',
  styleUrls: ['./user-permissions.component.scss']
})
export class UserPermissionsComponent implements OnInit, OnDestroy {
  userId!: number;
  user: UserDTO | null = null;
  grantedPages: Set<string> = new Set();
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;

  readonly pages = ALL_PAGES;
  pageIconMap: Record<string, string> = {};

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService
  ) {
    for (const p of ALL_PAGES) {
      this.pageIconMap[p.key] = p.icon;
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/users']);
      return;
    }
    this.userId = +id;
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getUserById(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.user = user;
        this.loadPermissions();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les informations de l\'utilisateur';
        this.isLoading = false;
      }
    });
  }

  private loadPermissions(): void {
    this.adminService.getUserPermissions(this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (keys) => {
        this.grantedPages = new Set(keys);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les permissions';
        this.isLoading = false;
      }
    });
  }

  isPublicPage(pageKey: string): boolean {
    return PUBLIC_PAGES.includes(pageKey);
  }

  isGranted(pageKey: string): boolean {
    return this.grantedPages.has(pageKey);
  }

  toggle(pageKey: string, event: Event): void {
    if (this.isPublicPage(pageKey)) return;
    event.stopPropagation();
    if (this.isSaving) return;

    const currentlyGranted = this.grantedPages.has(pageKey);
    this.isSaving = true;

    const request = currentlyGranted
      ? this.adminService.revokePageAccess(this.userId, pageKey)
      : this.adminService.grantPageAccess(this.userId, pageKey);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (currentlyGranted) {
          this.grantedPages.delete(pageKey);
        } else {
          this.grantedPages.add(pageKey);
        }
        this.isSaving = false;
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }
}

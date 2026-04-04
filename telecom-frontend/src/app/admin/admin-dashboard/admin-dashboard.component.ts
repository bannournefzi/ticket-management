import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, UserDTO, UserStatsDTO } from '../../services/admin.service';
import { TicketService } from '../../services/ticket.service';
import { Ticket, TicketStats, TicketStatus } from '../../models/ticket.model';
import { AuthService } from '../../auth/service/auth.service';
import { combineLatest, interval, of, Subject } from 'rxjs';
import { catchError, takeUntil, tap } from 'rxjs/operators';

type AdminView = 'overview' | 'tickets' | 'users';
type TicketFilterValue = 'ALL' | TicketStatus;

interface ActivityItem {
  type: 'created' | 'progress' | 'resolved' | 'closed' | 'default';
  message: string;
  detail: string;
  time: string;
  icon: string;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  'NEW': 'Nouveau', 'FEEDBACK': 'Feedback', 'ACKNOWLEDGED': 'Reconnu',
  'CONFIRMED': 'Confirmé', 'ASSIGNED': 'Assigné', 'RESOLVED': 'Résolu', 'CLOSED': 'Fermé'
};

const STATUS_ICONS: Record<string, string> = {
  'NEW': 'fa-plus-circle', 'FEEDBACK': 'fa-comment', 'ACKNOWLEDGED': 'fa-check',
  'CONFIRMED': 'fa-clipboard-check', 'ASSIGNED': 'fa-user-check', 'RESOLVED': 'fa-check-circle',
  'CLOSED': 'fa-archive'
};

const STATUS_TYPES: Record<string, ActivityItem['type']> = {
  'NEW': 'created', 'FEEDBACK': 'progress', 'ACKNOWLEDGED': 'progress',
  'CONFIRMED': 'progress', 'ASSIGNED': 'progress', 'RESOLVED': 'resolved',
  'CLOSED': 'closed'
};

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  // Data
  userStats: UserStatsDTO | null = null;
  ticketStats: TicketStats | null = null;
  recentUsers: UserDTO[] = [];
  allTickets: Ticket[] = [];
  activityFeed: ActivityItem[] = [];

  // Filters
  ticketStatusFilter: TicketFilterValue = 'ALL';
  ticketPriorityFilter = 'ALL';
  ticketSearch = '';
  userSearch = '';

  // UI state
  adminName = 'Admin';
  lastRefresh = new Date();
  loading = true;
  activeView: AdminView = 'overview';
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.adminName = this.authService.getUserFullName();
    this.loadData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -- Data Loading --

  private loadData(): void {
    this.loading = true;
    this.lastRefresh = new Date();

    combineLatest([
      this.adminService.getUserStats().pipe(catchError(() => of(null))),
      this.ticketService.getTicketStats().pipe(catchError(() => of(null))),
      this.adminService.getAllUsers().pipe(catchError(() => of([]))),
      this.ticketService.getAllTickets().pipe(catchError(() => of([])))
    ]).pipe(
      tap(([users, stats, allUsers, allTickets]) => {
        this.userStats = users;
        this.ticketStats = stats;
        this.recentUsers = this.sortByDateDesc(allUsers).slice(0, 8);
        this.allTickets = this.sortTicketsByDate(allTickets);
        this.activityFeed = this.buildActivityFeed(this.allTickets.slice(0, 8));
        this.loading = false;
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  refreshData(): void {
    this.loadData();
  }

  private setupAutoRefresh(): void {
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeView === 'overview') this.loadData();
      });
  }

  // -- View Management --

  setView(view: AdminView): void {
    this.activeView = view;
  }

  // -- Computed Values --

  get activePercent(): number {
    if (!this.userStats?.totalUsers) return 0;
    return Math.round((this.userStats.activeUsers / this.userStats.totalUsers) * 100);
  }

  get resolutionRate(): number {
    if (!this.ticketStats?.totalTickets) return 0;
    return Math.round(
      ((this.ticketStats.resolvedTickets + this.ticketStats.closedTickets) / this.ticketStats.totalTickets) * 100
    );
  }

  rolePercent(count: number): number {
    if (!this.userStats?.totalUsers) return 0;
    return Math.round((count / this.userStats.totalUsers) * 100);
  }

  get filteredTickets(): Ticket[] {
    return this.allTickets.filter(t => {
      const matchStatus = this.ticketStatusFilter === 'ALL' || t.status === this.ticketStatusFilter;
      const matchPriority = this.ticketPriorityFilter === 'ALL' || t.priority === this.ticketPriorityFilter;
      const matchSearch = !this.ticketSearch ||
        t.title.toLowerCase().includes(this.ticketSearch.toLowerCase()) ||
        t.creatorFullName.toLowerCase().includes(this.ticketSearch.toLowerCase());
      return matchStatus && matchPriority && matchSearch;
    });
  }

  get filteredUsers(): UserDTO[] {
    if (!this.userSearch) return this.recentUsers;
    const q = this.userSearch.toLowerCase();
    return this.recentUsers.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  // -- Activity Feed --

  private buildActivityFeed(tickets: Ticket[]): ActivityItem[] {
    return tickets.map(t => ({
      type: STATUS_TYPES[t.status] || 'default',
      message: `${t.creatorFullName} — ${t.title}`,
      detail: STATUS_LABELS[t.status] || t.status,
      time: t.createdDate,
      icon: STATUS_ICONS[t.status] || 'fa-circle'
    }));
  }

  // -- CSV Export --

  exportTicketsCSV(): void {
    const headers = ['Titre', 'Créateur', 'Priorité', 'Statut', 'Date'];
    const rows = this.filteredTickets.map(t => [
      t.title, t.creatorFullName, this.getPriorityLabel(t.priority),
      STATUS_LABELS[t.status] || t.status, t.createdDate
    ]);
    this.downloadCSV([headers, ...rows], 'tickets_export');
  }

  exportUsersCSV(): void {
    const headers = ['Nom', 'Prénom', 'Email', 'Rôle', 'Statut', 'Date'];
    const rows = this.filteredUsers.map(u => [
      u.lastName, u.firstName, u.email,
      this.getRoleBadge(u.roles), u.enabled ? 'Actif' : 'Inactif',
      u.createdDate
    ]);
    this.downloadCSV([headers, ...rows], 'users_export');
  }

  private downloadCSV(data: string[][], filename: string): void {
    const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // -- Helpers --

  getRoleBadge(roles: string[]): string {
    if (roles.includes('ROLE_ADMIN')) return 'Admin';
    if (roles.includes('ROLE_BUSINESS_ANALYST')) return 'Business Analyst';
    if (roles.includes('ROLE_METIER')) return 'Métier';
    return 'User';
  }

  getRoleClass(roles: string[]): string {
    if (roles.includes('ROLE_ADMIN')) return 'role-admin';
    if (roles.includes('ROLE_BUSINESS_ANALYST')) return 'role-ba';
    if (roles.includes('ROLE_METIER')) return 'role-metier';
    return 'role-default';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'NEW': 'status-open', 'FEEDBACK': 'status-hold', 'ACKNOWLEDGED': 'status-progress',
      'CONFIRMED': 'status-progress', 'ASSIGNED': 'status-progress', 'RESOLVED': 'status-resolved',
      'CLOSED': 'status-closed'
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status as TicketStatus] || status;
  }

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      'LOW': 'priority-low', 'MEDIUM': 'priority-medium',
      'HIGH': 'priority-high', 'CRITICAL': 'priority-critical'
    };
    return map[priority] || '';
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = {
      'LOW': 'Basse', 'MEDIUM': 'Moyenne', 'HIGH': 'Haute', 'CRITICAL': 'Critique'
    };
    return map[priority] || priority;
  }

  getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  }

  getTimeAgo(date: string): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
    return new Date(date).toLocaleDateString('fr-FR');
  }

  trackByTicketId(_index: number, ticket: Ticket): number {
    return ticket.id;
  }

  trackByUser(_index: number, user: UserDTO): number {
    return user.id;
  }

  private sortByDateDesc(items: UserDTO[]): UserDTO[] {
    return [...items].sort((a, b) =>
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  }

  private sortTicketsByDate(tickets: Ticket[]): Ticket[] {
    return [...tickets].sort((a, b) =>
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  }

  goToUserManagement(): void {
    this.router.navigate(['/admin/users']);
  }
}

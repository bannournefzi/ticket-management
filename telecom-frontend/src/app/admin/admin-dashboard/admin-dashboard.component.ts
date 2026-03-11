import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminService, UserDTO, UserStatsDTO } from '../../services/admin.service';
import { TicketService } from '../../services/ticket.service';
import { Ticket, TicketStats } from '../../models/ticket.model';
import { AuthService } from '../../auth/service/auth.service';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  // Stats
  userStats: UserStatsDTO | null = null;
  ticketStats: TicketStats | null = null;

  // Data
  recentUsers: UserDTO[] = [];
  recentTickets: Ticket[] = [];
  allTickets: Ticket[] = [];

  // Filters
  ticketStatusFilter = 'ALL';
  ticketPriorityFilter = 'ALL';
  ticketSearch = '';
  userSearch = '';

  // UI
  adminName = 'Admin';
  today = new Date();
  loading = true;
  lastRefresh = new Date();
  activeView: 'overview' | 'tickets' | 'users' = 'overview';

  // Activity feed
  activityFeed: ActivityItem[] = [];

  // Auto-refresh
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private ticketService: TicketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.adminName = this.authService.getUserFullName();
    this.loadData();

    // Auto-refresh every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;

    this.adminService.getUserStats().subscribe({
      next: (stats) => this.userStats = stats,
      error: () => {}
    });

    this.ticketService.getTicketStats().subscribe({
      next: (stats) => this.ticketStats = stats,
      error: () => {}
    });

    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.recentUsers = users
          .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
          .slice(0, 8);
        this.loading = false;
      },
      error: () => this.loading = false
    });

    this.ticketService.getAllTickets().subscribe({
      next: (tickets) => {
        this.allTickets = tickets
          .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        this.recentTickets = this.allTickets.slice(0, 8);
        this.buildActivityFeed(tickets);
      },
      error: () => {}
    });
  }

  refreshData(): void {
    this.lastRefresh = new Date();
    this.loadData();
  }

  // ── View Toggle ──
  setView(view: 'overview' | 'tickets' | 'users'): void {
    this.activeView = view;
  }

  // ── Activity Feed ──
  buildActivityFeed(tickets: Ticket[]): void {
    this.activityFeed = tickets.slice(0, 6).map(t => ({
      type: this.getActivityType(t.status),
      message: `${t.creatorFullName} — ${t.title}`,
      detail: this.getStatusLabel(t.status),
      time: t.createdDate,
      icon: this.getActivityIcon(t.status)
    }));
  }

  getActivityType(status: string): string {
    switch (status) {
      case 'OPEN': return 'created';
      case 'IN_PROGRESS': return 'progress';
      case 'RESOLVED': return 'resolved';
      case 'CLOSED': return 'closed';
      case 'REJECTED': return 'rejected';
      default: return 'default';
    }
  }

  getActivityIcon(status: string): string {
    switch (status) {
      case 'OPEN': return 'fa-plus-circle';
      case 'IN_PROGRESS': return 'fa-spinner';
      case 'RESOLVED': return 'fa-check-circle';
      case 'CLOSED': return 'fa-archive';
      case 'REJECTED': return 'fa-times-circle';
      default: return 'fa-circle';
    }
  }

  // ── Filtered Tickets ──
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

  // ── Filtered Users ──
  get filteredUsers(): UserDTO[] {
    if (!this.userSearch) return this.recentUsers;
    return this.recentUsers.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(this.userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(this.userSearch.toLowerCase())
    );
  }

  // ── Computed values ──
  get activePercent(): number {
    if (!this.userStats || !this.userStats.totalUsers) return 0;
    return Math.round((this.userStats.activeUsers / this.userStats.totalUsers) * 100);
  }

  get resolutionRate(): number {
    if (!this.ticketStats || !this.ticketStats.totalTickets) return 0;
    return Math.round(
      ((this.ticketStats.resolvedTickets + this.ticketStats.closedTickets) / this.ticketStats.totalTickets) * 100
    );
  }

  get totalPriority(): number {
    if (!this.ticketStats) return 1;
    return (
      this.ticketStats.lowPriority +
      this.ticketStats.mediumPriority +
      this.ticketStats.highPriority +
      this.ticketStats.criticalPriority
    ) || 1;
  }

  get openRate(): number {
    if (!this.ticketStats || !this.ticketStats.totalTickets) return 0;
    return Math.round((this.ticketStats.openTickets / this.ticketStats.totalTickets) * 100);
  }

  priorityPercent(value: number): number {
    return Math.round((value / this.totalPriority) * 100);
  }

  rolePercent(count: number): number {
    if (!this.userStats || !this.userStats.totalUsers) return 0;
    return Math.round((count / this.userStats.totalUsers) * 100);
  }

  // ── Export ──
  exportTicketsCSV(): void {
    const headers = 'Titre,Créateur,Priorité,Statut,Date\n';
    const rows = this.filteredTickets.map(t =>
      `"${t.title}","${t.creatorFullName}","${t.priority}","${t.status}","${t.createdDate}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tickets_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  exportUsersCSV(): void {
    const headers = 'Nom,Prénom,Email,Rôle,Statut,Date\n';
    const rows = this.filteredUsers.map(u =>
      `"${u.lastName}","${u.firstName}","${u.email}","${this.getRoleBadge(u.roles)}","${u.enabled ? 'Actif' : 'Inactif'}","${u.createdDate}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  // ── Helpers ──
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
    switch (status) {
      case 'OPEN': return 'status-open';
      case 'IN_PROGRESS': return 'status-progress';
      case 'RESOLVED': return 'status-resolved';
      case 'CLOSED': return 'status-closed';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'OPEN': return 'Ouvert';
      case 'IN_PROGRESS': return 'En cours';
      case 'RESOLVED': return 'Résolu';
      case 'CLOSED': return 'Fermé';
      case 'REJECTED': return 'Rejeté';
      default: return status;
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'LOW': return 'priority-low';
      case 'MEDIUM': return 'priority-medium';
      case 'HIGH': return 'priority-high';
      case 'CRITICAL': return 'priority-critical';
      default: return '';
    }
  }

  trackByTicketId(index: number, ticket: Ticket): number {
  return ticket.id;
}

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'LOW': return 'Basse';
      case 'MEDIUM': return 'Moyenne';
      case 'HIGH': return 'Haute';
      case 'CRITICAL': return 'Critique';
      default: return priority;
    }
  }

  getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
    return d.toLocaleDateString('fr-FR');
  }
}

export interface ActivityItem {
  type: string;
  message: string;
  detail: string;
  time: string;
  icon: string;
}
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/service/auth.service';
import { TicketService } from '../../services/ticket.service';
import { PagePermissionService } from '../../services/page-permission.service';
import { TicketStats } from '../../models/ticket.model';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  isUser = false;
  isIT = false;
  isAdmin = false;
  isCollapsed = false;

  // Compteurs dynamiques
  stats: TicketStats | null = null;
  myTicketCount = 0;
  urgentCount = 0;

  constructor(
    private authService: AuthService,
    private ticketService: TicketService,
    public pagePermissionService: PagePermissionService
  ) {}

  ngOnInit(): void {
    this.isUser = this.authService.isUser();
    this.isIT = this.authService.isBusinessAnalyst();
    this.isAdmin = this.authService.isAdmin();

    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) this.isCollapsed = JSON.parse(saved);

    this.pagePermissionService.loadMyPermissions().subscribe();
    this.loadStats();
  }

  loadStats(): void {
    this.ticketService.getTicketStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.urgentCount = data.highPriority + data.criticalPriority;
      },
      error: () => {}
    });

    this.ticketService.getMyTickets().subscribe({
      next: (data) => this.myTicketCount = data.length,
      error: () => {}
    });
  }

  getMenuTitle(): string {
    if (this.isAdmin) return 'Administration';
    if (this.isIT) return 'Business Analyst';
    if (this.isUser) return 'Espace Utilisateur';
    return 'Menu';
  }

  getRoleIcon(): string {
    if (this.isAdmin) return 'fas fa-shield-alt';
    if (this.isIT) return 'fas fa-laptop-code';
    if (this.isUser) return 'fas fa-user';
    return 'fas fa-user';
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebarCollapsed', JSON.stringify(this.isCollapsed));
  }
}
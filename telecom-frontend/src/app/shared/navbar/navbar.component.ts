import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/service/auth.service';
import { trigger, transition, style, animate } from '@angular/animations';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'ticket' | 'user' | 'alert';
  unread: boolean;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [
    trigger('dropdownAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))
      ])
    ])
  ]
})
export class NavbarComponent implements OnInit {

  userName = '';
  isAdmin = false;
  isIT = false;
  isMetier = false;
  isDropdownOpen = false;
  isNotificationsOpen = false;
  avatarPhoto: string | null = null;

  notificationCount = 3;
  notifications: Notification[] = [
    { id: 1, title: 'Nouveau ticket assigné', message: 'Le ticket #1234 vous a été assigné', time: 'Il y a 5 min', type: 'ticket', unread: true },
    { id: 2, title: 'Nouvel utilisateur', message: 'Un nouvel utilisateur s\'est inscrit', time: 'Il y a 15 min', type: 'user', unread: true },
    { id: 3, title: 'Alerte système', message: 'Mise à jour disponible', time: 'Il y a 1h', type: 'alert', unread: true }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getFullName() || 'Utilisateur';
    this.isAdmin = this.authService.isAdmin();
    this.isIT = this.authService.isBusinessAnalyst();
    this.isMetier = this.authService.isMetier();
    this.loadAvatar();
  }

  loadAvatar(): void {
    try {
      const userId = this.authService.getUserId();
      // Photo depuis l'API
      this.avatarPhoto = `http://localhost:8088/api/v1/users/${userId}/photo`;
    } catch {}
  }

  onAvatarError(): void {
    // Si pas de photo en base, on cache l'image
    this.avatarPhoto = null;
  }

  getUserInitials(): string {
    if (!this.userName) return 'U';
    const names = this.userName.trim().split(' ');
    return names.length >= 2
      ? (names[0][0] + names[1][0]).toUpperCase()
      : this.userName.substring(0, 2).toUpperCase();
  }

  getUserRole(): string {
    if (this.isAdmin) return 'Admin';
    if (this.isIT) return 'Business Analyst';
    if (this.isMetier) return 'Métier';
    return 'Utilisateur';
  }

  getEmail(): string {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || '';
      } catch { return ''; }
    }
    return '';
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    this.isNotificationsOpen = false;
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isDropdownOpen = false;
  }

  closeDropdown(): void { this.isDropdownOpen = false; }
  closeNotifications(): void { this.isNotificationsOpen = false; }
  closeAll(): void { this.isDropdownOpen = false; this.isNotificationsOpen = false; }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.unread = false);
    this.notificationCount = 0;
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notificationCount = this.notifications.filter(n => n.unread).length;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper, .notification-wrapper')) {
      this.closeAll();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToChat(): void { this.router.navigate(['/chat']); }

  goToProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/profile']);
  }
}
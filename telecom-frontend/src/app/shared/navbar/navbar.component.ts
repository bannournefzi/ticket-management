import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/service/auth.service';
import { NotificationService } from '../../services/notification.service';
import { PagePermissionService } from '../../services/page-permission.service';
import { Notification, NOTIFICATION_CONFIG, NotificationType } from '../../models/notification.model';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
export class NavbarComponent implements OnInit, OnDestroy {

  userName = '';
  isAdmin = false;
  isIT = false;
  isUser = false;
  isDropdownOpen = false;
  isNotificationsOpen = false;
  avatarPhoto: string | null = null;

  notifications: Notification[] = [];
  unreadCount = 0;
  notifConfig = NOTIFICATION_CONFIG;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private pagePermissionService: PagePermissionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getFullName() || 'Utilisateur';
    this.isAdmin = this.authService.isAdmin();
    this.isIT = this.authService.isBusinessAnalyst();
    this.isUser = this.authService.isUser();
    this.loadAvatar();
    this.initNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -- Notifications --

  private initNotifications(): void {
    this.notificationService.loadAll();
    this.notificationService.loadUnreadCount();

    this.notificationService.getNotifications$().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => { this.notifications = data; }
    });

    this.notificationService.getUnreadCount$().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (count) => { this.unreadCount = count; }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  removeNotification(id: number): void {
    this.notificationService.delete(id);
  }

  markAsRead(id: number): void {
    this.notificationService.markAsRead(id);
  }

  getNotifIcon(type: NotificationType): string {
    return this.notifConfig[type]?.icon || 'fa-bell';
  }

  getNotifColor(type: NotificationType): string {
    return this.notifConfig[type]?.color || '#6b7280';
  }

  getNotifBg(type: NotificationType): string {
    return this.notifConfig[type]?.bg || '#f3f4f6';
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m} min`;
    if (h < 24) return `${h}h`;
    if (d < 7) return `${d}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  // -- Avatar --

  loadAvatar(): void {
    try {
      const userId = this.authService.getUserId();
      this.avatarPhoto = `http://localhost:8088/api/v1/users/${userId}/photo`;
    } catch {}
  }

  onAvatarError(): void {
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
    if (this.isUser) return 'Utilisateur';
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

  // -- Dropdowns --

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper, .notification-wrapper')) {
      this.closeAll();
    }
  }

  // -- Navigation --

  logout(): void {
    this.authService.logout();
    this.pagePermissionService.clearPermissions();
    this.router.navigate(['/login']);
  }

  goToChat(): void { this.router.navigate(['/chat']); }

  goToProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/profile']);
  }

  sendTestNotification(): void {
    this.notificationService.sendTest();
  }
}

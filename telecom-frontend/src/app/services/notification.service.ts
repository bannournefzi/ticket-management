import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { takeUntil, tap, catchError } from 'rxjs/operators';
import { Notification } from '../models/notification.model';
import { WebsocketService, ConnectionState } from './WebsocketService';
import { environment } from '../environments/environment';
import { Client, IMessage } from '@stomp/stompjs';
import { ToastrService } from 'ngx-toastr';
import { NOTIFICATION_CONFIG } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private baseUrl = `${environment.apiUrl}/notifications`;
  private wsDestination = '/user/queue/notify';
  private destroy$ = new Subject<void>();

  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient,
    private wsService: WebsocketService,
    private toastr: ToastrService
  ) {
    this.initWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -- Observables --

  getNotifications$(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  getUnreadCount$(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  // -- REST Methods --

  loadAll(): void {
    this.http.get<Notification[]>(this.baseUrl).pipe(
      takeUntil(this.destroy$),
      catchError(() => { this.notifications$.next([]); return []; })
    ).subscribe({
      next: (data) => {
        this.notifications$.next(data);
        this.unreadCount$.next(data.filter(n => !n.read).length);
      }
    });
  }

  loadUnreadCount(): void {
    this.http.get<number>(`${this.baseUrl}/count`).pipe(
      takeUntil(this.destroy$),
      catchError(() => { this.unreadCount$.next(0); return []; })
    ).subscribe({
      next: (count) => this.unreadCount$.next(count)
    });
  }

  markAsRead(id: number): void {
    this.http.put<void>(`${this.baseUrl}/${id}/read`, {}).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        const current = this.notifications$.getValue();
        const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
        this.notifications$.next(updated);
        this.unreadCount$.next(updated.filter(n => !n.read).length);
      }
    });
  }

  markAllAsRead(): void {
    this.http.put<void>(`${this.baseUrl}/read-all`, {}).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        const current = this.notifications$.getValue();
        const updated = current.map(n => ({ ...n, read: true }));
        this.notifications$.next(updated);
        this.unreadCount$.next(0);
      }
    });
  }

  delete(id: number): void {
    this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        const current = this.notifications$.getValue();
        const filtered = current.filter(n => n.id !== id);
        this.notifications$.next(filtered);
        this.unreadCount$.next(filtered.filter(n => !n.read).length);
      }
    });
  }

  sendTest(): void {
    this.http.post<void>(`${this.baseUrl}/test`, {}).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => { if (!environment.production) console.log('[Notification] Test sent'); },
      error: (err) => console.error('[Notification] Test failed:', err)
    });
  }

  // -- WebSocket --

  private initWebSocket(): void {
    this.wsService.getConnectionState$().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (state) => {
        if (state === ConnectionState.CONNECTED) {
          this.subscribeToNotifications();
        }
      }
    });
  }

  private subscribeToNotifications(): void {
    if (!environment.production) console.log('[Notification] Subscribing to', this.wsDestination);
    this.wsService.subscribeAsync(this.wsDestination, (message: IMessage) => {
      if (!environment.production) console.log('[Notification] Received raw message:', message.body);
      try {
        const notification: Notification = JSON.parse(message.body);
        if (!environment.production) console.log('[Notification] Parsed:', notification);
        this.onNewNotification(notification);
      } catch (e) {
        console.error('Failed to parse notification:', e);
      }
    }).subscribe({
      next: () => { if (!environment.production) console.log('[Notification] WebSocket subscription active'); },
      error: (err) => console.error('Failed to subscribe to notifications:', err)
    });
  }

  private onNewNotification(notification: Notification): void {
    // Add to list (prepend)
    const current = this.notifications$.getValue();
    this.notifications$.next([notification, ...current]);

    // Update unread count
    if (!notification.read) {
      this.unreadCount$.next(this.unreadCount$.getValue() + 1);
    }

    // Show toast
    this.showNotificationToast(notification);
  }

  private showNotificationToast(notification: Notification): void {
    const config = NOTIFICATION_CONFIG[notification.type];
    if (!config) {
      console.warn('[Notification] Unknown type:', notification.type);
      return;
    }
    if (!environment.production) console.log('[Notification] Showing toast:', notification.title, '-', notification.message);
    const toastrMethod = config.toastr;
    const duration = 4000;

    switch (toastrMethod) {
      case 'success': this.toastr.success(notification.message, notification.title, { timeOut: duration }); break;
      case 'error':   this.toastr.error(notification.message, notification.title, { timeOut: duration }); break;
      case 'warning': this.toastr.warning(notification.message, notification.title, { timeOut: duration }); break;
      default:        this.toastr.info(notification.message, notification.title, { timeOut: duration }); break;
    }
  }
}

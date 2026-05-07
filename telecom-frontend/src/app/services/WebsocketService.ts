import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter, first, timeout } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthService } from '../auth/service/auth.service';


export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

interface QueuedMessage {
  destination: string;
  body: any;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private client: Client | null = null;
  private connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);
  private messageQueue: QueuedMessage[] = [];
  private authSubscription?: Subscription;
  private activeSubscriptions = new Set<StompSubscription>();

  private readonly MAX_QUEUE_SIZE = 100;
  private readonly CONNECTION_TIMEOUT = 5000;

  constructor(private auth: AuthService) {
    this.setupTokenRefreshHandler();
  }

  ngOnDestroy(): void { this.cleanup(); }

  getConnectionState$(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  isConnected$(): Observable<boolean> {
    return new Observable(subscriber => {
      const sub = this.connectionState$.subscribe(state => {
        subscriber.next(state === ConnectionState.CONNECTED);
      });
      return () => sub.unsubscribe();
    });
  }

  isConnected(): boolean {
    return this.connectionState$.value === ConnectionState.CONNECTED;
  }

  connect(): void {
    if (this.client && this.isConnected()) return;
    if (this.connectionState$.value === ConnectionState.CONNECTING) return;

    const token = this.auth.getToken();
    this.connectionState$.next(ConnectionState.CONNECTING);

    this.client = new Client({
   webSocketFactory: () => {
  const SockJSLib = (window as any)['SockJS'];
  const Constructor = SockJSLib?.default ?? SockJSLib;
  return new Constructor(environment.wsEndpoint);
},
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (msg) => { if (!environment.production) console.log('[STOMP]', msg); },

      onConnect: () => {
        this.connectionState$.next(ConnectionState.CONNECTED);
        this.flushMessageQueue();
      },
      onWebSocketClose: () => {
        const wasConnected = this.isConnected();
        this.connectionState$.next(
          wasConnected ? ConnectionState.RECONNECTING : ConnectionState.DISCONNECTED
        );
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message'], frame.body);
        this.connectionState$.next(ConnectionState.ERROR);
      },
      onDisconnect: () => {
        this.connectionState$.next(ConnectionState.DISCONNECTED);
      }
    });

    this.client.activate();
  }

  disconnect(): void {
    if (!this.client) return;
    this.unsubscribeAll();
    this.client.deactivate();
    this.client = null;
    this.connectionState$.next(ConnectionState.DISCONNECTED);
    this.clearMessageQueue();
  }

  subscribe(
    destination: string,
    callback: (msg: IMessage) => void,
    headers?: { [key: string]: string }
  ): StompSubscription {
    if (!this.client || !this.isConnected()) {
      throw new Error('STOMP not connected.');
    }
    const stompSub = this.client.subscribe(destination, callback, headers);
    this.activeSubscriptions.add(stompSub);
    return stompSub;
  }

  subscribeAsync(
    destination: string,
    callback: (msg: IMessage) => void,
    headers?: { [key: string]: string }
  ): Observable<StompSubscription> {
    return new Observable(subscriber => {
      if (!this.client) {
        subscriber.error(new Error('Client not initialized.'));
        return;
      }
      const subscription = this.waitForConnection().subscribe({
        next: () => {
          try {
            const stompSub = this.client!.subscribe(destination, callback, headers);
            this.activeSubscriptions.add(stompSub);
            subscriber.next(stompSub);
            subscriber.complete();
          } catch (error) { subscriber.error(error); }
        },
        error: (err) => subscriber.error(err)
      });
      return () => subscription.unsubscribe();
    });
  }

  publish<T = any>(destination: string, body: T, headers?: { [key: string]: string }): void {
    if (!this.client) throw new Error('Client not initialized.');
    if (!this.isConnected()) { this.queueMessage(destination, body); return; }
    this.sendMessage(destination, body, headers);
  }

  publishAsync<T = any>(destination: string, body: T, headers?: { [key: string]: string }): Observable<void> {
    return new Observable(subscriber => {
      if (!this.client) { subscriber.error(new Error('Client not initialized.')); return; }
      const subscription = this.waitForConnection().subscribe({
        next: () => {
          try { this.sendMessage(destination, body, headers); subscriber.next(); subscriber.complete(); }
          catch (error) { subscriber.error(error); }
        },
        error: (err) => subscriber.error(err)
      });
      return () => subscription.unsubscribe();
    });
  }

  unsubscribeAll(): void {
    this.activeSubscriptions.forEach(sub => { try { sub.unsubscribe(); } catch {} });
    this.activeSubscriptions.clear();
  }

  private waitForConnection(): Observable<void> {
    return new Observable(subscriber => {
      if (this.isConnected()) { subscriber.next(); subscriber.complete(); return; }
      const sub = this.connectionState$.pipe(
        filter(state => state === ConnectionState.CONNECTED),
        first(),
        timeout(this.CONNECTION_TIMEOUT)
      ).subscribe({
        next: () => { subscriber.next(); subscriber.complete(); },
        error: (err) => subscriber.error(
          err.name === 'TimeoutError'
            ? new Error('Connection timeout after 5s.')
            : err
        )
      });
      return () => sub.unsubscribe();
    });
  }

  private setupTokenRefreshHandler(): void {
    const authService = this.auth as any;
    if (authService.token$?.subscribe) {
      this.authSubscription = authService.token$.subscribe((token: string | null) => {
        if (this.isConnected() && token) this.reconnect();
      });
    }
  }

  private reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 100);
  }

  private sendMessage<T>(destination: string, body: T, headers?: { [key: string]: string }): void {
    this.client!.publish({ destination, body: JSON.stringify(body), headers: headers || {} });
  }

  private queueMessage<T>(destination: string, body: T): void {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) this.messageQueue.shift();
    this.messageQueue.push({ destination, body, timestamp: Date.now() });
  }

  private flushMessageQueue(): void {
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    messages.forEach(({ destination, body }) => {
      try { this.sendMessage(destination, body); }
      catch { this.queueMessage(destination, body); }
    });
  }

  private clearMessageQueue(): void { this.messageQueue = []; }

  private cleanup(): void {
    this.authSubscription?.unsubscribe();
    this.disconnect();
    this.connectionState$.complete();
  }
}
import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
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

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Get current connection state as observable
   */
  getConnectionState$(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  /**
   * Check if currently connected
   */
  isConnected$(): Observable<boolean> {
    return new Observable(subscriber => {
      const sub = this.connectionState$.subscribe(state => {
        subscriber.next(state === ConnectionState.CONNECTED);
      });
      return () => sub.unsubscribe();
    });
  }

  /**
   * Get current connection state value
   */
  isConnected(): boolean {
    return this.connectionState$.value === ConnectionState.CONNECTED;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.client && this.isConnected()) {
      console.log('Already connected');
      return;
    }

    if (this.connectionState$.value === ConnectionState.CONNECTING) {
      console.log('Connection already in progress');
      return;
    }

    const token = this.auth.getToken();
    this.connectionState$.next(ConnectionState.CONNECTING);

    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsEndpoint),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (msg) => {
        if (environment.production) return;
        console.log('[STOMP]', msg);
      },

      onConnect: () => {
        console.log('✅ WebSocket connected!');
        this.connectionState$.next(ConnectionState.CONNECTED);
        this.flushMessageQueue();
      },

      onWebSocketClose: () => {
        console.log('❌ WebSocket closed');
        const wasConnected = this.isConnected();
        this.connectionState$.next(
          wasConnected ? ConnectionState.RECONNECTING : ConnectionState.DISCONNECTED
        );
      },

      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame.headers['message'], frame.body);
        this.connectionState$.next(ConnectionState.ERROR);
      },

      onDisconnect: () => {
        console.log('Disconnected from WebSocket');
        this.connectionState$.next(ConnectionState.DISCONNECTED);
      },
    });

    this.client.activate();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (!this.client) return;

    console.log('Disconnecting WebSocket...');
    this.unsubscribeAll();
    this.client.deactivate();
    this.client = null;
    this.connectionState$.next(ConnectionState.DISCONNECTED);
    this.clearMessageQueue();
  }

  /**
   * Subscribe to a destination (throws if not connected - original behavior)
   * Use this for immediate subscriptions when you know you're connected
   */
  subscribe(
    destination: string,
    callback: (msg: IMessage) => void,
    headers?: { [key: string]: string }
  ): StompSubscription {
    if (!this.client || !this.isConnected()) {
      throw new Error('STOMP not connected. Call connect() first or use subscribeAsync().');
    }

    const stompSub = this.client.subscribe(destination, callback, headers);
    this.activeSubscriptions.add(stompSub);
    return stompSub;
  }

  /**
   * Subscribe to a destination and wait for connection if needed
   * Returns an Observable that emits the subscription once connected
   */
  subscribeAsync(
    destination: string,
    callback: (msg: IMessage) => void,
    headers?: { [key: string]: string }
  ): Observable<StompSubscription> {
    return new Observable(subscriber => {
      if (!this.client) {
        subscriber.error(new Error('Client not initialized. Call connect() first.'));
        return;
      }

      const subscription = this.waitForConnection().subscribe({
        next: () => {
          try {
            const stompSub = this.client!.subscribe(destination, callback, headers);
            this.activeSubscriptions.add(stompSub);
            subscriber.next(stompSub);
            subscriber.complete();
          } catch (error) {
            subscriber.error(error);
          }
        },
        error: (err) => subscriber.error(err)
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Publish a message to a destination
   * If not connected, queues the message
   */
  publish<T = any>(
    destination: string,
    body: T,
    headers?: { [key: string]: string }
  ): void {
    if (!this.client) {
      throw new Error('Client not initialized. Call connect() first.');
    }

    if (!this.isConnected()) {
      this.queueMessage(destination, body);
      return;
    }

    this.sendMessage(destination, body, headers);
  }

  /**
   * Publish a message and wait for connection if needed
   */
  publishAsync<T = any>(
    destination: string,
    body: T,
    headers?: { [key: string]: string }
  ): Observable<void> {
    return new Observable(subscriber => {
      if (!this.client) {
        subscriber.error(new Error('Client not initialized. Call connect() first.'));
        return;
      }

      const subscription = this.waitForConnection().subscribe({
        next: () => {
          try {
            this.sendMessage(destination, body, headers);
            subscriber.next();
            subscriber.complete();
          } catch (error) {
            subscriber.error(error);
          }
        },
        error: (err) => subscriber.error(err)
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Unsubscribe all active subscriptions
   */
  unsubscribeAll(): void {
    this.activeSubscriptions.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    this.activeSubscriptions.clear();
  }

  /**
   * Wait for connection to be established
   */
  private waitForConnection(): Observable<void> {
    return new Observable(subscriber => {
      if (this.isConnected()) {
        subscriber.next();
        subscriber.complete();
        return;
      }

      const sub = this.connectionState$.pipe(
        filter(state => state === ConnectionState.CONNECTED),
        first(),
        timeout(this.CONNECTION_TIMEOUT)
      ).subscribe({
        next: () => {
          subscriber.next();
          subscriber.complete();
        },
        error: (err) => {
          const timeoutError = new Error(
            'Connection timeout. WebSocket failed to connect within 5 seconds.'
          );
          subscriber.error(err.name === 'TimeoutError' ? timeoutError : err);
        }
      });

      return () => sub.unsubscribe();
    });
  }

  /**
   * Setup token refresh handler to reconnect with new token
   * Only sets up if AuthService has a token$ observable
   */
  private setupTokenRefreshHandler(): void {
    // Check if AuthService has token$ observable
    const authService = this.auth as any;
    if (authService.token$ && typeof authService.token$.subscribe === 'function') {
      this.authSubscription = authService.token$.subscribe((token: string | null) => {
        if (this.isConnected() && token) {
          console.log('Token refreshed, reconnecting WebSocket...');
          this.reconnect();
        }
      });
    }
  }

  /**
   * Reconnect to WebSocket
   */
  private reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 100);
  }

  /**
   * Send a message immediately
   */
  private sendMessage<T>(
    destination: string,
    body: T,
    headers?: { [key: string]: string }
  ): void {
    try {
      this.client!.publish({
        destination,
        body: JSON.stringify(body),
        headers: headers || {}
      });
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  /**
   * Queue a message for later delivery
   */
  private queueMessage<T>(destination: string, body: T): void {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('Message queue full, removing oldest message');
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      destination,
      body,
      timestamp: Date.now()
    });

    console.log(`Message queued. Queue size: ${this.messageQueue.length}`);
  }

  /**
   * Flush queued messages once connected
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`Flushing ${this.messageQueue.length} queued messages...`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(({ destination, body }) => {
      try {
        this.sendMessage(destination, body);
      } catch (error) {
        console.error('Error flushing message:', error);
        // Re-queue failed messages
        this.queueMessage(destination, body);
      }
    });
  }

  /**
   * Clear all queued messages
   */
  private clearMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      console.log(`Clearing ${this.messageQueue.length} queued messages`);
      this.messageQueue = [];
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.authSubscription?.unsubscribe();
    this.disconnect();
    this.connectionState$.complete();
  }
}
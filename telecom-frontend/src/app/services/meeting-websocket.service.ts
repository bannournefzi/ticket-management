import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { WebsocketService } from './WebsocketService';

@Injectable({ providedIn: 'root' })
export class MeetingWebSocketService implements OnDestroy {

  private meetingInvite$ = new Subject<any>();

  constructor(private wsService: WebsocketService) {}

  connect(userId: number): void {
    if (!this.wsService.isConnected()) {
      this.wsService.connect();
    }

    this.wsService.subscribeAsync(
      `/topic/user/${userId}/meeting`,
      (msg) => {
        this.meetingInvite$.next(JSON.parse(msg.body));
      }
    ).subscribe({
      error: (err) => console.error('Meeting WS subscribe error:', err)
    });
  }

  getMeetingInvites(): Observable<any> {
    return this.meetingInvite$.asObservable();
  }

  disconnect(): void {
    this.meetingInvite$.complete();
  }

  ngOnDestroy(): void {
    this.meetingInvite$.complete();
  }
}
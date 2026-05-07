import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MeetingWebSocketService } from '../../services/meeting-websocket.service';
import { MeetingService } from '../../services/meeting.service';
import { MeetingResponse } from '../../models/meeting.model';
import { AuthService } from '../../auth/service/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-meetings',
  templateUrl: './user-meetings.component.html',
  styleUrls: ['./user-meetings.component.scss']
})
export class UserMeetingsComponent implements OnInit, OnDestroy {

  meetings: MeetingResponse[] = [];
  meetingCode = '';
  joinError = '';
  liveAlert: string | null = null;
  private wsSub!: Subscription;

  constructor(
    private meetingService: MeetingService,
    private wsService: MeetingWebSocketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMeetings();
    const userId = this.authService.getUserId();
    this.wsService.connect(userId);
    this.wsSub = this.wsService.getMeetingInvites().subscribe(notif => {
      this.liveAlert = notif.message;
      this.loadMeetings(); // rafraîchit la liste
      setTimeout(() => this.liveAlert = null, 8000);
    });
  }

  loadMeetings(): void {
    this.meetingService.getCalendar('USER').subscribe(data => {
      this.meetings = data;
    });
  }

 joinByCode(): void {
  const code = this.meetingCode.trim(); // ← trim() supprime les espaces
  if (code.length < 8) return;
  this.joinError = '';
  this.meetingService.joinMeeting(code).subscribe({
    next: (m) => this.router.navigate(['/meetings/room', m.meetingCode]),
    error: () => this.joinError = 'Code invalide ou réunion annulée.'
  });
}

  joinDirect(code: string): void {
    this.router.navigate(['/meetings/room', code]);
  }

  get pending(): MeetingResponse[] {
    return this.meetings.filter(m => m.status === 'PENDING');
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge-pending', ACTIVE: 'badge-active',
      COMPLETED: 'badge-done', CANCELLED: 'badge-cancelled'
    };
    return map[status] ?? '';
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsService.disconnect();
  }
}
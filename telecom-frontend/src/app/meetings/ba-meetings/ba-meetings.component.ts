import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MeetingService } from '../../services/meeting.service';
import { MeetingResponse, MeetingRequest } from '../../models/meeting.model';
import { AuthService } from '../../auth/service/auth.service';
import { UserSearchResponse } from 'src/app/models/user-search.model';
@Component({
  selector: 'app-ba-meetings',
  templateUrl: './ba-meetings.component.html',
  styleUrls: ['./ba-meetings.component.scss']
})
export class BaMeetingsComponent implements OnInit {
selectedUser: UserSearchResponse | null = null;

  meetings: MeetingResponse[] = [];
  showCreateModal = false;
  loading = false;

  form: MeetingRequest = {
  title: '',
  description: '',
  userId: 0,
  scheduledAt: '',
  durationMinutes: 30,
  type: 'SCHEDULED'
};

onUserSelected(user: UserSearchResponse): void {
  this.selectedUser = user;
  this.form.userId = user?.id ?? 0;
}


  constructor(
    private meetingService: MeetingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMeetings();
  }

  loadMeetings(): void {
    this.meetingService.getCalendar('BA').subscribe(data => {
      this.meetings = data;
    });
  }

  createScheduled(): void {
  if (!this.selectedUser) {
    alert('Veuillez sélectionner un utilisateur.');
    return;
  }
  this.loading = true;
  this.meetingService.createScheduled(this.form).subscribe({
    next: () => {
      this.showCreateModal = false;
      this.loading = false;
      this.selectedUser = null;
      this.loadMeetings();
    },
    error: () => { this.loading = false; }
  });
}

  launchInstant(userId: number, ticketId: number): void {
    this.meetingService.createInstant(userId, ticketId).subscribe(meeting => {
      this.router.navigate(['/meetings/room', meeting.meetingCode]);
    });
  }

  joinRoom(code: string): void {
    this.router.navigate(['/meetings/room', code]);
  }

  cancel(id: number): void {
    if (!confirm('Annuler cette réunion ?')) return;
    this.meetingService.cancelMeeting(id).subscribe(() => this.loadMeetings());
  }

  get upcoming(): MeetingResponse[] {
    return this.meetings.filter(m => m.status === 'PENDING');
  }

  get active(): MeetingResponse[] {
    return this.meetings.filter(m => m.status === 'ACTIVE');
  }

  get completed(): MeetingResponse[] {
    return this.meetings.filter(m => m.status === 'COMPLETED');
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge-pending',
      ACTIVE: 'badge-active',
      COMPLETED: 'badge-done',
      CANCELLED: 'badge-cancelled'
    };
    return map[status] ?? '';
  }
}
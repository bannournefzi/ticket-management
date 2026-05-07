import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MeetingService } from '../../services/meeting.service';
import { MeetingResponse } from '../../models/meeting.model';

type CalView = 'week' | 'day' | 'agenda';

@Component({
  selector: 'app-metier-calendar',
  templateUrl: './metier-calendar.component.html',
  styleUrls: ['./metier-calendar.component.scss']
})
export class MetierCalendarComponent implements OnInit {

  meetings: MeetingResponse[] = [];
  currentView: CalView = 'week';
  currentDate = new Date();
  loading = true;

  readonly hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8h → 17h
  readonly weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

  constructor(
    private meetingService: MeetingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.meetingService.getCalendar('USER').subscribe({
      next: (data) => { this.meetings = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get weekDates(): Date[] {
    const monday = this.getMonday(this.currentDate);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  }

  prevWeek(): void {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() - 7);
    this.currentDate = d;
  }

  nextWeek(): void {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + 7);
    this.currentDate = d;
  }

  goToday(): void { this.currentDate = new Date(); }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getMeetingsForSlot(date: Date, hour: number): MeetingResponse[] {
    return this.meetings.filter(m => {
      if (!m.scheduledAt) return false;
      const d = new Date(m.scheduledAt);
      return d.toDateString() === date.toDateString() && d.getHours() === hour;
    });
  }

  getAgendaMeetings(): MeetingResponse[] {
    return [...this.meetings].sort((a, b) =>
      new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()
    );
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'ev-amber', ACTIVE: 'ev-green',
      COMPLETED: 'ev-gray', CANCELLED: 'ev-red'
    };
    return map[status] ?? 'ev-blue';
  }

  joinMeeting(code: string): void {
    this.router.navigate(['/meetings/room', code]);
  }

  get weekLabel(): string {
    const dates = this.weekDates;
    const start = dates[0];
    const end   = dates[4];
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
}
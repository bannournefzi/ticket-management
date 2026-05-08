import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

import { Router } from '@angular/router';
import { MeetingService } from '../../services/meeting.service';
import { MeetingResponse } from '../../models/meeting.model';

type CalView = 'week' | 'day' | 'agenda';

interface WeekDay {
  label: string;
  date: Date;
}

@Component({
  selector: 'app-metier-calendar',
  templateUrl: './metier-calendar.component.html',
  styleUrls: ['./metier-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetierCalendarComponent implements OnInit {

  meetings: MeetingResponse[] = [];

  currentView: CalView = 'week';

  currentDate = new Date();

  loading = true;

  readonly hours = Array.from({ length: 10 }, (_, i) => i + 8);

  weekDays: WeekDay[] = [];

  slotMeetings: Record<string, MeetingResponse[]> = {};

  constructor(
    private meetingService: MeetingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateWeekDays();

    this.meetingService.getCalendar('USER').subscribe({
      next: (data) => {

        this.meetings = data || [];

        this.prepareSlotMeetings();

        this.loading = false;
      },

      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  private prepareSlotMeetings(): void {

    this.slotMeetings = {};

    for (const meeting of this.meetings) {

      if (!meeting.scheduledAt) continue;

      const date = new Date(meeting.scheduledAt);

      const key =
        `${date.toDateString()}-${date.getHours()}`;

      if (!this.slotMeetings[key]) {
        this.slotMeetings[key] = [];
      }

      this.slotMeetings[key].push(meeting);
    }
  }

  getMeetingsForSlot(
    date: Date,
    hour: number
  ): MeetingResponse[] {

    const key =
      `${date.toDateString()}-${hour}`;

    return this.slotMeetings[key] || [];
  }

  private updateWeekDays(): void {

    const monday = this.getMonday(this.currentDate);

    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

    this.weekDays = Array.from(
      { length: 5 },
      (_, i) => {

        const date = new Date(monday);

        date.setDate(monday.getDate() + i);

        return {
          label: labels[i],
          date
        };
      }
    );
  }

  private getMonday(date: Date): Date {

    const d = new Date(date);

    const day = d.getDay();

    const diff =
      d.getDate() - day + (day === 0 ? -6 : 1);

    d.setDate(diff);

    return d;
  }

  prevWeek(): void {

    const d = new Date(this.currentDate);

    d.setDate(d.getDate() - 7);

    this.currentDate = d;

    this.updateWeekDays();
  }

  nextWeek(): void {

    const d = new Date(this.currentDate);

    d.setDate(d.getDate() + 7);

    this.currentDate = d;

    this.updateWeekDays();
  }

  goToday(): void {

    this.currentDate = new Date();

    this.updateWeekDays();
  }

  isToday(date: Date): boolean {

    return (
      date.toDateString() ===
      new Date().toDateString()
    );
  }

  getAgendaMeetings(): MeetingResponse[] {

    return [...this.meetings].sort(
      (a, b) =>
        new Date(a.scheduledAt!).getTime() -
        new Date(b.scheduledAt!).getTime()
    );
  }

  statusClass(status: string): string {

    const map: Record<string, string> = {

      PENDING: 'ev-amber',

      ACTIVE: 'ev-green',

      COMPLETED: 'ev-gray',

      CANCELLED: 'ev-red'
    };

    return map[status] || 'ev-blue';
  }

  joinMeeting(code: string): void {

    this.router.navigate([
      '/meetings/room',
      code
    ]);
  }

  trackByMeeting(
    index: number,
    item: MeetingResponse
  ): number {

    return item.id!;
  }

  get weekLabel(): string {

    const start = this.weekDays[0]?.date;

    const end = this.weekDays[4]?.date;

    if (!start || !end) return '';

    return `
      ${start.toLocaleDateString(
        'fr-FR',
        {
          day: 'numeric',
          month: 'long'
        }
      )}
      —
      ${end.toLocaleDateString(
        'fr-FR',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }
      )}
    `;
  }
}
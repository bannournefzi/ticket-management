import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MeetingService } from '../../services/meeting.service';
import { MeetingResponse } from '../../models/meeting.model';
import { AuthService } from '../../auth/service/auth.service';

declare const JitsiMeetExternalAPI: any;

@Component({
  selector: 'app-meeting-room',
  templateUrl: './meeting-room.component.html',
  styleUrls: ['./meeting-room.component.scss']
})
export class MeetingRoomComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('jitsiContainer', { static: true }) jitsiContainer!: ElementRef;

  meeting: MeetingResponse | null = null;
  loading = true;
  error = '';
  private jitsiApi: any;
  private pendingMeeting: MeetingResponse | null = null;

  constructor(
    private route: ActivatedRoute,
    private meetingService: MeetingService,
    public router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.meetingService.joinMeeting(code).subscribe({
      next: (meeting) => {
        this.meeting = meeting;
        this.loading = false;
        this.pendingMeeting = meeting;
        this.tryLoadJitsi();
      },
      error: () => {
        this.error = 'Code invalide ou réunion annulée.';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.tryLoadJitsi();
  }

  private tryLoadJitsi(): void {
    if (this.pendingMeeting && this.jitsiContainer?.nativeElement) {
      this.loadJitsi(this.pendingMeeting);
      this.pendingMeeting = null;
    }
  }

  private loadJitsi(meeting: MeetingResponse): void {
    this.jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName: `itsm-${meeting.meetingCode}`,
      parentNode: this.jitsiContainer.nativeElement,
      width: '100%',
      height: '100%',
      userInfo: {
        displayName: this.authService.getFullName(),
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        disableDeepLinking: true
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop',
          'chat', 'participants-pane', 'fullscreen',
          'hangup', 'tileview'
        ],
        SHOW_JITSI_WATERMARK: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Participant'
      }
    });

    this.jitsiApi.addEventListener('readyToClose', () => {
      this.meetingService.endMeeting(meeting.id).subscribe(() => {
        this.router.navigate(['/meetings']);
      });
    });
  }

  ngOnDestroy(): void {
    this.jitsiApi?.dispose();
  }
}
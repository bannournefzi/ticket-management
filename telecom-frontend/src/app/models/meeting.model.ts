export interface MeetingRequest {
  title: string;
  description?: string;
  userId: number;
  ticketId?: number;
  scheduledAt?: string;
  durationMinutes?: number;
  type: 'INSTANT' | 'SCHEDULED';
}

export interface MeetingResponse {
  id: number;
  meetingCode: string;
  title: string;
  description?: string;
  jitsiRoomUrl: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  type: 'INSTANT' | 'SCHEDULED';
  scheduledAt?: string;
  durationMinutes?: number;
  baId: number;
  userId: number;
  ticketId?: number;
}
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MeetingRequest, MeetingResponse } from '../models/meeting.model';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class MeetingService {

  private api = `${environment.apiUrl}/meetings`;

  constructor(private http: HttpClient) {}

  createScheduled(req: MeetingRequest): Observable<MeetingResponse> {
    return this.http.post<MeetingResponse>(`${this.api}/scheduled`, req);
  }

  createInstant(userId: number, ticketId: number): Observable<MeetingResponse> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('ticketId', ticketId);
    return this.http.post<MeetingResponse>(`${this.api}/instant`, null, { params });
  }

  joinMeeting(code: string): Observable<MeetingResponse> {
    return this.http.get<MeetingResponse>(`${this.api}/join/${code}`);
  }

  endMeeting(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/end`, null);
  }

  cancelMeeting(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/cancel`, null);
  }

  getCalendar(role: string): Observable<MeetingResponse[]> {
    const params = new HttpParams().set('role', role);
    return this.http.get<MeetingResponse[]>(`${this.api}/calendar`, { params });
  }

  
}
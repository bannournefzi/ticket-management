import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface UserSession {
  id: number;
  jwtId: string;
  ipAddress: string;
  deviceOs: string;
  browser: string;
  loginAt: string;
  lastActivityAt: string;
  valid: boolean;
  userFullName?: string; // <--- Added this to map to the new DTO
  userEmail?: string;    // <--- Added this to map to the new DTO
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = `${environment.apiUrl}/sessions`; 

  constructor(private http: HttpClient) {}

  getMySessions(): Observable<UserSession[]> {
    return this.http.get<UserSession[]>(`${this.apiUrl}/my-sessions`);
  }

  revokeSession(sessionId: number): Observable<any> {
    // ResponseType 'text' because the backend returns a simple String message
    return this.http.post(`${this.apiUrl}/revoke/${sessionId}`, {}, { responseType: 'text' });
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface VoiceToTicketResponse {
  title: string;
  description: string;
  priority: string;
  category: string;
  departement: string | null;
  originalText: string;
  confidence: number;
  tags: string[]; 
}

@Injectable({
  providedIn: 'root'
})
export class AiService {

  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  voiceToTicket(text: string, language: string = 'fr'): Observable<VoiceToTicketResponse> {
    return this.http.post<VoiceToTicketResponse>(`${this.apiUrl}/voice-to-ticket`, {
      text,
      language
    });
  }

  healthCheck(): Observable<string> {
    return this.http.get(`${this.apiUrl}/health`, { responseType: 'text' });
  }
}
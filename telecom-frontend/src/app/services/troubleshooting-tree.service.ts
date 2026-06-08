import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface TicketData {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
}

export interface AiAgentResponse {
  reply: string;
  action: 'CONTINUE' | 'RESOLVED' | 'CREATE_TICKET';
  options?: string[];
  ticketData?: TicketData;
}

@Injectable({
  providedIn: 'root'
})
export class TroubleshootingTreeService {
  private apiUrl = `${environment.apiUrl}/troubleshooting-trees`;

  constructor(private http: HttpClient) {}

  // L'IA nous répond maintenant avec un texte et une action !
  analyzeProblem(userDescription: string): Observable<AiAgentResponse> {
    return this.http.post<AiAgentResponse>(`${this.apiUrl}/analyze-problem`, { userDescription });
  }
}
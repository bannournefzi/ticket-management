import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiAgentResponse {
  reply: string;
  action: 'CONTINUE' | 'RESOLVED' | 'CREATE_TICKET';
  options?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TroubleshootingTreeService {
  private apiUrl = 'http://localhost:8088/api/v1/troubleshooting-trees';

  constructor(private http: HttpClient) {}

  // L'IA nous répond maintenant avec un texte et une action !
  analyzeProblem(userDescription: string): Observable<AiAgentResponse> {
    return this.http.post<AiAgentResponse>(`${this.apiUrl}/analyze-problem`, { userDescription });
  }
}
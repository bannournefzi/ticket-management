import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TicketComment, CreateCommentRequest } from '../models/TicketComment';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private baseUrl = `${environment.apiUrl}/tickets`;

  constructor(private http: HttpClient) {}

  getComments(ticketId: number, source?: 'INTERNAL' | 'MANTIS'): Observable<TicketComment[]> {
    let params = '';
    if (source) {
      params = `?source=${source}`;
    }
    return this.http.get<TicketComment[]>(`${this.baseUrl}/${ticketId}/comments${params}`);
  }

  addComment(ticketId: number, request: CreateCommentRequest): Observable<TicketComment> {
    return this.http.post<TicketComment>(`${this.baseUrl}/${ticketId}/comments`, request);
  }

  deleteComment(ticketId: number, commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${ticketId}/comments/${commentId}`);
  }

  getCommentCount(ticketId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/${ticketId}/comments/count`);
  }
}
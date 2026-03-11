import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TicketComment, CreateCommentRequest } from '../models/TicketComment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private baseUrl = 'http://localhost:8088/api/v1/tickets';

  constructor(private http: HttpClient) {}

  getComments(ticketId: number): Observable<TicketComment[]> {
    return this.http.get<TicketComment[]>(`${this.baseUrl}/${ticketId}/comments`);
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
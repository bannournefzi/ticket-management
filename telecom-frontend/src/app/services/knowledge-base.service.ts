import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KnowledgeBaseArticle } from '../models/knowledge-base.model';

@Injectable({ providedIn: 'root' })
export class KnowledgeBaseService {
  private baseUrl = 'http://localhost:8088/api/v1/knowledge-base';

  constructor(private http: HttpClient) {}

  getAllArticles(): Observable<KnowledgeBaseArticle[]> {
    return this.http.get<KnowledgeBaseArticle[]>(`${this.baseUrl}`);
  }

  getArticleById(id: number): Observable<KnowledgeBaseArticle> {
    return this.http.get<KnowledgeBaseArticle>(`${this.baseUrl}/${id}`);
  }

  searchArticles(query: string): Observable<KnowledgeBaseArticle[]> {
    return this.http.get<KnowledgeBaseArticle[]>(`${this.baseUrl}/search?query=${encodeURIComponent(query)}`);
  }

  createFromTicket(ticketId: number, request: { title: string; description: string; solution: string }): Observable<KnowledgeBaseArticle> {
    return this.http.post<KnowledgeBaseArticle>(`${this.baseUrl}/from-ticket/${ticketId}`, request);
  }

  deleteArticle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
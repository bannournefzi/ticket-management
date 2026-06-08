import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KnowledgeBaseArticle, CreateArticleRequest, UpdateArticleRequest, RateArticleRequest } from '../models/knowledge-base.model';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class KnowledgeBaseService {
  private baseUrl = `${environment.apiUrl}/knowledge-base`;

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

  getArticlesByCategory(category: string): Observable<KnowledgeBaseArticle[]> {
    return this.http.get<KnowledgeBaseArticle[]>(`${this.baseUrl}/category/${encodeURIComponent(category)}`);
  }

  createFromTicket(ticketId: number, request: CreateArticleRequest): Observable<KnowledgeBaseArticle> {
    return this.http.post<KnowledgeBaseArticle>(`${this.baseUrl}/from-ticket/${ticketId}`, request);
  }

  updateArticle(id: number, request: UpdateArticleRequest): Observable<KnowledgeBaseArticle> {
    return this.http.put<KnowledgeBaseArticle>(`${this.baseUrl}/${id}`, request);
  }

  rateArticle(id: number, request: RateArticleRequest): Observable<KnowledgeBaseArticle> {
    return this.http.patch<KnowledgeBaseArticle>(`${this.baseUrl}/${id}/rate`, request);
  }

  deleteArticle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

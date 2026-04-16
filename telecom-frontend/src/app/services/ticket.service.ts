import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Ticket,
  CreateTicketRequest,
  TicketStats,
  TicketHistory,
  TicketPriority,
  TicketStatus,
  TicketCategory,
  PageResponse
} from '../models/ticket.model';
import { map } from 'rxjs/operators';     
@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private baseUrl = 'http://localhost:8088/api/v1/tickets';

  constructor(private http: HttpClient) {}

  

  // ══════════════════════════════════════════
  //  CRÉATION
  // ══════════════════════════════════════════

  createTicket(request: CreateTicketRequest): Observable<Ticket> {
    return this.http.post<Ticket>(this.baseUrl, request);
  }

  // ══════════════════════════════════════════
  //  LECTURE — PAGINÉE
  // ══════════════════════════════════════════

  getAllTicketsPaged(page = 0, size = 20, sort = 'createdDate,desc'): Observable<PageResponse<Ticket>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);
    return this.http.get<PageResponse<Ticket>>(this.baseUrl, { params });
  }

  getMyTicketsPaged(page = 0, size = 20): Observable<PageResponse<Ticket>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'createdDate,desc');
    return this.http.get<PageResponse<Ticket>>(`${this.baseUrl}/my-tickets`, { params });
  }

  getAllTickets(): Observable<Ticket[]> {
  return this.http.get<PageResponse<Ticket>>(this.baseUrl, {
    params: new HttpParams()
      .set('page', '0')
      .set('size', '1000')
      .set('sort', 'createdDate,desc')
  }).pipe(
    map(page => page.content)
  );
}

  // ══════════════════════════════════════════
  //  LECTURE — LISTES (compatibilité)
  // ══════════════════════════════════════════

  getMyTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}/my-tickets/list`);
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/${id}`);
  }

  getTicketsByCreator(creatorId: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}/creator/${creatorId}`);
  }

  getTicketsByAssignee(assigneeId: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}/assignee/${assigneeId}`);
  }

  // ══════════════════════════════════════════
  //  ACTIONS
  // ══════════════════════════════════════════

  assignTicket(ticketId: number, assigneeId: number): Observable<Ticket> {
    return this.http.patch<Ticket>(
      `${this.baseUrl}/${ticketId}/assign/${assigneeId}`, {});
  }

  updateTicketStatus(ticketId: number, status: TicketStatus, comment?: string): Observable<Ticket> {
    let params = new HttpParams().set('status', status);
    if (comment) {
      params = params.set('comment', comment);
    }
    return this.http.patch<Ticket>(
      `${this.baseUrl}/${ticketId}/status`, {}, { params });
  }

  updateTicket(id: number, request: CreateTicketRequest): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.baseUrl}/${id}`, request);
  }

  deleteTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ══════════════════════════════════════════
  //  FILTRAGE AVANCÉ
  // ══════════════════════════════════════════

  filterTickets(filters: {
    status?: TicketStatus;
    priority?: TicketPriority;
    departement?: string;
    category?: TicketCategory;
    search?: string;
    assigneeId?: number;
    unassignedOnly?: boolean;
    slaBreached?: boolean;
    page?: number;
    size?: number;
  }): Observable<PageResponse<Ticket>> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.departement) params = params.set('departement', filters.departement);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.assigneeId) params = params.set('assigneeId', filters.assigneeId.toString());
    if (filters.unassignedOnly) params = params.set('unassignedOnly', 'true');
    if (filters.slaBreached) params = params.set('slaBreached', 'true');

    params = params.set('page', (filters.page ?? 0).toString());
    params = params.set('size', (filters.size ?? 20).toString());
    params = params.set('sort', 'createdDate,desc');

    return this.http.get<PageResponse<Ticket>>(`${this.baseUrl}/filter`, { params });
  }

  // Ancien filtrage simple (compatibilité)
  filterTicketsSimple(status?: TicketStatus, priority?: TicketPriority, departement?: string): Observable<Ticket[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (priority) params = params.set('priority', priority);
    if (departement) params = params.set('departement', departement);
    return this.http.get<Ticket[]>(`${this.baseUrl}/filter/simple`, { params });
  }

  // ══════════════════════════════════════════
  //  STATISTIQUES & HISTORIQUE (NOUVEAU)
  // ══════════════════════════════════════════

  getTicketStats(): Observable<TicketStats> {
    return this.http.get<TicketStats>(`${this.baseUrl}/stats`);
  }

  getTicketHistory(ticketId: number): Observable<TicketHistory[]> {
    return this.http.get<TicketHistory[]>(`${this.baseUrl}/${ticketId}/history`);
  }

  getAllowedTransitions(ticketId: number): Observable<TicketStatus[]> {
    return this.http.get<TicketStatus[]>(`${this.baseUrl}/${ticketId}/transitions`);
  }

  pushToMantis(ticketId: number): Observable<Ticket> {
  return this.http.patch<Ticket>(`${this.baseUrl}/${ticketId}/push-to-mantis`, {});
}

uploadAttachments(ticketId: number, files: File[]): Observable<void> {
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  return this.http.post<void>(`${this.baseUrl}/${ticketId}/attachments`, fd);
}

downloadAttachment(ticketId: number, attachmentId: number): Observable<Blob> {
  return this.http.get(`${this.baseUrl}/${ticketId}/attachments/${attachmentId}`, {
    responseType: 'blob'
  });
}
}
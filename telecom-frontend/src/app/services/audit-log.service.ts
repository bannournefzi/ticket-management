import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLog, AuditLogFilters } from '../models/audit-log.model';
import { PageResponse } from '../models/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {

  private baseUrl = 'http://localhost:8088/api/v1/audit';

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════
  //  USER HISTORY
  // ══════════════════════════════════════════

  getMyHistory(page = 0, size = 20, sortDir = 'desc', actionType?: string): Observable<PageResponse<AuditLog>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortDir', sortDir);
    if (actionType) params = params.set('actionType', actionType);
    return this.http.get<PageResponse<AuditLog>>(`${this.baseUrl}/my-history`, { params });
  }

  // ══════════════════════════════════════════
  //  ADMIN ALL HISTORY
  // ══════════════════════════════════════════

  getAllHistory(page = 0, size = 20, sortDir = 'desc', filters?: AuditLogFilters): Observable<PageResponse<AuditLog>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortDir', sortDir);

    if (filters) {
      if (filters.userId) params = params.set('userId', filters.userId.toString());
      if (filters.actionType) params = params.set('actionType', filters.actionType);
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
      if (filters.module) params = params.set('module', filters.module);
      if (filters.keyword) params = params.set('keyword', filters.keyword);
    }

    return this.http.get<PageResponse<AuditLog>>(`${this.baseUrl}/admin/all`, { params });
  }
}

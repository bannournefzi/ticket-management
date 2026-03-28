import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface SlaConfig {
  id: number;
  priorityLevel: string;
  resolutionHours: number;
  firstResponseHours: number;
  lastModifiedDate: string;
  modifiedBy: string;
}

export interface CategoryConfig {
  id: number;
  code: string;
  label: string;
  icon: string;
  enabled: boolean;
  displayOrder: number;
}

export interface WorkingHoursConfig {
  id: number;
  dayOfWeek: string;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private baseUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  // SLA
  getAllSla(): Observable<SlaConfig[]> {
    return this.http.get<SlaConfig[]>(`${this.baseUrl}/sla`);
  }

  updateAllSla(configs: { priorityLevel: string; resolutionHours: number; firstResponseHours: number }[]): Observable<SlaConfig[]> {
    return this.http.put<SlaConfig[]>(`${this.baseUrl}/sla`, configs);
  }

  getResolutionHours(priority: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/sla/${priority}`);
  }

  // Categories
  getAllCategories(): Observable<CategoryConfig[]> {
    return this.http.get<CategoryConfig[]>(`${this.baseUrl}/categories`);
  }

  getEnabledCategories(): Observable<CategoryConfig[]> {
    return this.http.get<CategoryConfig[]>(`${this.baseUrl}/categories/enabled`);
  }

  addCategory(category: Partial<CategoryConfig>): Observable<CategoryConfig> {
    return this.http.post<CategoryConfig>(`${this.baseUrl}/categories`, category);
  }

  updateCategory(id: number, category: Partial<CategoryConfig>): Observable<CategoryConfig> {
    return this.http.put<CategoryConfig>(`${this.baseUrl}/categories/${id}`, category);
  }

  toggleCategory(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/categories/${id}/toggle`, {});
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categories/${id}`);
  }

  // Working Hours
  getAllWorkingHours(): Observable<WorkingHoursConfig[]> {
    return this.http.get<WorkingHoursConfig[]>(`${this.baseUrl}/working-hours`);
  }

  updateAllWorkingHours(configs: { dayOfWeek: string; isWorkingDay: boolean; startTime: string; endTime: string }[]): Observable<WorkingHoursConfig[]> {
    return this.http.put<WorkingHoursConfig[]>(`${this.baseUrl}/working-hours`, configs);
  }
}
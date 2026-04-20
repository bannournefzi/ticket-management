import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../app/environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
}

export interface GroupRequest {
  name: string;
  description?: string;
}

export interface GroupMemberRequest {
  userId: number;
}

export interface GroupResponse {
  id: number;
  name: string;
  description: string;
  createdBy: string;
  createdDate: string;
  members: UserSummary[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GroupService {

  private apiUrl = environment.apiUrl + '/groups';

  constructor(private http: HttpClient) {}

  createGroup(request: GroupRequest): Observable<GroupResponse> {
    return this.http.post<GroupResponse>(this.apiUrl, request);
  }

  getAllGroups(): Observable<GroupResponse[]> {
    return this.http.get<GroupResponse[]>(this.apiUrl);
  }

  getGroupById(id: number): Observable<GroupResponse> {
    return this.http.get<GroupResponse>(`${this.apiUrl}/${id}`);
  }

  updateGroup(id: number, request: GroupRequest): Observable<GroupResponse> {
    return this.http.put<GroupResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteGroup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addMember(groupId: number, userId: number): Observable<GroupResponse> {
    return this.http.post<GroupResponse>(`${this.apiUrl}/${groupId}/members`, { userId });
  }

  removeMember(groupId: number, userId: number): Observable<GroupResponse> {
    return this.http.delete<GroupResponse>(`${this.apiUrl}/${groupId}/members/${userId}`);
  }

  getAvailableUsers(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.apiUrl}/users/available`);
  }
}
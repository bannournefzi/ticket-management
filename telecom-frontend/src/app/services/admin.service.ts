import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface UserDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  enabled: boolean;
  accountLocked: boolean;
  roles: string[];
  createdDate: string;
  departement?: string;
  username?: string;
  mantisProject?: string;
  mantisProjects?: string[];
}

export interface CreateUserRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  departement?: string;
  dateOfBirth: string;
  mantisProject?: string;
  mantisProjects?: string[];
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  departement?: string;
  dateOfBirth: string;
  username?: string;
  mantisProject?: string;
  mantisProjects?: string[];
}

export interface UserStatsDTO {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  metierCount: number;
  itCount: number;
  adminCount: number;
}

export interface MantisUserDetails {
  realName?: string;
  email?: string;
  projects?: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = 'http://localhost:8088/api/v1/admin';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(`${this.baseUrl}/users`);
  }

  getUserById(id: number): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.baseUrl}/users/${id}`);
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.baseUrl}/users/${id}`, request).pipe(
      switchMap((updatedUser) => {
        if (request.role) {
          return this.http.patch<UserDTO>(
            `${this.baseUrl}/users/${id}/role?role=${request.role}`, {}
          );
        }
        return of(updatedUser);
      })
    );
  }

  createUser(request: CreateUserRequest): Observable<UserDTO> {
    return this.http.post<UserDTO>(`${this.baseUrl}/users`, request);
  }

  toggleUserStatus(id: number): Observable<UserDTO> {
    return this.http.patch<UserDTO>(`${this.baseUrl}/users/${id}/toggle-status`, {});
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`);
  }

  getUserStats(): Observable<UserStatsDTO> {
    return this.http.get<UserStatsDTO>(`${this.baseUrl}/users/stats`);
  }

  searchUsers(query?: string, role?: string, enabled?: boolean): Observable<UserDTO[]> {
    let params = new HttpParams();
    if (query) params = params.set('query', query);
    if (role) params = params.set('role', role);
    if (enabled !== undefined) params = params.set('enabled', enabled.toString());
    return this.http.get<UserDTO[]>(`${this.baseUrl}/users/search`, { params });
  }

  getMantisUsers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/mantis-users`);
  }

  getMantisUsersWithDetails(): Observable<{ [key: string]: MantisUserDetails }> {
    return this.http.get<{ [key: string]: MantisUserDetails }>(
      `${this.baseUrl}/mantis-users/details`
    );
  }

  // ← NOUVEAU : récupérer les détails d'un user Mantis spécifique
  getMantisUserDetails(username: string): Observable<MantisUserDetails> {
    return this.http.get<MantisUserDetails>(
      `${this.baseUrl}/mantis-users/${username}/details`
    );
  }

  getMantisProjectsList(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(
      `${this.baseUrl}/mantis-projects`
    );
  }

  getUserPermissions(userId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/permissions/${userId}`);
  }

  grantPageAccess(userId: number, pageKey: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/permissions/${userId}/grant`, { pageKey });
  }

  revokePageAccess(userId: number, pageKey: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/permissions/${userId}/revoke`, { pageKey });
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import {
  AuthenticationRequest,
  AuthenticationResponse,
  RegistrationRequest
} from '../../models/auth.model';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl + '/auth';

  constructor(private http: HttpClient) {}

  // ── Existing methods ────────────────────────────────────────────────────────

  register(request: RegistrationRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/register`, request);
  }

  login(request: AuthenticationRequest): Observable<AuthenticationResponse> {
    return this.http.post<AuthenticationResponse>(`${this.apiUrl}/authenticate`, request);
  }

  activateAccount(token: string): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/activate-account?token=${token}`);
  }

  logout(): void {
    localStorage.removeItem('access_token');
  }

  // ── NEW: Password reset flow ────────────────────────────────────────────────

  /**
   * Step 1 – Submit email to receive a reset link.
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Step 2 – Submit the token + new password to finalize the reset.
   */
  resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, {
      token,
      newPassword,
      confirmPassword
    });
  }

  /**
   * Change password for an authenticated user (requires JWT in header).
   * The HTTP interceptor should automatically attach the Authorization header.
   */
  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/change-password`, {
      currentPassword,
      newPassword,
      confirmPassword
    });
  }

  // ── Token / Role helpers (unchanged) ───────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getUserFullName(): string {
    const token = localStorage.getItem('access_token');
    if (!token) return 'Utilisateur';
    try {
      const decoded: any = jwtDecode(token);
      return decoded.fullName ?? 'Utilisateur';
    } catch { return 'Utilisateur'; }
  }

  getFullName(): string {
    return this.getUserFullName();
  }

  getUserRoles(): string[] {
    const token = localStorage.getItem('access_token');
    if (!token) return [];
    try {
      const decoded: any = jwtDecode(token);
      return decoded.roles || [];
    } catch { return []; }
  }

  getUserId(): number {
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('No token found');
    try {
      const decoded: any = jwtDecode(token);
      const id = decoded.userId ?? decoded.sub;
      if (!id) throw new Error('User ID not found in token');
      return Number(id);
    } catch { throw new Error('Invalid token'); }
  }

  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  isAdmin(): boolean { return this.hasRole('ROLE_ADMIN'); }
  isBusinessAnalyst(): boolean { return this.hasRole('ROLE_BUSINESS_ANALYST'); }
  isUser(): boolean { return this.hasRole('ROLE_USER'); }
}
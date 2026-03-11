import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResponse } from '../models/UserResponse';
import { AuthService } from '../auth/service/auth.service';
import { environment } from '../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class UserService {

private apiUrl = `${environment.apiUrl}/admin/users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();   
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }
}
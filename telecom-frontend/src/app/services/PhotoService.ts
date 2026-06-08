import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  private baseUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

   
  uploadPhoto(userId: number, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/${userId}/photo`, formData, { responseType: 'text' });
  }

  getPhotoAsBlob(userId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${userId}/photo`, {
      responseType: 'blob'
    });
  }

   
  getPhotoUrl(userId: number): string {
    return `${this.baseUrl}/${userId}/photo`;
  }

  
  deletePhoto(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}/photo`);
  }

   
  hasPhoto(userId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/${userId}/photo/exists`);
  }
}
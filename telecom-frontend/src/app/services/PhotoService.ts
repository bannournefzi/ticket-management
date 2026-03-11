import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  private baseUrl = 'http://localhost:8088/api/v1/users';

  constructor(private http: HttpClient) {}

  /**
   * Upload une photo de profil
   */
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

  /**
   * Retourne l'URL de la photo de profil
   */
  getPhotoUrl(userId: number): string {
    return `${this.baseUrl}/${userId}/photo`;
  }

  /**
   * Supprimer la photo de profil
   */
  deletePhoto(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}/photo`);
  }

  /**
   * Vérifier si l'utilisateur a une photo
   */
  hasPhoto(userId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/${userId}/photo/exists`);
  }
}
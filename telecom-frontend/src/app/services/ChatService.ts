import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatResponse } from '../models/ChatResponse';
import { environment } from '../environments/environment';
import { AuthService } from '../auth/service/auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = `${environment.apiUrl}/conversations`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getChatsByReceiver(): Observable<ChatResponse[]> {
    return this.http.get<ChatResponse[]>(this.apiUrl);
  }

  createChat(senderId: number, receiverId: number) {
    return this.http.post(this.apiUrl, null, {
      params: { 'sender-id': senderId, 'receiver-id': receiverId }
    });
  }

  deleteChat(chatId: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${chatId}`);
  }
}
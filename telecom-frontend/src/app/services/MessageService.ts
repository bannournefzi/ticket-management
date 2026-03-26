import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MessageResponse } from '../models/MessageResponse';
import { MessageRequest } from '../models/MessageRequest';
import { environment } from '../environments/environment';

interface SaveMessageParams {
  body: MessageRequest;
}

interface UploadMediaParams {
  'chat-id': string;  // ✅ was number
  body: { file: File };
}

interface GetAllMessagesParams {
  'chat-id': string;  // ✅ was number
}

interface SetMessageToSeenParams {
  'chat-id': string;  // ✅ was number
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private apiUrl = `${environment.apiUrl}/messages`;

  constructor(private http: HttpClient) {}

  saveMessage(params: SaveMessageParams): Observable<void> {
    return this.http.post<void>(this.apiUrl, params.body);
  }

  getAllMessages(params: GetAllMessagesParams): Observable<MessageResponse[]> {
    return this.http.get<MessageResponse[]>(
      `${this.apiUrl}/chat/${params['chat-id']}`
    );
  }

  setMessageToSeen(params: SetMessageToSeenParams): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}`,
      null,
      { params: { 'chat-id': params['chat-id'] } }
    );
  }

  uploadMedia(params: UploadMediaParams): Observable<void> {
    const formData = new FormData();
    formData.append('file', params.body.file);

    return this.http.post<void>(
      `${this.apiUrl}/upload-media`,
      formData,
      { params: { 'chat-id': params['chat-id'] } }
    );
  }
}
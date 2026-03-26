import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { ChatbotRequest, ChatbotResponse } from '../models/chatbot.model';

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    private apiUrl = environment.apiUrl + '/chatbot';

    constructor(private http: HttpClient) { }

    sendMessage(message: string): Observable<ChatbotResponse> {
        const request: ChatbotRequest = { message };
        return this.http.post<ChatbotResponse>(`${this.apiUrl}/chat`, request);
    }

    indexTickets(): Observable<string> {
        return this.http.post(`${this.apiUrl}/index-tickets`, {}, { responseType: 'text' });
    }
}
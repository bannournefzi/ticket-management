import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ChatbotService } from '../services/chatbot.service';
import { AuthService } from '../auth/service/auth.service';
import { ChatMessage } from '../models/chatbot.model';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
 
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
 
  messages: ChatMessage[] = [];
  userInput = '';
  isLoading = false;
  isOpen = false;
  isLoggedIn = false;
  unreadCount = 0;
 
  private currentUserId: number | null = null;
  private routerSub!: Subscription;
 
  // Stores each user's conversation in memory (keyed by userId)
  private messageStore: Map<number, ChatMessage[]> = new Map();
 
  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private router: Router
  ) {}
 
  ngOnInit(): void {
    this.checkAuthAndLoadMessages();
 
    // Re-check on every route change (handles login/logout navigation)
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.checkAuthAndLoadMessages());
  }
 
  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
 
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }
 
  private checkAuthAndLoadMessages(): void {
    const token = this.authService.getToken();
 
    if (!token) {
      this.isLoggedIn = false;
      this.unreadCount = 0;
      this.isOpen = false;
      this.messages = [];
      this.currentUserId = null;
      return;
    }
 
    let userId: number;
    try {
      userId = this.authService.getUserId();
    } catch {
      this.isLoggedIn = false;
      this.unreadCount = 0;
      return;
    }
 
    // Different user logged in — switch conversation history
    if (userId !== this.currentUserId) {
      if (this.currentUserId !== null) {
        this.messageStore.set(this.currentUserId, [...this.messages]);
      }
 
      this.currentUserId = userId;
      this.isOpen = false;
 
      if (this.messageStore.has(userId)) {
        this.messages = [...this.messageStore.get(userId)!];
      } else {
        const name = this.authService.getUserFullName();
        this.messages = [{
          role: 'assistant',
          content: `Hi ${name}! I\'m TasKi, your ticket assistant. Ask me anything about your tickets.`,
          timestamp: new Date()
        }];
      }
    }
 
    this.isLoggedIn = true;
  }
 
  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.unreadCount = 0;
  }
 
  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;
 
    this.messages.push({ role: 'user', content: text, timestamp: new Date() });
    this.userInput = '';
    this.isLoading = true;
 
    if (this.currentUserId !== null) {
      this.messageStore.set(this.currentUserId, [...this.messages]);
    }
 
    this.chatbotService.sendMessage(text).subscribe({
      next: (res) => {
        this.unreadCount++;
        this.messages.push({
          role: 'assistant',
          content: res.response,
          timestamp: new Date()
        });
        if (this.currentUserId !== null) {
          this.messageStore.set(this.currentUserId, [...this.messages]);
        }
        this.isLoading = false;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    });
  }
 
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
 
  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch {}
  }
}
 
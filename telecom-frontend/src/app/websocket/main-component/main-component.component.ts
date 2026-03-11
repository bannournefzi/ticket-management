import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChatListComponent } from '../chat-list/chat-list.component';
import { ChatResponse } from '../../models/ChatResponse';
import { MessageService } from '../../services/MessageService';
import { MessageResponse } from '../../models/MessageResponse';
import { MessageRequest } from '../../models/MessageRequest';
import { ChatService } from '../../services/ChatService';
import { Notification } from '../../models/Notification';
import { AuthService } from '../../auth/service/auth.service';
import { WebsocketService } from '../../services/WebsocketService';
import { StompSubscription } from '@stomp/stompjs';

// ─── Avatar emoji map (mirrors chat-list logic) ──────────────────────────────
const AVATAR_EMOJIS: Record<string, string> = {
  A: '🧑', B: '👤', C: '🧑', D: '👤', E: '🧑',
  F: '👩', G: '🧑', H: '👨', I: '🧑', J: '👤',
  K: '🧑', L: '👩', M: '🧑', N: '👤', O: '🧑',
  P: '👨', Q: '🧑', R: '👤', S: '🧑', T: '👨',
  U: '🧑', V: '👩', W: '👤', X: '🧑', Y: '👩', Z: '🧑'
};

@Component({
  selector: 'app-main',
  standalone: true,
  templateUrl: './main-component.component.html',
  styleUrls: ['./main-component.component.scss'],
  imports: [CommonModule, FormsModule, ChatListComponent]
})
export class MainComponent implements OnInit, OnDestroy, AfterViewChecked {

  private readonly chatService    = inject(ChatService);
  private readonly messageService = inject(MessageService);
  private readonly authService    = inject(AuthService);
  private readonly wsService      = inject(WebsocketService);
  private readonly cdr            = inject(ChangeDetectorRef);

  selectedChat: ChatResponse = {};
  chats: Array<ChatResponse> = [];
  chatMessages: Array<MessageResponse> = [];
  messageContent: string = '';
  showEmojis = false;
  loadingMessages = false;
  lightboxSrc: string | null = null;

  private shouldScroll = false;

  @ViewChild('scrollableDiv') scrollableDiv!: ElementRef<HTMLDivElement>;
  private notificationSubscription: StompSubscription | null = null;

  emojis = ['😀','😂','😍','🤔','😎','🥰','🤩','😢','😭','😡',
            '👍','👎','❤️','🔥','✨','⭐','🎉','🙌','💼','📎',
            '✅','🚀','💡','🔔','📅','🗂️','📝','🤝','👋','🙏'];

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.getAllChats();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.notificationSubscription?.unsubscribe();
    this.wsService.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ─── CHAT SELECTION ────────────────────────────────────────────────────────

  chatSelected(chatResponse: ChatResponse): void {
    const receiverId = Number(chatResponse.receiverId || (chatResponse as any).recipientId);

    this.selectedChat = {
      ...chatResponse,
      senderId:  Number(chatResponse.senderId),
      receiverId
    };

    this.getAllChatMessages(chatResponse.id!);

    setTimeout(() => {
      this.setMessagesToSeen();
      this.selectedChat.unreadCount = 0;
      this.updateChatInList();
    }, 300);

    this.cdr.detectChanges();
  }

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────

  sendMessage(): void {
    if (!this.messageContent.trim() || !this.selectedChat.id) return;

    const currentUserId  = Number(this.authService.getUserId());
    const chatSenderId   = Number(this.selectedChat.senderId);
    const chatReceiverId = Number(this.selectedChat.receiverId);

    if (isNaN(chatSenderId) || isNaN(chatReceiverId)) {
      console.error('❌ Invalid chat IDs:', { chatSenderId, chatReceiverId });
      return;
    }

    const myReceiverId = chatSenderId === currentUserId ? chatReceiverId : chatSenderId;

    if (!currentUserId || !myReceiverId || isNaN(myReceiverId)) {
      console.error('❌ Invalid IDs after calculation:', { currentUserId, myReceiverId });
      return;
    }

    const messageRequest: MessageRequest = {
      chatId:     this.selectedChat.id as any,
      senderId:   currentUserId,
      receiverId: myReceiverId,
      content:    this.messageContent.trim(),
      type:       'TEXT',
    };

    this.messageService.saveMessage({ body: messageRequest }).subscribe({
      next: () => {
        const message: MessageResponse = {
          senderId:  currentUserId,
          receiverId: myReceiverId,
          content:   this.messageContent,
          type:      'TEXT',
          state:     'SENT',
          createdAt: new Date().toISOString()
        };
       this.chatMessages.push(message);  // unshift adds to front of array = bottom visually
this.cdr.detectChanges();
        this.selectedChat.lastMessage = this.messageContent;
        this.selectedChat.lastMessageTime = new Date().toISOString();
        this.updateChatInList();
        this.sortChats();
        this.messageContent = '';
        this.showEmojis     = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erreur envoi:', err);
        alert('Erreur lors de l\'envoi du message');
      }
    });
  }

  // ─── MEDIA UPLOAD ──────────────────────────────────────────────────────────

  uploadMedia(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file   = target.files?.[0];
    if (!file || !this.selectedChat.id) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Full = reader.result!.toString();
      const mediaData  = base64Full.split(',')[1];

      // Optimistic preview
      const previewMessage: MessageResponse = {
        senderId:  this.getSenderId(),
        receiverId: this.getReceiverId(),
        content:   '',
        type:      'IMAGE',
        state:     'SENT',
        media:     [mediaData],
        createdAt: new Date().toISOString()
      };
      this.chatMessages.push(previewMessage);
      this.selectedChat.lastMessage = '📎 Photo';
      this.shouldScroll = true;
      this.cdr.detectChanges();

      this.messageService.uploadMedia({
        'chat-id': this.selectedChat.id! as any,
        body: { file }
      }).subscribe({
        next: () => {
          target.value = '';
          this.getAllChatMessages(this.selectedChat.id!);
        },
        error: (err) => {
          console.error('Erreur upload:', err);
          target.value = '';
        }
      });
    };

    reader.readAsDataURL(file);
  }

  // ─── UI HELPERS ────────────────────────────────────────────────────────────

  keyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  addEmoji(emoji: string): void {
    this.messageContent += emoji;
    this.showEmojis = false;
  }

  onClick(): void {
    this.setMessagesToSeen();
  }

  openImage(src: string): void {
    this.lightboxSrc = src;
  }

  /** Returns true when a message has media content to display */
  hasMedia(message: MessageResponse): boolean {
    return message.type === 'IMAGE' && !!(message.media && message.media.length > 0);
  }

  /** Builds the img src — supports both base64 blobs and regular URLs */
  getMediaSrc(message: MessageResponse): string {
    const raw = message.media![0];
    // Already a data-URL or http URL → use as-is
    if (raw.startsWith('data:') || raw.startsWith('http')) return raw;
    // Pure base64 → wrap it
    return `data:image/jpeg;base64,${raw}`;
  }

  getAvatarEmoji(name: string | undefined): string {
    if (!name) return '🧑';
    const letter = name.trim()[0]?.toUpperCase();
    return AVATAR_EMOJIS[letter] || '🧑';
  }

  logout(): void { this.authService.logout(); }

  deleteChat(): void {
    if (!this.selectedChat.id) return;
    if (!confirm('Supprimer cette conversation ?')) return;

    this.chatService.deleteChat(this.selectedChat.id).subscribe({
      next: () => {
        this.chats        = this.chats.filter(c => c.id !== this.selectedChat.id);
        this.selectedChat = {};
        this.chatMessages = [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur suppression:', err);
        alert('Impossible de supprimer la conversation');
      }
    });
  }

  // ─── WEBSOCKET ─────────────────────────────────────────────────────────────

  private connectWebSocket(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.wsService.connect();

    this.wsService.isConnected$().subscribe(connected => {
      if (connected && !this.notificationSubscription) {
        this.notificationSubscription = this.wsService.subscribe(
          `/user/${userId}/chat`,
          (message) => {
            const notification: Notification = JSON.parse(message.body);
            this.handleNotification(notification);
          }
        );
      }
    });
  }

  private handleNotification(notification: Notification): void {
    if (!notification?.chatId) return;

    const isCurrentChat = this.selectedChat?.id === notification.chatId;

    if (isCurrentChat) {
      switch (notification.type) {
        case 'MESSAGE':
          // TEXT messages: reconstruct from notification
          const newTextMsg: MessageResponse = {
            senderId:  notification.senderId!,
            receiverId: notification.receiverId!,
            content:   notification.content || '',
            type:      'TEXT',
            state:     'SENT',
            createdAt: new Date().toISOString()
          };
this.chatMessages.push(newTextMsg);
          this._updateLastMessage(notification.content || 'Message');
          this.shouldScroll = true;
          this.cdr.detectChanges();
          if (document.hasFocus()) setTimeout(() => this.setMessagesToSeen(), 500);
          break;

        case 'IMAGE':
          // ✅ FIX: For images, ALWAYS reload from server — the full binary
          // is stored in the database and may not be in the WebSocket payload.
          this._updateLastMessage('📎 Photo');
          this.getAllChatMessages(this.selectedChat.id!);
          break;

        case 'SEEN':
          this.chatMessages.forEach(m => {
            if (Number(m.senderId) === this.getSenderId()) m.state = 'SEEN';
          });
          this.cdr.detectChanges();
          break;
      }
    } else {
      // Update chat in sidebar (badge, last message)
      const destChat = this.chats.find(c => c.id === notification.chatId);

      if (destChat) {
        if (notification.type !== 'SEEN') {
          destChat.lastMessage = notification.type === 'IMAGE'
            ? '📎 Photo'
            : (notification.content || 'Message');
          destChat.lastMessageTime = new Date().toISOString();
          destChat.unreadCount = (destChat.unreadCount || 0) + 1;
          this.sortChats();
          this.cdr.detectChanges();
        }
      } else if (notification.type === 'MESSAGE') {
        // Completely new chat → reload list
        this.getAllChats();
      }
    }
  }

  private _updateLastMessage(text: string): void {
    this.selectedChat.lastMessage     = text;
    this.selectedChat.lastMessageTime = new Date().toISOString();
    this.updateChatInList();
    this.sortChats();
  }

  // ─── DATA LOADERS ──────────────────────────────────────────────────────────

  private getAllChats(): void {
    this.chatService.getChatsByReceiver().subscribe({
      next: (res) => {
        const currentUserId = Number(this.authService.getUserId());

        this.chats = res.map(chat => {
          const senderId   = Number(chat.senderId);
          const receiverId = Number(chat.receiverId || (chat as any).recipientId);
          return {
            ...chat,
            senderId,
            receiverId,
            name: senderId === currentUserId ? chat.targetName : chat.senderName
          };
        }).sort((a, b) => this.dateMs(b.lastMessageTime) - this.dateMs(a.lastMessageTime));

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading chats:', err)
    });
  }

 private getAllChatMessages(chatId: string | number): void {
  this.loadingMessages = true;
  this.messageService.getAllMessages({ 'chat-id': chatId as any }).subscribe({
    next: (messages) => {
 
      this.chatMessages = messages.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;  
      });

      this.loadingMessages = false;
      this.cdr.detectChanges();
    },
    error: () => { this.loadingMessages = false; }
  });
}

  private setMessagesToSeen(): void {
    if (!this.selectedChat.id) return;
    this.messageService.setMessageToSeen({ 'chat-id': this.selectedChat.id as any }).subscribe();
  }

  private updateChatInList(): void {
    const idx = this.chats.findIndex(c => c.id === this.selectedChat.id);
    if (idx !== -1) {
      this.chats[idx] = { ...this.selectedChat };
      this.cdr.detectChanges();
    }
  }

  private sortChats(): void {
    this.chats.sort((a, b) => this.dateMs(b.lastMessageTime) - this.dateMs(a.lastMessageTime));
  }

  private dateMs(iso: string | undefined): number {
    return iso ? new Date(iso).getTime() : 0;
  }

  // ─── IDENTITY HELPERS ──────────────────────────────────────────────────────

  private getSenderId(): number { return Number(this.authService.getUserId()); }

  private getReceiverId(): number {
    const me     = this.getSenderId();
    const sender = Number(this.selectedChat.senderId);
    const recip  = Number(this.selectedChat.receiverId);
    if (isNaN(sender) || isNaN(recip)) return 0;
    return sender === me ? recip : sender;
  }

  isSelfMessage(message: MessageResponse): boolean {
    return Number(message.senderId) === Number(this.authService.getUserId());
  }

  // ─── TRACK BY ──────────────────────────────────────────────────────────────

  trackByMessageId(_: number, message: MessageResponse): string {
    return message.id?.toString() || `${message.senderId}-${message.createdAt}-${_}`;
  }

  trackByEmoji(_: number, emoji: string): string { return emoji; }

  // ─── SCROLL ────────────────────────────────────────────────────────────────

  private scrollToBottom(): void {
    try {
      const el = this.scrollableDiv?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* noop */ }
  }
}
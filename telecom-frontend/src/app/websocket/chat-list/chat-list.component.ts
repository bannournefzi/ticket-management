import { Component, Input, Output, EventEmitter, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/ChatService';
import { ChatResponse } from '../../models/ChatResponse';
import { UserService } from '../../services/UserService';
import { UserResponse } from '../../models/UserResponse';
import { AuthService } from '../../auth/service/auth.service';

// Gender-neutral professional emoji map keyed by first letter of name
const AVATAR_EMOJIS: Record<string, string> = {
  A: '🧑', B: '👩‍💻', C: '🧑', D: '👨‍💼', E: '🧑',
  F: '👩', G: '🧑', H: '👨', I: '🧑', J: '👩‍💻',
  K: '🧑', L: '👩', M: '🧑', N: '🙍‍♂️', O: '🧑',
  P: '👨', Q: '👩‍💻', R: '👨‍💼', S: '🧑', T: '👨',
  U: '🧑', V: '👩', W: '👩‍💻', X: '🧑', Y: '👩', Z: '🧑'
};

// Slightly more varied emoji set for contacts (shows first/last name combo)
const CONTACT_EMOJIS_FEMALE = ['👩', '👩‍💼', '👩‍🔬', '👩‍💻', '🙍‍♀️'];
const CONTACT_EMOJIS_MALE   = ['👨', '👨‍💼', '👨‍🔬', '👨‍💻', '🙍‍♂️'];

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss']
})
export class ChatListComponent implements OnChanges {
  private readonly chatService = inject(ChatService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  @Input() chats: ChatResponse[] = [];
  @Input() selectedChatId: string | number | null = null;
  @Output() chatSelected = new EventEmitter<ChatResponse>();

  searchNewContact = false;
  contacts: UserResponse[] = [];
  searchQuery = '';

  /** 'all' | 'unread' | 'fav' */
  activeFilter: 'all' | 'unread' | 'fav' = 'all';

  /** Local set of favourite chat IDs stored in localStorage */
  private favourites: Set<string | number> = new Set();

  constructor() {
    this.loadFavourites();
  }

  ngOnChanges(): void {
    // nothing extra needed
  }

  // ─── FILTERS ────────────────────────────────────────────────────────────────

  setFilter(filter: 'all' | 'unread' | 'fav'): void {
    this.activeFilter = filter;
  }

  get totalUnread(): number {
    return this.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }

  filteredChats(): ChatResponse[] {
    let list = this.chats;

    // text search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q));
    }

    // tab filter
    switch (this.activeFilter) {
      case 'unread':
        list = list.filter(c => (c.unreadCount || 0) > 0);
        break;
      case 'fav':
        list = list.filter(c => this.isFavorite(c));
        break;
    }

    return list;
  }

  // ─── FAVOURITES ─────────────────────────────────────────────────────────────

  isFavorite(chat: ChatResponse): boolean {
    return this.favourites.has(chat.id!);
  }

  toggleFavorite(event: Event, chat: ChatResponse): void {
    event.stopPropagation();
    if (this.favourites.has(chat.id!)) {
      this.favourites.delete(chat.id!);
    } else {
      this.favourites.add(chat.id!);
    }
    this.saveFavourites();
  }

  private loadFavourites(): void {
    try {
      const raw = localStorage.getItem('chat_favourites');
      if (raw) {
        const arr: (string | number)[] = JSON.parse(raw);
        this.favourites = new Set(arr);
      }
    } catch { /* ignore */ }
  }

  private saveFavourites(): void {
    try {
      localStorage.setItem('chat_favourites', JSON.stringify([...this.favourites]));
    } catch { /* ignore */ }
  }

  // ─── CONTACTS ───────────────────────────────────────────────────────────────

  searchContact(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.contacts = users;
        this.searchNewContact = true;
      }
    });
  }

  selectContact(contact: UserResponse): void {
    const senderId  = Number(this.authService.getUserId());
    const receiverId = Number(contact.id);

    if (isNaN(senderId) || isNaN(receiverId)) {
      console.error('Invalid IDs:', { senderId, receiverId });
      alert('Erreur: IDs invalides');
      return;
    }

    this.chatService.createChat(senderId, receiverId).subscribe({
      next: (res: any) => {
        const chatId = res.response ?? res;

        const existing = this.chats.find(c => c.id === chatId);
        if (existing) {
          this.searchNewContact = false;
          this.chatSelected.emit(existing);
          return;
        }

        const chat: ChatResponse = {
          id: Number(chatId),
          name: `${contact.firstName} ${contact.lastName}`,
          senderId:  senderId,
          receiverId: receiverId,
          recipientOnline: contact.online || false,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0
        };

        this.chats = [chat, ...this.chats];
        this.searchNewContact = false;
        this.chatSelected.emit(chat);
      },
      error: (err) => {
        console.error('Error creating chat:', err);
        alert('Erreur lors de la création du chat');
      }
    });
  }

  chatClicked(chat: ChatResponse): void {
    const chatToEmit: ChatResponse = {
      ...chat,
      senderId:  Number(chat.senderId),
      receiverId: Number(chat.receiverId)
    };
    this.chatSelected.emit(chatToEmit);
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  getChatName(chat: ChatResponse): string {
    return chat.name || 'Contact inconnu';
  }

  wrapMessage(msg: string | undefined): string {
    if (!msg) return '';
    return msg.length > 36 ? msg.substring(0, 34) + '…' : msg;
  }

  isMediaMessage(msg: string | undefined): boolean {
    return !!(msg && (msg.includes('Attachment') || msg.includes('📎')));
  }

  formatTime(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs  = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7)  return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  /**
   * Returns a professional emoji for a chat based on the contact's name initial.
   * Falls back to 🧑 for unknowns.
   */
  getAvatarEmoji(name: string | undefined): string {
    if (!name) return '🧑';
    const letter = name.trim()[0]?.toUpperCase();
    return AVATAR_EMOJIS[letter] || '🧑';
  }

  /**
   * Returns emoji for a UserResponse contact.
   * Uses a simple hash of the full name to pick consistently.
   */
  getContactEmoji(contact: UserResponse): string {
    const full = `${contact.firstName || ''}${contact.lastName || ''}`;
    const hash = full.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    // Simple heuristic: names ending with 'a', 'e', 'ie', 'ine' → female
    const female = /[aeiou]$/i.test(contact.firstName || '');
    const set = female ? CONTACT_EMOJIS_FEMALE : CONTACT_EMOJIS_MALE;
    return set[hash % set.length];
  }

  emptyStateText(): string {
    switch (this.activeFilter) {
      case 'unread': return 'Aucun message non lu';
      case 'fav':    return 'Aucun favori enregistré';
      default:       return 'Aucune conversation';
    }
  }

  trackByChatId(_: number, chat: ChatResponse): string | number {
    return chat.id!;
  }
}
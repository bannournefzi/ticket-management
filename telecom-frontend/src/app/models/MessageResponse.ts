export interface MessageResponse {
  content?: string;
  createdAt?: string;
  id?: number;
  media?: Array<string>;
  receiverId?: number;
  senderId?: number;
  state?: 'SENT' | 'SEEN';
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
}
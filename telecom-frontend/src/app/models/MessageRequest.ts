export interface MessageRequest {
  chatId?: number | string;
  content?: string;
  receiverId?: number;
senderId?: number;
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
}
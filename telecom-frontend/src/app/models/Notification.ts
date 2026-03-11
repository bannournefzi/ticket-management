export interface Notification {
  chatId?: number;
  type?: 'MESSAGE' | 'IMAGE' | 'SEEN';         
  messageType?: 'TEXT' | 'IMAGE';                 
  content?: string;
  senderId?: number;
  receiverId?: number;
  chatName?: string;
  media?: string[];      
}
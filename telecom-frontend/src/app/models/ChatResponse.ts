export interface ChatResponse {
  id?: string ;  // Can be UUID string or number
  senderId?: number;
  receiverId?: number;  // Frontend uses this
  recipientId?: string | number;  // Backend sends this
  senderName?: string;
  targetName?: string;
  name?: string;  
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  unreadMessages?: number;  // Backend might send this
  recipientOnline?: boolean;
}
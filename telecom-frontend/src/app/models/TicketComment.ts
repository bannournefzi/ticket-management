export interface TicketComment {
  id: number;
  content: string;
  internalNote: boolean;
  source: 'INTERNAL' | 'MANTIS';
  authorId: number;
  authorFullName: string;
  authorEmail: string;
  authorRole: 'ADMIN' | 'BUSINESS_ANALYST' | 'USER' | 'DEVELOPER';
  ticketId: number;
  createdDate: string;
}

export interface CreateCommentRequest {
  content: string;
  internalNote?: boolean;
  source?: 'INTERNAL' | 'MANTIS';
}
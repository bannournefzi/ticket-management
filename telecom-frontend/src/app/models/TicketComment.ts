export interface TicketComment {
  id: number;
  content: string;
  internalNote: boolean;
  authorId: number;
  authorFullName: string;
  authorEmail: string;
  authorRole: 'ADMIN' | 'BUSINESS_ANALYST' | 'USER';
  ticketId: number;
  createdDate: string;
}

export interface CreateCommentRequest {
  content: string;
  internalNote?: boolean;
}
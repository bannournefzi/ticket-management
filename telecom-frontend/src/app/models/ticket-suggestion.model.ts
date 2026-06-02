export interface SuggestionItem {
  type: 'SAME_USER_TICKET' | 'OTHER_USER_TICKET' | 'KB_ARTICLE';
  similarityScore: number;
  title: string;

  // Ticket fields
  ticketId?: number;
  description?: string;
  resolvedDate?: string;
  linkedArticleId?: number;

  // KB article fields
  articleId?: number;
  solution?: string;
  createdAt?: string;
  linkedTicketId?: number;
}

export interface TicketSuggestionResponse {
  aiRecommendation: string;
  confidence: number;
  suggestions: SuggestionItem[];
  hasSuggestions: boolean;
}

export interface AnalyticsEventRequest {
  sessionId: string;
  eventType: 'SHOWN' | 'VIEWED' | 'CREATED_ANYWAY' | 'AVOIDED';
  suggestionType?: string;
  suggestionId?: number;
  ticketTitle?: string;
  ticketDescription?: string;
  ticketPriority?: string;
  ticketCategory?: string;
}

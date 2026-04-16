export interface KnowledgeBaseArticle {
  id: number;
  title: string;
  description?: string;
  solution: string;
  createdAt: string;
  createdById: number;
  createdByName: string;
  ticketId?: number;
}
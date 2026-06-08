export interface KnowledgeBaseArticle {
  id: number;
  title: string;
  description?: string;
  solution: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  createdById: number;
  createdByName: string;
  updatedById?: number;
  updatedByName?: string;
  ticketId?: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

export interface CreateArticleRequest {
  title: string;
  description?: string;
  solution: string;
  category?: string;
}

export interface UpdateArticleRequest {
  title: string;
  description?: string;
  solution: string;
  category?: string;
}

export interface RateArticleRequest {
  helpful: boolean;
}

export const ARTICLE_CATEGORIES = [
  { value: 'NETWORK', label: 'Réseau' },
  { value: 'SOFTWARE', label: 'Logiciel' },
  { value: 'HARDWARE', label: 'Matériel' },
  { value: 'ACCESS', label: 'Accès & Compte' },
  { value: 'PRINTING', label: 'Impression' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'VPN', label: 'VPN' },
  { value: 'OTHER', label: 'Autre' }
] as const;

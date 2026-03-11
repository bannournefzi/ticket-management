// ===== INTERFACES =====

export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  departement?: string;

  // Créateur
  creatorId: number;
  creatorFullName: string;
  creatorEmail: string;

  // Assigné
  assignedToId?: number;
  assignedToFullName?: string;
  assignedToEmail?: string;

  // Dates
  createdDate: string;
  lastModifiedDate?: string;
  resolvedDate?: string;
  closedDate?: string;

  // ===== NOUVEAU =====
  dueDate?: string;
  slaStatus?: SLAStatus;
  tags?: string[];
  commentCount?: number;
  allowedTransitions?: TicketStatus[];
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  departement?: string;
  assignedToId?: number;
  tags?: string[];              // ← NOUVEAU
}

export interface TicketStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  onHoldTickets: number;        // ← NOUVEAU
  resolvedTickets: number;
  closedTickets: number;
  rejectedTickets: number;

  lowPriority: number;
  mediumPriority: number;
  highPriority: number;
  criticalPriority: number;

  // ===== NOUVEAU =====
  averageResolutionTimeHours: number;
  ticketsCreatedLast7Days: number;
  ticketsResolvedLast7Days: number;
  ticketsCreatedLast30Days: number;
  ticketsResolvedLast30Days: number;
  slaBreachedTickets: number;
  unassignedTickets: number;
  ticketsByDepartement: Record<string, number>;
  ticketsByCategory: Record<string, number>;
}

// ===== NOUVEAU : Historique =====

export interface TicketHistory {
  id: number;
  ticketId: number;
  fieldChanged: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  changedByFullName: string;
  changedAt: string;
}

// ===== NOUVEAU : Page (pour la pagination) =====

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;          // numéro de page actuel (0-based)
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ===== TYPES =====

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED' | 'REJECTED';

export type TicketCategory = 'BUG' | 'FEATURE_REQUEST' | 'IMPROVEMENT' | 'SUPPORT' | 'DOCUMENTATION' | 'OTHER';

export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET';
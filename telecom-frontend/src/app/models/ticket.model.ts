// ===== INTERFACES =====

export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  departement?: string;

  mantisId?: number;
  mantisProjectId?: number;

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

  dueDate?: string;
  slaStatus?: SLAStatus;
  tags?: string[];
  commentCount?: number;
  allowedTransitions?: TicketStatus[];
  attachments?: Attachment[];
}

export interface Attachment {
  id: number;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  departement?: string;
  assignedToId?: number;
  tags?: string[];
}

export interface TicketStats {
  totalTickets: number;

  newTickets: number;
  feedbackTickets: number;
  acknowledgedTickets: number;
  confirmedTickets: number;
  assignedTickets: number;
  resolvedTickets: number;
  closedTickets: number;

  // temporary compatibility fields
  openTickets?: number;
  inProgressTickets?: number;
  onHoldTickets?: number;
  rejectedTickets?: number;

  lowPriority: number;
  mediumPriority: number;
  highPriority: number;
  criticalPriority: number;

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

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ===== TYPES =====

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketStatus =
  | 'NEW'
  | 'FEEDBACK'
  | 'ACKNOWLEDGED'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'RESOLVED'
  | 'CLOSED';

export type TicketCategory =
  | 'BUG'
  | 'FEATURE_REQUEST'
  | 'IMPROVEMENT'
  | 'SUPPORT'
  | 'DOCUMENTATION'
  | 'OTHER';

export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET';
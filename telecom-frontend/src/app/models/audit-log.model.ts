export interface AuditLog {
  id: number;
  userId: number;
  userFullName: string;
  actionType: string;
  module: string;
  entityType: string;
  entityId: number | null;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdDate: string;
}

export interface AuditLogFilters {
  userId?: number;
  actionType?: string;
  dateFrom?: string;
  dateTo?: string;
  module?: string;
  keyword?: string;
}

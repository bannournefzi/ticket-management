export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_RESOLVED'
  | 'STATUS_CHANGED'
  | 'SLA_BREACH'
  | 'COMMENT_ADDED'
  | 'TICKET_REJECTED'
  | 'NEW_MESSAGE'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  referenceId: string;
  referenceType: string;
  createdAt: string;
}

export const NOTIFICATION_CONFIG: Record<NotificationType, { icon: string; color: string; bg: string; toastr: 'info' | 'success' | 'error' | 'warning' }> = {
  TICKET_CREATED:    { icon: 'fa-plus-circle',       color: '#3b82f6', bg: '#eff6ff',  toastr: 'info' },
  TICKET_ASSIGNED:   { icon: 'fa-user-check',         color: '#10b981', bg: '#ecfdf5',  toastr: 'success' },
  TICKET_RESOLVED:   { icon: 'fa-check-circle',       color: '#10b981', bg: '#ecfdf5',  toastr: 'success' },
  STATUS_CHANGED:    { icon: 'fa-sync-alt',           color: '#f59e0b', bg: '#fffbeb',  toastr: 'info' },
  SLA_BREACH:        { icon: 'fa-exclamation-triangle', color: '#ef4444', bg: '#fef2f2', toastr: 'error' },
  COMMENT_ADDED:     { icon: 'fa-comment',            color: '#8b5cf6', bg: '#f5f3ff',  toastr: 'info' },
  TICKET_REJECTED:   { icon: 'fa-times-circle',       color: '#ef4444', bg: '#fef2f2',  toastr: 'warning' },
  NEW_MESSAGE:       { icon: 'fa-comment-dots',       color: '#6366f1', bg: '#eef2ff',  toastr: 'info' },
  USER_CREATED:      { icon: 'fa-user-plus',          color: '#10b981', bg: '#ecfdf5',  toastr: 'success' },
  USER_UPDATED:      { icon: 'fa-user-edit',          color: '#f59e0b', bg: '#fffbeb',  toastr: 'info' },
  USER_DELETED:      { icon: 'fa-user-minus',         color: '#ef4444', bg: '#fef2f2',  toastr: 'warning' }
};

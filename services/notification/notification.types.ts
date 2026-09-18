/**
 * Represents a notification item returned from the distribution-manager
 * notifications API and delivered via Socket.IO real-time events.
 */
export interface DCMNotificationItem {
  id: number;
  invNo?: string;
  invoiceNo?: string;
  otpCode?: string;
  otp?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  isRead?: number | boolean;
  readStatus?: number | boolean | string;
  unreadCount?: number;
  [key: string]: any;
}

export type NotificationType =
  | 'FEE_REMINDER'
  | 'PAYMENT_UPDATE'
  | 'ATTENDANCE_ALERT'
  | 'STUDENT_ABSENCE'
  | 'PAYMENT_REQUEST_PENDING'
  | 'ENQUIRY_NEW'
  | 'MANUAL_PAYMENT_APPROVED'
  | 'MANUAL_PAYMENT_REJECTED'
  | 'ANNOUNCEMENT'
  | 'SYSTEM';

export type RemoteNotification = {
  messageId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
  receivedAt: string;
};

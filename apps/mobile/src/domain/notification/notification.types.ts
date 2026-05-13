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
  | 'SYSTEM'
  // G2 mobile-alignment fix: backend already sends these but the mobile
  // type union didn't list them — they fell through to 'SYSTEM' and the
  // notification router sent the user to the "More" tab instead of the
  // relevant screen. Each maps to a specific deep-link in ROUTE_BY_TYPE.
  /** Owner used mark-fee-paid while a parent payment request was pending —
   *  the PR was auto-cancelled and the parent gets this push (fee/payments M2). */
  | 'MANUAL_PAYMENT_AUTO_RESOLVED'
  /** Owner declared a holiday — parents notified classes are off. */
  | 'HOLIDAY_DECLARED'
  /** Owner cancelled a previously-declared holiday — parents notified
   *  classes are back on. */
  | 'HOLIDAY_REMOVED'
  /** Owner cancelled an event — parents notified the event isn't happening
   *  (sent to all linked parents in the academy, see event-cancelled-push-template). */
  | 'EVENT_CANCELLED'
  /** Parent withdrew their own pending manual-payment request — owners
   *  notified so they know why the queued submission disappeared. */
  | 'MANUAL_PAYMENT_WITHDRAWN'
  /** Owner changed a student's status (active/inactive/etc.) — parents
   *  linked to that student get the push alongside the email backup. */
  | 'STUDENT_STATUS_CHANGED';

export type RemoteNotification = {
  messageId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
  receivedAt: string;
};

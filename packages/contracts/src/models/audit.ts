export const AUDIT_ACTION_TYPES = [
  'STUDENT_CREATED',
  'STUDENT_UPDATED',
  'STUDENT_STATUS_CHANGED',
  'STUDENT_DELETED',
  'STUDENT_BATCHES_CHANGED',
  // Batch management audit (added per batch-management audit M1 fix). The
  // batch surface area was entirely dark to the audit log prior — destructive
  // ops (delete-batch) had no trail. These 6 cover the batch lifecycle.
  'BATCH_CREATED',
  'BATCH_UPDATED',
  'BATCH_DELETED',
  'BATCH_PHOTO_UPLOADED',
  'BATCH_STUDENT_ADDED',
  'BATCH_STUDENT_REMOVED',
  'STUDENT_PHOTO_UPLOADED',
  'STUDENT_ATTENDANCE_EDITED',
  'HOLIDAY_DECLARED',
  'HOLIDAY_REMOVED',
  'PAYMENT_REQUEST_CREATED',
  'PAYMENT_REQUEST_UPDATED',
  'PAYMENT_REQUEST_CANCELLED',
  'PAYMENT_REQUEST_APPROVED',
  'PAYMENT_REQUEST_REJECTED',
  'PAYMENT_REQUEST_AUTO_RESOLVED',
  'STAFF_CREATED',
  'STAFF_UPDATED',
  'STAFF_DEACTIVATED',
  'STAFF_REACTIVATED',
  'STAFF_PHOTO_UPLOADED',
  'STAFF_ATTENDANCE_CHANGED',
  'ENQUIRY_CREATED',
  'ENQUIRY_UPDATED',
  'ENQUIRY_FOLLOWUP_ADDED',
  'ENQUIRY_CLOSED',
  'ENQUIRY_CONVERTED',
  'MONTHLY_DUES_ENGINE_RAN',
  'EXPENSE_CREATED',
  'EXPENSE_UPDATED',
  'EXPENSE_DELETED',
  'EXPENSE_CATEGORY_CREATED',
  'EXPENSE_CATEGORY_DELETED',
  'PARENT_INVITED',
  'PARENT_ACTIVATED',
  'FEE_PAYMENT_INITIATED',
  'FEE_PAYMENT_COMPLETED',
  'FEE_PAYMENT_FAILED',
  'FEE_PAYMENT_DUPLICATE_COLLECTED',
  'SUBSCRIPTION_PAYMENT_INITIATED',
  'SUBSCRIPTION_PAYMENT_COMPLETED',
  'SUBSCRIPTION_PAYMENT_FAILED',
  'EVENT_CREATED',
  'EVENT_UPDATED',
  'EVENT_DELETED',
  'EVENT_STATUS_CHANGED',
  'FEE_MARKED_PAID',
  'GALLERY_PHOTO_UPLOADED',
  'GALLERY_PHOTO_DELETED',
  'ACCOUNT_DELETION_REQUESTED',
  'ACCOUNT_DELETION_CANCELED',
  'ACCOUNT_DELETION_COMPLETED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  // Authenticated parent rotates their own password (cf. PASSWORD_RESET_*
  // which covers the forgot-password / OTP path). Separate action so forensic
  // queries can distinguish "user knew their password and rotated it" from
  // "user proved ownership via email and reset it".
  'PASSWORD_CHANGED',
  // Profile field changes (currently parent-only; reused if other roles get
  // a self-serve profile endpoint).
  'USER_PROFILE_UPDATED',
  // Successful authentication. Source is recorded in context: 'password'
  // (regular login), 'google' (Google ID token), 'signup' (owner-signup
  // — issues a session as part of registration). Forensic question
  // "who logged in to academy X from where" is answered from this row.
  'USER_LOGGED_IN',
  // Session revocation initiated by the user. Skipped on admin force-logout
  // and password-reset paths since those have their own audit actions
  // (ADMIN_ACADEMY_FORCE_LOGOUT / PASSWORD_RESET_COMPLETED).
  'USER_LOGGED_OUT',
  // Academy onboarding + post-onboarding mutations (M3 academy-onboarding
  // audit). ACADEMY_CREATED fires once per academy at setup; the others
  // each time the owner touches policy / branding fields.
  'ACADEMY_CREATED',
  'ACADEMY_INSTITUTE_INFO_UPDATED',
  'ACADEMY_SETTINGS_UPDATED',
  'ACADEMY_INSTITUTE_IMAGE_UPLOADED',
  'ACADEMY_INSTITUTE_IMAGE_DELETED',
  // Super-admin actions on an academy. actorUserId identifies the super admin;
  // academyId is the target academy so owners can see these in their audit
  // feed alongside their own actions.
  'ADMIN_OWNER_PASSWORD_RESET',
  'ADMIN_ACADEMY_FORCE_LOGOUT',
  'ADMIN_SUBSCRIPTION_SET_MANUAL',
  'ADMIN_SUBSCRIPTION_DEACTIVATED',
  'ADMIN_ACADEMY_LOGIN_DISABLED',
  // Super-admin authentication event. Stored against academyId='SYSTEM'
  // (sentinel) because super-admins have no academy of their own. Most
  // forensic queries on admin login are global ("show me every admin
  // login last week"), so a sentinel bucket is the right shape.
  'ADMIN_LOGGED_IN',
] as const;
export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];

export const AUDIT_ENTITY_TYPES = [
  'STUDENT',
  'STUDENT_ATTENDANCE',
  'HOLIDAY',
  'PAYMENT_REQUEST',
  'STAFF_ATTENDANCE',
  'ENQUIRY',
  'FEE_DUE',
  'EXPENSE',
  'PARENT_STUDENT_LINK',
  'FEE_PAYMENT',
  'SUBSCRIPTION_PAYMENT',
  'EVENT',
  'GALLERY_PHOTO',
  'USER',
  'ACADEMY',
  'SUBSCRIPTION',
  'BATCH',
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

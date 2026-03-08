import { AppError } from '@shared/kernel';

export const AuditErrors = {
  viewNotAllowed: () => AppError.forbidden('Only owners can view audit logs'),
  academyRequired: () =>
    new AppError('ACADEMY_SETUP_REQUIRED', 'Please complete academy setup first'),
} as const;

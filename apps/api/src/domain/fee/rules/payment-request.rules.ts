import type { UserRole } from '@playconnect/contracts';

export function canCreatePaymentRequest(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'STAFF') {
    return { allowed: false, reason: 'Only staff can create payment requests' };
  }
  return { allowed: true };
}

export function canReviewPaymentRequest(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER') {
    return { allowed: false, reason: 'Only owners can approve or reject payment requests' };
  }
  return { allowed: true };
}

export function canCancelPaymentRequest(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'STAFF') {
    return { allowed: false, reason: 'Only staff can cancel their own payment requests' };
  }
  return { allowed: true };
}

export function canListPaymentRequests(role: UserRole): { allowed: boolean; reason?: string } {
  if (role !== 'OWNER' && role !== 'STAFF') {
    return { allowed: false, reason: 'Only owners and staff can view payment requests' };
  }
  return { allowed: true };
}

export function validateStaffNotes(notes: string): { valid: boolean; reason?: string } {
  const trimmed = notes.trim();
  if (trimmed.length < 2) {
    return { valid: false, reason: 'Staff notes must be at least 2 characters' };
  }
  if (trimmed.length > 500) {
    return { valid: false, reason: 'Staff notes must be at most 500 characters' };
  }
  return { valid: true };
}

export function validateRejectionReason(reason: string): { valid: boolean; reason?: string } {
  const trimmed = reason.trim();
  if (trimmed.length < 2) {
    return { valid: false, reason: 'Rejection reason must be at least 2 characters' };
  }
  if (trimmed.length > 500) {
    return { valid: false, reason: 'Rejection reason must be at most 500 characters' };
  }
  return { valid: true };
}

export function generateReceiptNumber(prefix: string, sequenceNumber: number): string {
  return `${prefix}-${String(sequenceNumber).padStart(6, '0')}`;
}

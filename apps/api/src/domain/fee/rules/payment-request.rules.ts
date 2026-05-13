import type { UserRole } from '@academyflo/contracts';

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
  // STAFF: cancel cash-collection PRs they authored (miskeyed amount, etc.)
  // PARENT: cancel their own UPI/bank proof submissions before owner reviews
  //   them — typically when they uploaded the wrong screenshot or reference
  //   number. The use case's ownership check enforces "only your own"; this
  //   rule just gates the role.
  if (role !== 'STAFF' && role !== 'PARENT') {
    return { allowed: false, reason: 'Only staff or parents can cancel a payment request' };
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

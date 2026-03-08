import {
  canCreatePaymentRequest,
  canReviewPaymentRequest,
  canCancelPaymentRequest,
  canListPaymentRequests,
  validateStaffNotes,
  validateRejectionReason,
  generateReceiptNumber,
} from './payment-request.rules';

describe('Payment Request Rules', () => {
  describe('canCreatePaymentRequest', () => {
    it('should allow STAFF', () => {
      expect(canCreatePaymentRequest('STAFF').allowed).toBe(true);
    });

    it('should deny OWNER', () => {
      expect(canCreatePaymentRequest('OWNER').allowed).toBe(false);
    });

    it('should deny SUPER_ADMIN', () => {
      expect(canCreatePaymentRequest('SUPER_ADMIN').allowed).toBe(false);
    });
  });

  describe('canReviewPaymentRequest', () => {
    it('should allow OWNER', () => {
      expect(canReviewPaymentRequest('OWNER').allowed).toBe(true);
    });

    it('should deny STAFF', () => {
      expect(canReviewPaymentRequest('STAFF').allowed).toBe(false);
    });
  });

  describe('canCancelPaymentRequest', () => {
    it('should allow STAFF', () => {
      expect(canCancelPaymentRequest('STAFF').allowed).toBe(true);
    });

    it('should deny OWNER', () => {
      expect(canCancelPaymentRequest('OWNER').allowed).toBe(false);
    });
  });

  describe('canListPaymentRequests', () => {
    it('should allow OWNER', () => {
      expect(canListPaymentRequests('OWNER').allowed).toBe(true);
    });

    it('should allow STAFF', () => {
      expect(canListPaymentRequests('STAFF').allowed).toBe(true);
    });

    it('should deny SUPER_ADMIN', () => {
      expect(canListPaymentRequests('SUPER_ADMIN').allowed).toBe(false);
    });
  });

  describe('validateStaffNotes', () => {
    it('should accept valid notes', () => {
      expect(validateStaffNotes('Collected cash from parent').valid).toBe(true);
    });

    it('should reject too short notes', () => {
      expect(validateStaffNotes('A').valid).toBe(false);
    });

    it('should reject too long notes', () => {
      expect(validateStaffNotes('A'.repeat(501)).valid).toBe(false);
    });
  });

  describe('validateRejectionReason', () => {
    it('should accept valid reason', () => {
      expect(validateRejectionReason('Amount mismatch').valid).toBe(true);
    });

    it('should reject too short reason', () => {
      expect(validateRejectionReason('X').valid).toBe(false);
    });

    it('should reject too long reason', () => {
      expect(validateRejectionReason('R'.repeat(501)).valid).toBe(false);
    });
  });

  describe('generateReceiptNumber', () => {
    it('should format with prefix and zero-padded number', () => {
      expect(generateReceiptNumber('PC', 1)).toBe('PC-000001');
      expect(generateReceiptNumber('PC', 42)).toBe('PC-000042');
      expect(generateReceiptNumber('ABC', 1000)).toBe('ABC-001000');
    });
  });
});

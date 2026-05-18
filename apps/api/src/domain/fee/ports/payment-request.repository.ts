import type { PaymentRequest } from '../entities/payment-request.entity';
import type { PaymentRequestStatus } from '@academyflo/contracts';

export const PAYMENT_REQUEST_REPOSITORY = Symbol('PAYMENT_REQUEST_REPOSITORY');

export interface PaymentRequestRepository {
  save(request: PaymentRequest): Promise<void>;
  findById(id: string): Promise<PaymentRequest | null>;
  findPendingByFeeDue(feeDueId: string): Promise<PaymentRequest | null>;
  listByAcademyAndStatuses(
    academyId: string,
    statuses: PaymentRequestStatus[],
  ): Promise<PaymentRequest[]>;
  listByStaffAndAcademy(staffUserId: string, academyId: string): Promise<PaymentRequest[]>;
  /** Count only PENDING payment requests for a specific staff member.
   *  Used by set-staff-status to surface in-flight work the deactivated
   *  staff filed, without loading every PR they've ever created into
   *  memory (M6 staff-management audit fix). */
  countPendingByStaffAndAcademy(staffUserId: string, academyId: string): Promise<number>;
  /** Count PENDING payment requests authored by a specific user (parent or
   *  staff — author is in `staffUserId` regardless of source) created at or
   *  after `since`. Used by the parent rate-limit (M1 fee/payments audit fix)
   *  to replace an unbounded list-then-filter that loaded the parent's
   *  entire PR history just to count recent ones. */
  countPendingByAuthorAndAcademySince(
    authorUserId: string,
    academyId: string,
    since: Date,
  ): Promise<number>;
  /** All payment requests for one student in an academy, regardless of source
   *  or author. Used by staff/owner UIs to surface cross-author pending
   *  requests and prevent duplicate-pending submissions. */
  listByAcademyAndStudent(academyId: string, studentId: string): Promise<PaymentRequest[]>;
  /** Only PENDING payment requests for one student in an academy. Used by
   *  the parent-facing fee-list (M1 parent-flows audit fix) to attach a
   *  "this fee already has a pending request" badge to each fee without
   *  loading the parent's entire PR history across all time. Scoped by
   *  studentId so a parent can't probe other students' pending requests
   *  even when the link check upstream is sound. */
  listPendingByStudentAndAcademy(studentId: string, academyId: string): Promise<PaymentRequest[]>;
  countPendingByAcademy(academyId: string): Promise<number>;
  /** Cascade-delete all payment requests for a student (used when student is soft-deleted). Returns count removed.
   *
   *  WARNING: Hard-deletes ALL statuses (PENDING, APPROVED, REJECTED, CANCELLED). For
   *  soft-delete cascade, prefer `deletePendingByAcademyAndStudent` — APPROVED PRs
   *  are referenced by TransactionLog records, deleting them creates dangling
   *  refs that break compliance/dispute reporting (M4 student-management audit fix). */
  deleteAllByAcademyAndStudent(academyId: string, studentId: string): Promise<number>;
  /** Delete only PENDING payment requests for a student. Used by the student
   *  soft-delete cascade so in-flight requests don't sit orphaned in the owner's
   *  queue, while APPROVED/REJECTED/CANCELLED PRs (immutable history, often
   *  referenced by TransactionLogs) are preserved (M4 fix). Returns count removed. */
  deletePendingByAcademyAndStudent(academyId: string, studentId: string): Promise<number>;

  /** Mark all PENDING payment requests filed by a staff member as CANCELLED.
   *  Used by the staff-deactivate cascade so the owner's approval queue doesn't
   *  keep showing in-flight requests from a staff who's no longer around to
   *  clarify them. Asymmetric with the student cascade which hard-deletes —
   *  here we soft-cancel because the staff record itself still exists (just
   *  INACTIVE) and the student-side PR history should still show that the PR
   *  existed and why it was cancelled. Returns count cancelled. */
  cancelPendingByStaffAndAcademy(staffUserId: string, academyId: string): Promise<number>;
}

import type { ParentStudentLinkRepository } from '../../src/domain/parent/ports/parent-student-link.repository';
import type { StudentAttendanceRepository } from '../../src/domain/attendance/ports/student-attendance.repository';
import type { PaymentRequestRepository } from '../../src/domain/fee/ports/payment-request.repository';
import type { FeeDueRepository } from '../../src/domain/fee/ports/fee-due.repository';
import type { StudentBatchRepository } from '../../src/domain/batch/ports/student-batch.repository';
import type { TransactionPort } from '../../src/application/common/transaction.port';

// Lightweight stubs for SoftDeleteStudentUseCase cascade dependencies.
// Real cascade behavior is exercised in dedicated unit specs; e2e tests just
// need the constructor to be satisfied and the body to run.

export const noopParentLinkRepo = {
  save: async () => {},
  findByParentAndStudent: async () => null,
  findByParentUserId: async () => [],
  findByStudentId: async () => [],
  findByAcademyId: async () => [],
  deleteByParentAndStudent: async () => {},
  deleteAllByParentUserId: async () => 0,
  deleteAllByStudentId: async () => 0,
} as unknown as ParentStudentLinkRepository;

export const noopAttendanceRepo = {
  save: async () => {},
  deleteByAcademyStudentDate: async () => {},
  findByAcademyStudentDate: async () => null,
  findPresentByAcademyAndDate: async () => [],
  findPresentByAcademyStudentAndMonth: async () => [],
  findPresentByAcademyAndMonth: async () => [],
  deleteByAcademyAndDate: async () => {},
  countPresentByAcademyAndDate: async () => 0,
  deleteAllByAcademyAndStudent: async () => 0,
} as unknown as StudentAttendanceRepository;

export const noopPaymentRequestRepo = {
  save: async () => {},
  findById: async () => null,
  findPendingByFeeDue: async () => null,
  listByAcademyAndStatuses: async () => [],
  listByStaffAndAcademy: async () => [],
  countPendingByAcademy: async () => 0,
  deleteAllByAcademyAndStudent: async () => 0,
} as unknown as PaymentRequestRepository;

export const passthroughTransaction: TransactionPort = {
  run: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
};

export const noopFeeDueRepo = {
  deleteUpcomingByStudent: async () => {},
} as unknown as FeeDueRepository;

export const noopStudentBatchRepo = {
  replaceForStudent: async () => {},
} as unknown as StudentBatchRepository;

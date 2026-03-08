import {
  InMemoryUserRepository,
  InMemorySessionRepository,
  InMemoryAcademyRepository,
  InMemorySubscriptionRepository,
  InMemoryBatchRepository,
  InMemoryStudentRepository,
  InMemoryStudentAttendanceRepository,
  InMemoryHolidayRepository,
  InMemoryFeeDueRepository,
  InMemoryPaymentRequestRepository,
  InMemoryTransactionLogRepository,
  InMemoryStaffAttendanceRepository,
  InMemoryAuditLogRepository,
} from '../helpers/in-memory-repos';

export interface TestRepositories {
  userRepo: InMemoryUserRepository;
  sessionRepo: InMemorySessionRepository;
  academyRepo: InMemoryAcademyRepository;
  subscriptionRepo: InMemorySubscriptionRepository;
  batchRepo: InMemoryBatchRepository;
  studentRepo: InMemoryStudentRepository;
  attendanceRepo: InMemoryStudentAttendanceRepository;
  holidayRepo: InMemoryHolidayRepository;
  feeDueRepo: InMemoryFeeDueRepository;
  paymentRequestRepo: InMemoryPaymentRequestRepository;
  transactionLogRepo: InMemoryTransactionLogRepository;
  staffAttendanceRepo: InMemoryStaffAttendanceRepository;
  auditLogRepo: InMemoryAuditLogRepository;
}

/** Create a full set of in-memory repositories. */
export function createTestRepositories(): TestRepositories {
  return {
    userRepo: new InMemoryUserRepository(),
    sessionRepo: new InMemorySessionRepository(),
    academyRepo: new InMemoryAcademyRepository(),
    subscriptionRepo: new InMemorySubscriptionRepository(),
    batchRepo: new InMemoryBatchRepository(),
    studentRepo: new InMemoryStudentRepository(),
    attendanceRepo: new InMemoryStudentAttendanceRepository(),
    holidayRepo: new InMemoryHolidayRepository(),
    feeDueRepo: new InMemoryFeeDueRepository(),
    paymentRequestRepo: new InMemoryPaymentRequestRepository(),
    transactionLogRepo: new InMemoryTransactionLogRepository(),
    staffAttendanceRepo: new InMemoryStaffAttendanceRepository(),
    auditLogRepo: new InMemoryAuditLogRepository(),
  };
}

/** Clear all data in every repository. */
export function clearAllRepos(repos: TestRepositories): void {
  for (const repo of Object.values(repos)) {
    if (typeof repo.clear === 'function') {
      repo.clear();
    }
  }
}

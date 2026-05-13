import { CreateParentPaymentRequestUseCase } from './create-parent-payment-request.usecase';
import {
  InMemoryUserRepository,
  InMemoryStudentRepository,
  InMemoryFeeDueRepository,
  InMemoryAcademyRepository,
  InMemoryPaymentRequestRepository,
} from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { Academy } from '@domain/academy/entities/academy.entity';
import { PaymentRequest } from '@domain/fee/entities/payment-request.entity';
import { ParentStudentLink } from '@domain/parent/entities/parent-student-link.entity';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { ClockPort } from '../../common/clock.port';

function createParent(id = 'parent-1', academyId = 'academy-1'): User {
  const user = User.create({
    id,
    fullName: 'Parent',
    email: `${id}@test.com`,
    phoneNumber: '+919876543210',
    role: 'PARENT',
    passwordHash: 'hashed',
  });
  return User.reconstitute(id, { ...user['props'], academyId });
}

function createStudent(id: string, academyId: string): Student {
  return Student.create({
    id,
    academyId,
    fullName: 'Student',
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: '1 St', city: 'C', state: 'S', pincode: '400001' },
    guardian: { name: 'P', mobile: '+919876543210', email: 'p@test.com' },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 500,
  });
}

function createAcademy(id = 'academy-1', manualPaymentsEnabled = true): Academy {
  let academy = Academy.create({
    id,
    ownerUserId: 'owner-1',
    academyName: 'A',
    address: { line1: '1', city: 'C', state: 'S', pincode: '400001', country: 'India' },
  });
  if (manualPaymentsEnabled) {
    academy = academy.updateInstituteInfo({ manualPaymentsEnabled: true });
  }
  return academy;
}

function createFeeDue(id: string, academyId: string, studentId: string): FeeDue {
  return FeeDue.create({
    id,
    academyId,
    studentId,
    monthKey: '2024-03',
    dueDate: '2024-03-05',
    amount: 500,
  }).flipToDue();
}

class StubLinkRepo implements ParentStudentLinkRepository {
  private links = new Map<string, ParentStudentLink>();

  add(parentUserId: string, studentId: string, academyId: string): void {
    const link = ParentStudentLink.create({
      id: `${parentUserId}-${studentId}`,
      parentUserId,
      studentId,
      academyId,
    });
    this.links.set(`${parentUserId}-${studentId}`, link);
  }
  async save(): Promise<void> {}
  async findByParentAndStudent(
    parentUserId: string,
    studentId: string,
  ): Promise<ParentStudentLink | null> {
    return this.links.get(`${parentUserId}-${studentId}`) ?? null;
  }
  async findByParentUserId(): Promise<ParentStudentLink[]> {
    return [];
  }
  async findByStudentId(): Promise<ParentStudentLink[]> {
    return [];
  }
  async findByAcademyId(): Promise<ParentStudentLink[]> {
    return [];
  }
  async deleteByParentAndStudent(): Promise<void> {}
  async deleteAllByParentUserId(): Promise<number> {
    return 0;
  }
  async deleteAllByStudentId(): Promise<number> {
    return 0;
  }
}

const fixedClock: ClockPort = { now: () => new Date('2024-03-10T10:00:00.000Z') };

describe('CreateParentPaymentRequestUseCase (M1: parent rate-limit count)', () => {
  let userRepo: InMemoryUserRepository;
  let studentRepo: InMemoryStudentRepository;
  let feeDueRepo: InMemoryFeeDueRepository;
  let academyRepo: InMemoryAcademyRepository;
  let paymentRequestRepo: InMemoryPaymentRequestRepository;
  let linkRepo: StubLinkRepo;
  let auditRecorder: { record: jest.Mock };
  let useCase: CreateParentPaymentRequestUseCase;

  const baseInput = {
    actorUserId: 'parent-1',
    actorRole: 'PARENT' as const,
    studentId: 's1',
    feeDueId: 'fd-1',
    amount: 500,
    paymentMethod: 'CASH' as const,
    proofImageUrl: 'https://r2.example/proof.jpg',
    paymentRefNumber: null,
    parentNote: null,
  };

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    studentRepo = new InMemoryStudentRepository();
    feeDueRepo = new InMemoryFeeDueRepository();
    academyRepo = new InMemoryAcademyRepository();
    paymentRequestRepo = new InMemoryPaymentRequestRepository();
    linkRepo = new StubLinkRepo();
    auditRecorder = { record: jest.fn().mockResolvedValue(undefined) };

    await userRepo.save(createParent());
    await academyRepo.save(createAcademy());
    const student = createStudent('s1', 'academy-1');
    await studentRepo.save(student);
    await feeDueRepo.save(createFeeDue('fd-1', 'academy-1', 's1'));
    linkRepo.add('parent-1', 's1', 'academy-1');

    useCase = new CreateParentPaymentRequestUseCase(
      userRepo,
      studentRepo,
      feeDueRepo,
      academyRepo,
      // InMemoryPaymentRequestRepository carries the pre-existing
      // listByAcademyAndStudent structural-type gap; cast through unknown
      // to match the existing pattern used across the fee specs.
      paymentRequestRepo as unknown as ConstructorParameters<
        typeof CreateParentPaymentRequestUseCase
      >[4],
      linkRepo,
      auditRecorder,
      fixedClock,
    );
  });

  it('allows the first submission (count is zero)', async () => {
    const result = await useCase.execute(baseInput);
    expect(result.ok).toBe(true);
  });

  it('calls countPendingByAuthorAndAcademySince scoped to author + academy + 24h window', async () => {
    // M1 fix replaced a list-then-filter pass (which loaded the parent's
    // entire PR history into memory) with this scoped count. We assert the
    // arguments here so any future regression that drops a filter (e.g.
    // forgets to pass `since`, broadening the window) gets caught.
    const spy = jest.spyOn(paymentRequestRepo, 'countPendingByAuthorAndAcademySince');
    jest.useFakeTimers().setSystemTime(new Date('2024-03-10T10:00:00.000Z'));

    await useCase.execute(baseInput);

    expect(spy).toHaveBeenCalledTimes(1);
    const [authorArg, academyArg, sinceArg] = spy.mock.calls[0]!;
    expect(authorArg).toBe('parent-1');
    expect(academyArg).toBe('academy-1');
    // 24h before "now"
    expect(sinceArg).toBeInstanceOf(Date);
    expect(sinceArg.getTime()).toBe(new Date('2024-03-09T10:00:00.000Z').getTime());

    jest.useRealTimers();
  });

  it('blocks the 4th submission when 3 PENDING already exist in the last 24h', async () => {
    // Cap is 3. Seed 3 fresh PENDING rows for the same parent in the same
    // academy, then try a 4th. Pre-fix, this was paged through every PR
    // ever created by the parent (regardless of age) and JS-filtered.
    // The new path stops at the count.
    for (let i = 0; i < 3; i++) {
      const pr = PaymentRequest.create({
        id: `pr-${i}`,
        academyId: 'academy-1',
        studentId: 's1',
        feeDueId: `other-fd-${i}`, // different fees so the per-fee dedupe
        // doesn't bite first
        monthKey: '2024-03',
        amount: 500,
        staffUserId: 'parent-1',
        staffNotes: '',
        source: 'PARENT',
        proofImageUrl: 'https://r2.example/p.jpg',
      });
      await paymentRequestRepo.save(pr);
    }

    const result = await useCase.execute(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toMatch(/3 pending payment requests/);
    }
  });

  it('does NOT count old PENDING rows that fell outside the 24h window', async () => {
    // The whole point of M1 over the pre-fix code is the time bound. A PR
    // from a week ago that's still PENDING (because the owner is slow)
    // should NOT count against the parent's current 24h budget — they
    // already have separate stale-pending visibility in the UI for that.
    // Fake timers backdate `createdAt` via PaymentRequest.create()'s
    // implicit `new Date()` rather than reaching into entity internals.
    jest.useFakeTimers().setSystemTime(new Date('2024-03-03T10:00:00.000Z'));
    // Three stale PRs — at the cap — but all outside the 24h window.
    for (let i = 0; i < 3; i++) {
      const stale = PaymentRequest.create({
        id: `pr-stale-${i}`,
        academyId: 'academy-1',
        studentId: 's1',
        feeDueId: `old-fd-${i}`,
        monthKey: '2024-02',
        amount: 500,
        staffUserId: 'parent-1',
        staffNotes: '',
        source: 'PARENT',
        proofImageUrl: 'https://r2.example/p.jpg',
      });
      await paymentRequestRepo.save(stale);
    }
    jest.setSystemTime(new Date('2024-03-10T10:00:00.000Z'));

    const result = await useCase.execute(baseInput);
    jest.useRealTimers();

    expect(result.ok).toBe(true);
  });
});

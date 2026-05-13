import { GetChildFeesUseCase } from './get-child-fees.usecase';
import {
  InMemoryFeeDueRepository,
  InMemoryAcademyRepository,
  InMemoryPaymentRequestRepository,
} from '../../../../test/helpers/in-memory-repos';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { Academy } from '@domain/academy/entities/academy.entity';
import { PaymentRequest } from '@domain/fee/entities/payment-request.entity';
import { ParentStudentLink } from '@domain/parent/entities/parent-student-link.entity';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { ClockPort } from '../../common/clock.port';

class StubLinkRepo implements ParentStudentLinkRepository {
  private links = new Map<string, ParentStudentLink>();
  add(parentUserId: string, studentId: string, academyId: string): void {
    this.links.set(
      `${parentUserId}-${studentId}`,
      ParentStudentLink.create({
        id: `${parentUserId}-${studentId}`,
        parentUserId,
        studentId,
        academyId,
      }),
    );
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

describe('GetChildFeesUseCase (M1: bounded PENDING lookup)', () => {
  let feeDueRepo: InMemoryFeeDueRepository;
  let academyRepo: InMemoryAcademyRepository;
  let prRepo: InMemoryPaymentRequestRepository;
  let linkRepo: StubLinkRepo;
  let useCase: GetChildFeesUseCase;

  beforeEach(async () => {
    feeDueRepo = new InMemoryFeeDueRepository();
    academyRepo = new InMemoryAcademyRepository();
    prRepo = new InMemoryPaymentRequestRepository();
    linkRepo = new StubLinkRepo();
    linkRepo.add('parent-1', 's1', 'academy-1');

    await academyRepo.save(
      Academy.create({
        id: 'academy-1',
        ownerUserId: 'owner-1',
        academyName: 'A',
        address: { line1: '1', city: 'C', state: 'S', pincode: '400001', country: 'India' },
      }),
    );
    const due = FeeDue.create({
      id: 'fd-1',
      academyId: 'academy-1',
      studentId: 's1',
      monthKey: '2024-03',
      dueDate: '2024-03-05',
      amount: 500,
    }).flipToDue();
    await feeDueRepo.save(due);

    useCase = new GetChildFeesUseCase(
      linkRepo,
      feeDueRepo,
      academyRepo,
      // InMemoryPaymentRequestRepository carries pre-existing
      // listByAcademyAndStudent structural-type gap; cast through unknown.
      prRepo as unknown as ConstructorParameters<typeof GetChildFeesUseCase>[3],
      fixedClock,
    );
  });

  it('uses listPendingByStudentAndAcademy (not listByStaffAndAcademy)', async () => {
    // M1 fix scopes the lookup to (studentId, academyId, PENDING) instead
    // of pulling the parent's entire PR history. Regression guard: if a
    // future refactor switches back to the unbounded list, this fails.
    const pendingSpy = jest.spyOn(prRepo, 'listPendingByStudentAndAcademy');
    const unboundedSpy = jest.spyOn(prRepo, 'listByStaffAndAcademy');

    const result = await useCase.execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      studentId: 's1',
      from: '2024-03',
      to: '2024-03',
    });

    expect(result.ok).toBe(true);
    expect(pendingSpy).toHaveBeenCalledTimes(1);
    expect(pendingSpy).toHaveBeenCalledWith('s1', 'academy-1');
    expect(unboundedSpy).not.toHaveBeenCalled();
  });

  it('surfaces a PENDING staff-source request as a pending badge (cross-source)', async () => {
    // Pre-fix the parent view only counted PARENT-source PRs (filtered in
    // JS after the unbounded list). That hid staff-source cash-collection
    // entries from the parent — a parent would still see "pay now" on a
    // fee a staff member had already collected cash for, then get blocked
    // by the per-fee partial unique index. M1 cleans this up: any PENDING
    // PR for the fee is shown, regardless of source.
    const staffPR = PaymentRequest.create({
      id: 'pr-staff',
      academyId: 'academy-1',
      studentId: 's1',
      feeDueId: 'fd-1',
      monthKey: '2024-03',
      amount: 500,
      staffUserId: 'staff-1',
      staffNotes: 'cash in hand',
      source: 'STAFF',
    });
    await prRepo.save(staffPR);

    const result = await useCase.execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      studentId: 's1',
      from: '2024-03',
      to: '2024-03',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.pendingRequest).not.toBeNull();
    expect(result.value[0]!.pendingRequest!.id).toBe('pr-staff');
  });

  it('does not include non-PENDING requests (APPROVED/CANCELLED) in pending badge', async () => {
    // Bounded query already filters by status='PENDING', so an APPROVED PR
    // should not appear. This guards against accidentally widening the
    // status filter in the future.
    const approved = PaymentRequest.create({
      id: 'pr-approved',
      academyId: 'academy-1',
      studentId: 's1',
      feeDueId: 'fd-1',
      monthKey: '2024-03',
      amount: 500,
      staffUserId: 'parent-1',
      staffNotes: '',
      source: 'PARENT',
    }).approve('owner-1', new Date());
    await prRepo.save(approved);

    const result = await useCase.execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
      studentId: 's1',
      from: '2024-03',
      to: '2024-03',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]!.pendingRequest).toBeNull();
  });
});

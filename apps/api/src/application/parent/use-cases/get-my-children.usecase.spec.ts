import { GetMyChildrenUseCase } from './get-my-children.usecase';
import {
  InMemoryStudentRepository,
  InMemoryFeeDueRepository,
  InMemoryAcademyRepository,
} from '../../../../test/helpers/in-memory-repos';
import { Academy } from '@domain/academy/entities/academy.entity';
import { Student } from '@domain/student/entities/student.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { ParentStudentLink } from '@domain/parent/entities/parent-student-link.entity';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';

class StubLinkRepo implements ParentStudentLinkRepository {
  private links: ParentStudentLink[] = [];
  add(parentUserId: string, studentId: string, academyId: string): void {
    this.links.push(
      ParentStudentLink.create({
        id: `${parentUserId}-${studentId}`,
        parentUserId,
        studentId,
        academyId,
      }),
    );
  }
  async save(): Promise<void> {}
  async findByParentAndStudent(): Promise<ParentStudentLink | null> {
    return null;
  }
  async findByParentUserId(parentUserId: string): Promise<ParentStudentLink[]> {
    return this.links.filter((l) => l.parentUserId === parentUserId);
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

describe('GetMyChildrenUseCase (M2: dynamic late fee in totalUnpaidAmount)', () => {
  let linkRepo: StubLinkRepo;
  let studentRepo: InMemoryStudentRepository;
  let feeDueRepo: InMemoryFeeDueRepository;
  let academyRepo: InMemoryAcademyRepository;
  let attendanceRepo: jest.Mocked<StudentAttendanceRepository>;
  let holidayRepo: jest.Mocked<HolidayRepository>;
  let studentBatchRepo: jest.Mocked<StudentBatchRepository>;
  let batchRepo: jest.Mocked<BatchRepository>;

  beforeEach(async () => {
    linkRepo = new StubLinkRepo();
    studentRepo = new InMemoryStudentRepository();
    feeDueRepo = new InMemoryFeeDueRepository();
    academyRepo = new InMemoryAcademyRepository();

    // Attendance/holiday/batch dependencies — minimal stubs since this
    // suite is focused on the fee aggregation path, not attendance.
    attendanceRepo = {
      findPresentByAcademyStudentAndMonth: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      saveBulk: jest.fn(),
      findByAcademyAndMonth: jest.fn(),
    } as unknown as jest.Mocked<StudentAttendanceRepository>;
    holidayRepo = {
      findByAcademyAndMonth: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<HolidayRepository>;
    studentBatchRepo = {
      findByStudentId: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      delete: jest.fn(),
      findByBatchId: jest.fn(),
      findByStudentIds: jest.fn(),
    } as unknown as jest.Mocked<StudentBatchRepository>;
    batchRepo = {
      findByIds: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      save: jest.fn(),
      listByAcademy: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<BatchRepository>;

    linkRepo.add('parent-1', 's1', 'academy-1');
    const student = Student.create({
      id: 's1',
      academyId: 'academy-1',
      fullName: 'Kid',
      dateOfBirth: new Date('2010-01-01'),
      gender: 'MALE',
      address: { line1: '1', city: 'C', state: 'S', pincode: '400001' },
      guardian: { name: 'P', mobile: '+919876543210', email: 'p@test.com' },
      joiningDate: new Date('2020-01-01'),
      monthlyFee: 1000,
    });
    await studentRepo.save(student);
  });

  function makeUc(withAcademyRepo: boolean) {
    return new GetMyChildrenUseCase(
      linkRepo,
      studentRepo,
      attendanceRepo,
      holidayRepo,
      feeDueRepo,
      studentBatchRepo,
      batchRepo,
      withAcademyRepo ? academyRepo : undefined,
    );
  }

  async function seedAcademyWithLateFee(daily: number, gracePeriodDays: number) {
    const base = Academy.create({
      id: 'academy-1',
      ownerUserId: 'owner-1',
      academyName: 'A',
      address: { line1: '1', city: 'C', state: 'S', pincode: '400001', country: 'India' },
    });
    // Use the entity's late-fee setter so we exercise the same path
    // production uses (covers the M2 helper's reading of academy fields).
    const withLateFee = base.updateSettings({
      lateFeeEnabled: true,
      lateFeeAmountInr: daily,
      lateFeeRepeatIntervalDays: 1,
      gracePeriodDays,
    });
    await academyRepo.save(withLateFee);
  }

  async function seedOverdueFee(monthKey: string, dueDate: string, amount = 1000): Promise<void> {
    const fee = FeeDue.create({
      id: `fd-${monthKey}`,
      academyId: 'academy-1',
      studentId: 's1',
      monthKey,
      dueDate,
      amount,
    }).flipToDue();
    await feeDueRepo.save(fee);
  }

  it('M2 fix: dashboard total includes the dynamic late fee for unpaid items past grace', async () => {
    // Fee was due 2024-02-05, grace = 3 days → late fee active from
    // 2024-02-09 onwards. Today (engine default = real `new Date()`) will
    // be well past that. Daily rate = 10 INR. Pre-fix this returned 1000
    // (just base). Post-fix returns 1000 + computed late fee > 1000.
    await seedAcademyWithLateFee(10, 3);
    // Use a fixed in-the-past month so the late-fee calc is deterministic
    // independent of test run date.
    // Pick a month well in the past from the test runtime but inside the
    // engine's 24-month back-scan window so the fee shows up in the dues
    // list. Use a relative-to-now offset so this stays stable across years.
    const past = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // ~3 months ago
    const pastMonthKey = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}`;
    await seedOverdueFee(pastMonthKey, `${pastMonthKey}-05`);

    const result = await makeUc(true).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const child = result.value[0]!;
    // Late fee is at least 100 days × 10 INR if today is 2024-05+, well in
    // excess of base alone. Loose lower-bound assertion avoids coupling to
    // the test's wall clock.
    expect(child.totalUnpaidAmount).toBeGreaterThan(1000);
    expect(child.currentMonthFeeAmount).toBeGreaterThan(1000);
  });

  it('does NOT add late fee when academy has lateFeeEnabled=false', async () => {
    const base = Academy.create({
      id: 'academy-1',
      ownerUserId: 'owner-1',
      academyName: 'A',
      address: { line1: '1', city: 'C', state: 'S', pincode: '400001', country: 'India' },
    });
    await academyRepo.save(base); // lateFeeEnabled defaults to false
    // Pick a month well in the past from the test runtime but inside the
    // engine's 24-month back-scan window so the fee shows up in the dues
    // list. Use a relative-to-now offset so this stays stable across years.
    const past = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // ~3 months ago
    const pastMonthKey = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}`;
    await seedOverdueFee(pastMonthKey, `${pastMonthKey}-05`);

    const result = await makeUc(true).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]!.totalUnpaidAmount).toBe(1000);
    expect(result.value[0]!.currentMonthFeeAmount).toBe(1000);
  });

  it('falls back to base amount when academyRepo is not wired (legacy fixture)', async () => {
    // Pick a month well in the past from the test runtime but inside the
    // engine's 24-month back-scan window so the fee shows up in the dues
    // list. Use a relative-to-now offset so this stays stable across years.
    const past = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // ~3 months ago
    const pastMonthKey = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}`;
    await seedOverdueFee(pastMonthKey, `${pastMonthKey}-05`);

    const result = await makeUc(false).execute({
      parentUserId: 'parent-1',
      parentRole: 'PARENT',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]!.totalUnpaidAmount).toBe(1000);
  });
});

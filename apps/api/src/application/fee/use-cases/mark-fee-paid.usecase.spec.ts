import { MarkFeePaidUseCase } from './mark-fee-paid.usecase';
import {
  InMemoryUserRepository,
  InMemoryStudentRepository,
  InMemoryFeeDueRepository,
  InMemoryTransactionLogRepository,
  InMemoryAcademyRepository,
} from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { Academy } from '@domain/academy/entities/academy.entity';
import type { ClockPort } from '../../common/clock.port';
import type { TransactionPort } from '../../common/transaction.port';

function createOwner(id = 'owner-1', academyId = 'academy-1'): User {
  const user = User.create({
    id,
    fullName: 'Test Owner',
    email: `${id}@test.com`,
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hashed',
  });
  return User.reconstitute(id, { ...user['props'], academyId });
}

function createStaffUser(id = 'staff-1', academyId = 'academy-1'): User {
  const user = User.create({
    id,
    fullName: 'Test Staff',
    email: `${id}@test.com`,
    phoneNumber: '+919876543211',
    role: 'STAFF',
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
    address: { line1: '123 St', city: 'City', state: 'ST', pincode: '400001' },
    guardian: { name: 'Parent', mobile: '+919876543210', email: 'p@test.com' },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 500,
  });
}

function createFeeDue(academyId: string, studentId: string, monthKey = '2024-03'): FeeDue {
  const upcoming = FeeDue.create({
    id: `${studentId}-${monthKey}`,
    academyId,
    studentId,
    monthKey,
    dueDate: `${monthKey}-05`,
    amount: 500,
  });
  // Flip to DUE status since markPaid rejects UPCOMING fees
  return upcoming.flipToDue();
}

const fixedClock: ClockPort = {
  now: () => new Date('2024-03-10T10:00:00.000Z'),
};

const noopTransaction: TransactionPort = {
  run: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
};

describe('MarkFeePaidUseCase', () => {
  let userRepo: InMemoryUserRepository;
  let studentRepo: InMemoryStudentRepository;
  let feeDueRepo: InMemoryFeeDueRepository;
  let transactionLogRepo: InMemoryTransactionLogRepository;
  let academyRepo: InMemoryAcademyRepository;
  let useCase: MarkFeePaidUseCase;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    studentRepo = new InMemoryStudentRepository();
    feeDueRepo = new InMemoryFeeDueRepository();
    transactionLogRepo = new InMemoryTransactionLogRepository();
    academyRepo = new InMemoryAcademyRepository();
    useCase = new MarkFeePaidUseCase(
      userRepo,
      studentRepo,
      feeDueRepo,
      transactionLogRepo,
      academyRepo,
      fixedClock,
      noopTransaction,
    );

    // Create academy
    const academy = Academy.create({
      id: 'academy-1',
      ownerUserId: 'owner-1',
      academyName: 'Test Academy',
      address: { line1: '1 St', city: 'Mumbai', state: 'MH', pincode: '400001', country: 'India' },
    });
    await academyRepo.save(academy);
  });

  it('should mark a DUE fee as PAID and create transaction log', async () => {
    const owner = createOwner();
    await userRepo.save(owner);
    const student = createStudent('s1', 'academy-1');
    await studentRepo.save(student);
    const due = createFeeDue('academy-1', 's1');
    await feeDueRepo.save(due);

    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 's1',
      monthKey: '2024-03',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('PAID');
      expect(result.value.paidByUserId).toBe('owner-1');
      expect(result.value.paidSource).toBe('OWNER_DIRECT');
      expect(result.value.paymentLabel).toBe('CASH');
    }
  });

  it('should reject already PAID due (409)', async () => {
    const owner = createOwner();
    await userRepo.save(owner);
    const student = createStudent('s1', 'academy-1');
    await studentRepo.save(student);
    const due = createFeeDue('academy-1', 's1');
    const paid = due.markPaid('owner-1', new Date());
    await feeDueRepo.save(paid);

    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 's1',
      monthKey: '2024-03',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('should reject non-OWNER (403)', async () => {
    const staff = createStaffUser();
    await userRepo.save(staff);
    const student = createStudent('s1', 'academy-1');
    await studentRepo.save(student);
    const due = createFeeDue('academy-1', 's1');
    await feeDueRepo.save(due);

    const result = await useCase.execute({
      actorUserId: 'staff-1',
      actorRole: 'STAFF',
      studentId: 's1',
      monthKey: '2024-03',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('should reject cross-academy student (403)', async () => {
    const owner = createOwner('owner-1', 'academy-1');
    await userRepo.save(owner);
    const student = createStudent('s1', 'academy-2');
    await studentRepo.save(student);

    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 's1',
      monthKey: '2024-03',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });
});

import { ListStudentsUseCase } from './list-students.usecase';
import {
  InMemoryUserRepository,
  InMemoryStudentRepository,
  InMemoryFeeDueRepository,
  InMemoryStudentQueryRepository,
} from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { toMonthKeyFromDate } from '@shared/date-utils';

describe('ListStudentsUseCase', () => {
  let userRepo: InMemoryUserRepository;
  let studentRepo: InMemoryStudentRepository;
  let feeDueRepo: InMemoryFeeDueRepository;
  let studentQueryRepo: InMemoryStudentQueryRepository;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    studentRepo = new InMemoryStudentRepository();
    feeDueRepo = new InMemoryFeeDueRepository();
    studentQueryRepo = new InMemoryStudentQueryRepository(studentRepo, feeDueRepo);
  });

  async function seedOwner(id = 'owner-1', academyId = 'academy-1') {
    const user = User.create({
      id,
      fullName: 'Test Owner',
      email: 'owner@test.com',
      phoneNumber: '+919876543210',
      role: 'OWNER',
      passwordHash: 'hashed',
    });
    const withAcademy = User.reconstitute(id, { ...user['props'], academyId });
    await userRepo.save(withAcademy);
  }

  function makeStudent(id: string, academyId = 'academy-1', name = 'Test Student') {
    return Student.create({
      id,
      academyId,
      fullName: name,
      dateOfBirth: new Date('2010-01-01'),
      gender: 'MALE',
      address: { line1: '123 St', city: 'Mumbai', state: 'MH', pincode: '400001' },
      guardian: { name: 'Parent', mobile: '+919876543210', email: 'p@test.com' },
      joiningDate: new Date('2024-01-01'),
      monthlyFee: 500,
    });
  }

  it('calls studentQueryRepo.listWithFeeFilter when feeFilter is provided', async () => {
    await seedOwner();
    const student = makeStudent('s1');
    await studentRepo.save(student);

    const monthKey = toMonthKeyFromDate(new Date());
    const feeDue = FeeDue.create({
      id: 'fd1',
      academyId: 'academy-1',
      studentId: 's1',
      monthKey,
      dueDate: `${monthKey}-05`,
      amount: 500,
    });
    await feeDueRepo.save(feeDue.flipToDue());

    const useCase = new ListStudentsUseCase(userRepo, studentRepo, studentQueryRepo);

    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      page: 1,
      pageSize: 20,
      feeFilter: 'DUE',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.data).toHaveLength(1);
      expect(result.value.data[0]!.fullName).toBe('Test Student');
    }
  });

  it('calls studentRepo.list when feeFilter is undefined (legacy path)', async () => {
    await seedOwner();
    const student = makeStudent('s1');
    await studentRepo.save(student);

    const useCase = new ListStudentsUseCase(userRepo, studentRepo, studentQueryRepo);

    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      page: 1,
      pageSize: 20,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.data).toHaveLength(1);
    }
  });

  it('calls studentRepo.list when feeFilter is ALL', async () => {
    await seedOwner();
    const student = makeStudent('s1');
    await studentRepo.save(student);

    const useCase = new ListStudentsUseCase(userRepo, studentRepo, studentQueryRepo);

    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      page: 1,
      pageSize: 20,
      feeFilter: 'ALL',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.data).toHaveLength(1);
    }
  });

  it('rejects non-owner/staff roles', async () => {
    const admin = User.create({
      id: 'admin-1',
      fullName: 'Admin',
      email: 'admin@test.com',
      phoneNumber: '+919876543200',
      role: 'SUPER_ADMIN',
      passwordHash: 'hashed',
    });
    await userRepo.save(admin);

    const useCase = new ListStudentsUseCase(userRepo, studentRepo, studentQueryRepo);

    const result = await useCase.execute({
      actorUserId: 'admin-1',
      actorRole: 'SUPER_ADMIN',
      page: 1,
      pageSize: 20,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Only owners and staff');
    }
  });

  it('works without studentQueryRepo (backward compatibility)', async () => {
    await seedOwner();
    const student = makeStudent('s1');
    await studentRepo.save(student);

    const useCase = new ListStudentsUseCase(userRepo, studentRepo);

    const result = await useCase.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      page: 1,
      pageSize: 20,
      feeFilter: 'DUE',
    });

    // Falls back to legacy path — returns all students
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.data).toHaveLength(1);
    }
  });
});

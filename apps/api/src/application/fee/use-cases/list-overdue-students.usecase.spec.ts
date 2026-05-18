import { ListOverdueStudentsUseCase } from './list-overdue-students.usecase';
import {
  InMemoryUserRepository,
  InMemoryFeeDueRepository,
  InMemoryAcademyRepository,
  InMemoryStudentRepository,
} from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { FeeDue } from '@domain/fee/entities/fee-due.entity';
import { markDeleted, updateAuditFields } from '@shared/kernel';

function createOwner(): User {
  const u = User.create({
    id: 'owner-1',
    fullName: 'Owner',
    email: 'owner@test.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hashed',
  });
  return User.reconstitute('owner-1', { ...u['props'], academyId: 'academy-1' });
}

function createStudent(id: string, name = 'Student'): Student {
  return Student.create({
    id,
    academyId: 'academy-1',
    fullName: name,
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: 'Addr', city: 'City', state: 'State', pincode: '400001' },
    guardian: { name: 'Parent', mobile: '+919876543210', email: 'p@test.com' },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 500,
  });
}

function softDelete(student: Student, by = 'owner-1'): Student {
  return Student.reconstitute(student.id.toString(), {
    ...student['props'],
    audit: updateAuditFields(student.audit),
    softDelete: markDeleted(by),
  });
}

// Create a DUE row with a past due date so listOverdueByAcademy picks it up.
function createOverdueDue(studentId: string, monthKey = '2024-01'): FeeDue {
  return FeeDue.create({
    id: `${studentId}-${monthKey}`,
    academyId: 'academy-1',
    studentId,
    monthKey,
    dueDate: `${monthKey}-05`,
    amount: 500,
  }).flipToDue();
}

describe('ListOverdueStudentsUseCase', () => {
  it('excludes overdue rows for soft-deleted students from items and totals', async () => {
    const userRepo = new InMemoryUserRepository();
    const feeDueRepo = new InMemoryFeeDueRepository();
    const academyRepo = new InMemoryAcademyRepository();
    const studentRepo = new InMemoryStudentRepository();

    await userRepo.save(createOwner());

    const alive = createStudent('s-alive', 'Alive Student');
    const ghost = createStudent('s-ghost', 'Ghost Student');
    await studentRepo.save(alive);
    await studentRepo.save(softDelete(ghost));

    // Each student has one overdue row of ₹500
    await feeDueRepo.save(createOverdueDue('s-alive'));
    await feeDueRepo.save(createOverdueDue('s-ghost'));

    const uc = new ListOverdueStudentsUseCase(
      userRepo,
      feeDueRepo,
      academyRepo,
      studentRepo,
    );
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.studentId).toBe('s-alive');
    expect(result.value.items[0]?.studentName).toBe('Alive Student');
    // Totals only include the alive student's ₹500 base. Late-fee config is
    // not seeded so totalLateFee is 0 — totalPayable = 500.
    expect(result.value.totalOverdueAmount).toBe(500);
  });

  it('returns empty list when every overdue student is deleted', async () => {
    const userRepo = new InMemoryUserRepository();
    const feeDueRepo = new InMemoryFeeDueRepository();
    const academyRepo = new InMemoryAcademyRepository();
    const studentRepo = new InMemoryStudentRepository();

    await userRepo.save(createOwner());

    const ghost = createStudent('s-ghost');
    await studentRepo.save(softDelete(ghost));
    await feeDueRepo.save(createOverdueDue('s-ghost'));

    const uc = new ListOverdueStudentsUseCase(
      userRepo,
      feeDueRepo,
      academyRepo,
      studentRepo,
    );
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
    expect(result.value.totalOverdueAmount).toBe(0);
    expect(result.value.totalLateFees).toBe(0);
  });
});

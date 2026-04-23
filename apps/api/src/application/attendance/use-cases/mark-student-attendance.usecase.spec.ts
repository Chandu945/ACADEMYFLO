import { MarkStudentAttendanceUseCase } from './mark-student-attendance.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';
import { Holiday } from '@domain/attendance/entities/holiday.entity';
import { StudentAttendance } from '@domain/attendance/entities/student-attendance.entity';
import { Batch } from '@domain/batch/entities/batch.entity';
import { StudentBatch } from '@domain/batch/entities/student-batch.entity';
import { formatLocalDate } from '@shared/date-utils';

/** Return today's date as YYYY-MM-DD (IST-aware). */
function todayLocalDate(): string {
  return formatLocalDate(new Date());
}

function createOwner(academyId: string | null = 'academy-1'): User {
  const user = User.create({
    id: 'owner-1',
    fullName: 'Owner User',
    email: 'owner@example.com',
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hashed',
  });
  if (academyId) {
    return User.reconstitute('owner-1', { ...user['props'], academyId });
  }
  return user;
}

function createStudent(academyId = 'academy-1'): Student {
  return Student.create({
    id: 'student-1',
    academyId,
    fullName: 'Arun Sharma',
    dateOfBirth: new Date('2010-05-15'),
    gender: 'MALE',
    address: { line1: '123 Main St', city: 'Mumbai', state: 'MH', pincode: '400001' },
    guardian: { name: 'Raj', mobile: '+919876543210', email: 'raj@example.com' },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 500,
  });
}

function createBatch(id = 'batch-1', academyId = 'academy-1'): Batch {
  return Batch.create({
    id,
    academyId,
    batchName: 'Morning',
    days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  });
}

function createEnrollment(
  studentId = 'student-1',
  batchId = 'batch-1',
  academyId = 'academy-1',
): StudentBatch {
  return StudentBatch.create({
    id: `${studentId}_${batchId}`,
    studentId,
    batchId,
    academyId,
  });
}

function buildDeps() {
  const userRepo: jest.Mocked<UserRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    updateAcademyId: jest.fn(),
    listByAcademyAndRole: jest.fn(),
    countActiveByAcademyAndRole: jest.fn().mockResolvedValue(0),
    incrementTokenVersionByAcademyId: jest.fn(),
    incrementTokenVersionByUserId: jest.fn(),
    listByAcademyId: jest.fn(),
    anonymizeAndSoftDelete: jest.fn(),
  };
  const studentRepo: jest.Mocked<StudentRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listActiveByAcademy: jest.fn(),
    countActiveByAcademy: jest.fn(),
    findByIds: jest.fn(),
    findBirthdaysByAcademy: jest.fn(),
    findByEmailInAcademy: jest.fn(),
    findByPhoneInAcademy: jest.fn(),
    countInactiveByAcademy: jest.fn(),
    countNewAdmissionsByAcademyAndDateRange: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
  };
  const attendanceRepo: jest.Mocked<StudentAttendanceRepository> = {
    save: jest.fn(),
    deleteByAcademyStudentBatchDate: jest.fn(),
    findByAcademyStudentBatchDate: jest.fn(),
    findPresentByAcademyBatchAndDate: jest.fn(),
    findPresentByAcademyAndDate: jest.fn(),
    findPresentByAcademyStudentAndMonth: jest.fn(),
    findPresentByAcademyAndMonth: jest.fn(),
    deleteByAcademyAndDate: jest.fn(),
    countPresentByAcademyAndDate: jest.fn(),
    countDistinctStudentsPresentByAcademyAndDate: jest.fn(),
    deleteAllByAcademyAndStudent: jest.fn(),
  };
  const holidayRepo: jest.Mocked<HolidayRepository> = {
    save: jest.fn(),
    findByAcademyAndDate: jest.fn(),
    deleteByAcademyAndDate: jest.fn(),
    findByAcademyAndMonth: jest.fn(),
  };
  const batchRepo: jest.Mocked<BatchRepository> = {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(createBatch()),
    findByIds: jest.fn().mockResolvedValue([createBatch()]),
    findByAcademyAndName: jest.fn(),
    listByAcademy: jest.fn(),
    deleteById: jest.fn(),
  };
  const studentBatchRepo: jest.Mocked<StudentBatchRepository> = {
    replaceForStudent: jest.fn(),
    findByStudentId: jest.fn().mockResolvedValue([createEnrollment()]),
    findByBatchId: jest.fn().mockResolvedValue([createEnrollment()]),
    deleteByBatchId: jest.fn(),
    countByBatchId: jest.fn(),
    countByBatchIds: jest.fn(),
  };
  const auditRecorder = { record: jest.fn() };
  return {
    userRepo,
    studentRepo,
    attendanceRepo,
    holidayRepo,
    batchRepo,
    studentBatchRepo,
    auditRecorder,
  };
}

function makeUseCase(deps: ReturnType<typeof buildDeps>): MarkStudentAttendanceUseCase {
  return new MarkStudentAttendanceUseCase(
    deps.userRepo,
    deps.studentRepo,
    deps.attendanceRepo,
    deps.holidayRepo,
    deps.batchRepo,
    deps.studentBatchRepo,
    deps.auditRecorder,
  );
}

describe('MarkStudentAttendanceUseCase', () => {
  // Records mean PRESENT, keyed by (academy, student, batch, date). Absence = no record.
  it('creates a present record when marking PRESENT', async () => {
    const today = todayLocalDate();
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
    deps.attendanceRepo.findByAcademyStudentBatchDate.mockResolvedValue(null);

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: today,
      status: 'PRESENT',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('PRESENT');
      expect(result.value.batchId).toBe('batch-1');
    }
    expect(deps.attendanceRepo.save).toHaveBeenCalled();
  });

  it('deletes the present record when marking ABSENT', async () => {
    const today = todayLocalDate();
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(null);

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: today,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(true);
    expect(deps.attendanceRepo.deleteByAcademyStudentBatchDate).toHaveBeenCalledWith(
      'academy-1',
      'student-1',
      'batch-1',
      today,
    );
  });

  it('is idempotent when marking PRESENT twice (existing record)', async () => {
    const today = todayLocalDate();
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
    deps.attendanceRepo.findByAcademyStudentBatchDate.mockResolvedValue(
      StudentAttendance.create({
        id: 'att-1',
        academyId: 'academy-1',
        studentId: 'student-1',
        batchId: 'batch-1',
        date: today,
        markedByUserId: 'owner-1',
      }),
    );

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: today,
      status: 'PRESENT',
    });

    expect(result.ok).toBe(true);
    expect(deps.attendanceRepo.save).not.toHaveBeenCalled();
  });

  it('rejects marking on a holiday (409)', async () => {
    const today = todayLocalDate();
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(
      Holiday.create({
        id: 'h-1',
        academyId: 'academy-1',
        date: today,
        declaredByUserId: 'owner-1',
      }),
    );

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: today,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('rejects cross-academy marking', async () => {
    const today = todayLocalDate();
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner('academy-2'));
    deps.studentRepo.findById.mockResolvedValue(createStudent('academy-1'));
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(null);

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: today,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('rejects marking when batch belongs to another academy', async () => {
    const today = todayLocalDate();
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
    deps.batchRepo.findById.mockResolvedValue(createBatch('batch-1', 'academy-2'));

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: today,
      status: 'PRESENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('rejects marking when student is not enrolled in the batch', async () => {
    const today = todayLocalDate();
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    deps.studentRepo.findById.mockResolvedValue(createStudent());
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
    deps.studentBatchRepo.findByStudentId.mockResolvedValue([]);

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: today,
      status: 'PRESENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('rejects marking an inactive student', async () => {
    const today = todayLocalDate();
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());
    const activeStudent = createStudent();
    const inactive = Student.reconstitute('student-1', {
      ...activeStudent['props'],
      status: 'INACTIVE',
    });
    deps.studentRepo.findById.mockResolvedValue(inactive);
    deps.holidayRepo.findByAcademyAndDate.mockResolvedValue(null);

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: today,
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
    expect(deps.attendanceRepo.save).not.toHaveBeenCalled();
  });

  it('rejects invalid date format', async () => {
    const deps = buildDeps();
    deps.userRepo.findById.mockResolvedValue(createOwner());

    const uc = makeUseCase(deps);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      batchId: 'batch-1',
      date: 'bad-date',
      status: 'ABSENT',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });
});

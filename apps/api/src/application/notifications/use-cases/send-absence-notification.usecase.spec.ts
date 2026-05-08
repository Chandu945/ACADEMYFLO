import { SendAbsenceNotificationUseCase } from './send-absence-notification.usecase';
import { Student } from '@domain/student/entities/student.entity';
import type { StudentProps } from '@domain/student/entities/student.entity';
import { StudentAttendance } from '@domain/attendance/entities/student-attendance.entity';
import { Holiday } from '@domain/attendance/entities/holiday.entity';
import { ParentStudentLink } from '@domain/parent/entities/parent-student-link.entity';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { PushNotificationService } from '../push-notification.service';
import type { LoggerPort } from '@shared/logging/logger.port';

const ACADEMY = 'academy-1';
const STUDENT = 'student-1';
const BATCH = 'batch-1';
const DATE = '2026-05-08';

function makeStudent(opts: { status?: 'ACTIVE' | 'INACTIVE'; academyId?: string } = {}): Student {
  const seed = Student.create({
    id: STUDENT,
    academyId: opts.academyId ?? ACADEMY,
    fullName: 'Aarav Sharma',
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: '1 Test St', city: 'Hyderabad', state: 'TS', pincode: '500001' },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 1000,
  });
  // Status mutators aren't part of the public Student API; reach for the
  // entity's internal props to flip status for test fixtures.
  const props = (seed as unknown as { props: StudentProps }).props;
  return Student.reconstitute(STUDENT, {
    ...props,
    status: opts.status ?? 'ACTIVE',
  });
}

function makeUseCase() {
  const studentRepo: jest.Mocked<Pick<StudentRepository, 'findById'>> = {
    findById: jest.fn(),
  };
  const attendanceRepo: jest.Mocked<
    Pick<StudentAttendanceRepository, 'findByAcademyStudentBatchDate'>
  > = {
    findByAcademyStudentBatchDate: jest.fn(),
  };
  const holidayRepo: jest.Mocked<Pick<HolidayRepository, 'findByAcademyAndDate'>> = {
    findByAcademyAndDate: jest.fn(),
  };
  const linkRepo: jest.Mocked<Pick<ParentStudentLinkRepository, 'findByStudentId'>> = {
    findByStudentId: jest.fn(),
  };
  const pushService: jest.Mocked<Pick<PushNotificationService, 'sendToUsers'>> = {
    sendToUsers: jest.fn().mockResolvedValue(undefined),
  };
  const logger: jest.Mocked<LoggerPort> = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const useCase = new SendAbsenceNotificationUseCase(
    studentRepo as unknown as StudentRepository,
    attendanceRepo as unknown as StudentAttendanceRepository,
    holidayRepo as unknown as HolidayRepository,
    linkRepo as unknown as ParentStudentLinkRepository,
    pushService as unknown as PushNotificationService,
    logger,
  );

  // Healthy defaults: student active, no holiday, no PRESENT row, one parent.
  studentRepo.findById.mockResolvedValue(makeStudent());
  attendanceRepo.findByAcademyStudentBatchDate.mockResolvedValue(null);
  holidayRepo.findByAcademyAndDate.mockResolvedValue(null);
  linkRepo.findByStudentId.mockResolvedValue([
    ParentStudentLink.create({
      id: 'link-1',
      academyId: ACADEMY,
      parentUserId: 'parent-1',
      studentId: STUDENT,
    }),
  ]);

  return { useCase, studentRepo, attendanceRepo, holidayRepo, linkRepo, pushService };
}

const INPUT = { academyId: ACADEMY, studentId: STUDENT, batchId: BATCH, date: DATE };

describe('SendAbsenceNotificationUseCase', () => {
  it('dispatches the push when student is absent and parent is linked', async () => {
    const { useCase, pushService } = makeUseCase();
    const result = await useCase.execute(INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ sent: true, parentCount: 1 });
    expect(pushService.sendToUsers).toHaveBeenCalledWith(
      ['parent-1'],
      expect.objectContaining({
        title: 'Attendance update',
        body: "Aarav Sharma was absent from today's coaching session.",
        data: expect.objectContaining({ type: 'STUDENT_ABSENCE', studentId: STUDENT }),
      }),
    );
  });

  it('skips when the student does not exist', async () => {
    const { useCase, studentRepo, pushService } = makeUseCase();
    studentRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ sent: false, reason: 'student_not_found' });
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('skips when the student is INACTIVE', async () => {
    const { useCase, studentRepo, pushService } = makeUseCase();
    studentRepo.findById.mockResolvedValue(makeStudent({ status: 'INACTIVE' }));

    const result = await useCase.execute(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ sent: false, reason: 'student_not_active' });
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('skips when the student has been moved to a different academy', async () => {
    const { useCase, studentRepo, pushService } = makeUseCase();
    studentRepo.findById.mockResolvedValue(makeStudent({ academyId: 'other-academy' }));

    const result = await useCase.execute(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ sent: false, reason: 'student_not_found' });
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('skips when a holiday has been declared for that date', async () => {
    const { useCase, holidayRepo, pushService } = makeUseCase();
    holidayRepo.findByAcademyAndDate.mockResolvedValue(
      Holiday.create({
        id: 'h-1',
        academyId: ACADEMY,
        date: DATE,
        reason: null,
        declaredByUserId: 'owner-1',
      }),
    );

    const result = await useCase.execute(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ sent: false, reason: 'holiday_declared' });
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('skips when the student has been toggled back to PRESENT', async () => {
    const { useCase, attendanceRepo, pushService } = makeUseCase();
    attendanceRepo.findByAcademyStudentBatchDate.mockResolvedValue(
      StudentAttendance.create({
        id: 'a-1',
        academyId: ACADEMY,
        studentId: STUDENT,
        batchId: BATCH,
        date: DATE,
        markedByUserId: 'coach-1',
      }),
    );

    const result = await useCase.execute(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ sent: false, reason: 'now_present' });
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('skips when there are no parent-student links', async () => {
    const { useCase, linkRepo, pushService } = makeUseCase();
    linkRepo.findByStudentId.mockResolvedValue([]);

    const result = await useCase.execute(INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ sent: false, reason: 'no_parent_link' });
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });
});

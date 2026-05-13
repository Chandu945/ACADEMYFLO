import { UploadStudentPhotoUseCase } from './upload-student-photo.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import { User } from '@domain/identity/entities/user.entity';
import { Student } from '@domain/student/entities/student.entity';

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
    fullName: 'Aarav Sharma',
    dateOfBirth: new Date('2010-05-15'),
    gender: 'MALE',
    address: {
      line1: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    guardian: {
      name: 'Raj Sharma',
      mobile: '+919876543210',
      email: 'raj@example.com',
    },
    joiningDate: new Date('2024-01-01'),
    monthlyFee: 500,
  });
}

// A 1x1 transparent PNG (the simplest valid PNG buffer for image validation).
const PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da636400000000050001a3a3a30000000049454e44ae426082',
  'hex',
);

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
    listParentIdsByAcademy: jest.fn().mockResolvedValue([]),
  };

  const studentRepo: jest.Mocked<StudentRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listActiveByAcademy: jest.fn(),
    countActiveByAcademy: jest.fn(),
    countScheduledStudentsByAcademyAndDate: jest.fn().mockResolvedValue(0),
    findByIds: jest.fn(),
    findBirthdaysByAcademy: jest.fn(),
    findByEmailInAcademy: jest.fn(),
    findByPhoneInAcademy: jest.fn(),
    countInactiveByAcademy: jest.fn(),
    countNewAdmissionsByAcademyAndDateRange: jest.fn(),
    saveWithVersionPrecondition: jest.fn().mockResolvedValue(true),
  };

  const fileStorage: jest.Mocked<FileStoragePort> = {
    upload: jest.fn().mockResolvedValue({ url: 'https://r2.example/students/academy-1/abc.png' }),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const auditRecorder = { record: jest.fn() };

  return { userRepo, studentRepo, fileStorage, auditRecorder };
}

describe('UploadStudentPhotoUseCase', () => {
  it('uploads photo, saves student, returns the new url', async () => {
    const { userRepo, studentRepo, fileStorage } = buildDeps();
    userRepo.findById.mockResolvedValue(createOwner());
    studentRepo.findById.mockResolvedValue(createStudent());

    const uc = new UploadStudentPhotoUseCase(userRepo, studentRepo, fileStorage);
    const result = await uc.execute({
      actorUserId: 'owner-1',
      actorRole: 'OWNER',
      studentId: 'student-1',
      buffer: PNG_BUFFER,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(true);
    expect(fileStorage.upload).toHaveBeenCalled();
    expect(studentRepo.saveWithVersionPrecondition).toHaveBeenCalled();
  });

  it('rejects non-OWNER/STAFF roles', async () => {
    const { userRepo, studentRepo, fileStorage } = buildDeps();

    const uc = new UploadStudentPhotoUseCase(userRepo, studentRepo, fileStorage);
    const result = await uc.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      studentId: 'student-1',
      buffer: PNG_BUFFER,
      mimeType: 'image/png',
      originalName: 'photo.png',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
    expect(fileStorage.upload).not.toHaveBeenCalled();
  });

  describe('M5: audit log entry on upload', () => {
    it('records STUDENT_PHOTO_UPLOADED audit entry on successful upload', async () => {
      const { userRepo, studentRepo, fileStorage, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UploadStudentPhotoUseCase(userRepo, studentRepo, fileStorage, auditRecorder);
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        buffer: PNG_BUFFER,
        mimeType: 'image/png',
        originalName: 'photo.png',
      });

      expect(result.ok).toBe(true);
      expect(auditRecorder.record).toHaveBeenCalledTimes(1);
      const call = auditRecorder.record.mock.calls[0]![0];
      expect(call.action).toBe('STUDENT_PHOTO_UPLOADED');
      expect(call.entityType).toBe('STUDENT');
      expect(call.entityId).toBe('student-1');
      expect(call.actorUserId).toBe('owner-1');
      expect(call.academyId).toBe('academy-1');
      // Context deliberately does NOT include the URL — that path is PII
      // for a minor's photo. Event-only is the right semantic.
      expect(call.context).toEqual({ studentId: 'student-1' });
    });

    it('does NOT record audit if the upload validation fails (rejected before save)', async () => {
      const { userRepo, studentRepo, fileStorage, auditRecorder } = buildDeps();
      userRepo.findById.mockResolvedValue(createOwner());
      studentRepo.findById.mockResolvedValue(createStudent());

      const uc = new UploadStudentPhotoUseCase(userRepo, studentRepo, fileStorage, auditRecorder);
      // Invalid mime type → use case returns validation error before save.
      const result = await uc.execute({
        actorUserId: 'owner-1',
        actorRole: 'OWNER',
        studentId: 'student-1',
        buffer: PNG_BUFFER,
        mimeType: 'application/pdf',
        originalName: 'doc.pdf',
      });

      expect(result.ok).toBe(false);
      expect(auditRecorder.record).not.toHaveBeenCalled();
      expect(fileStorage.upload).not.toHaveBeenCalled();
    });
  });
});

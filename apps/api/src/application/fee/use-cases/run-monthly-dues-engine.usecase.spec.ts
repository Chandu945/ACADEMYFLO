import { RunMonthlyDuesEngineUseCase } from './run-monthly-dues-engine.usecase';
import {
  InMemoryAcademyRepository,
  InMemoryStudentRepository,
  InMemoryFeeDueRepository,
} from '../../../../test/helpers/in-memory-repos';
import { Academy } from '@domain/academy/entities/academy.entity';
import { Student } from '@domain/student/entities/student.entity';

function createAcademy(id = 'academy-1', dueDateDay: number | null = null): Academy {
  const academy = Academy.create({
    id,
    ownerUserId: 'owner-1',
    academyName: 'Test Academy',
    address: { line1: '1 St', city: 'A', state: 'B', pincode: '500001', country: 'India' },
  });
  if (dueDateDay !== null) {
    return academy.updateSettings({ defaultDueDateDay: dueDateDay });
  }
  return academy;
}

function createStudent(
  id: string,
  academyId: string,
  joiningDate: Date,
  monthlyFee = 500,
): Student {
  return Student.create({
    id,
    academyId,
    fullName: `Student ${id}`,
    dateOfBirth: new Date('2010-01-01'),
    gender: 'MALE',
    address: { line1: '123 St', city: 'City', state: 'ST', pincode: '400001' },
    guardian: { name: 'Parent', mobile: '+919876543210', email: 'p@test.com' },
    joiningDate,
    monthlyFee,
  });
}

describe('RunMonthlyDuesEngineUseCase', () => {
  let academyRepo: InMemoryAcademyRepository;
  let studentRepo: InMemoryStudentRepository;
  let feeDueRepo: InMemoryFeeDueRepository;
  let useCase: RunMonthlyDuesEngineUseCase;

  beforeEach(() => {
    academyRepo = new InMemoryAcademyRepository();
    studentRepo = new InMemoryStudentRepository();
    feeDueRepo = new InMemoryFeeDueRepository();
    useCase = new RunMonthlyDuesEngineUseCase(academyRepo, studentRepo, feeDueRepo);
  });

  it('should create dues for eligible students', async () => {
    const academy = createAcademy('academy-1', 5);
    await academyRepo.save(academy);
    const student = createStudent('s1', 'academy-1', new Date('2024-01-01'), 500);
    await studentRepo.save(student);

    const result = await useCase.execute({
      academyId: 'academy-1',
      now: new Date('2024-03-10'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.created).toBe(1);
    }
  });

  it('should skip students who joined after the 15th of the month', async () => {
    const academy = createAcademy('academy-1', 5);
    await academyRepo.save(academy);
    const student = createStudent('s1', 'academy-1', new Date('2024-03-16'), 500);
    await studentRepo.save(student);

    const result = await useCase.execute({
      academyId: 'academy-1',
      now: new Date('2024-03-20'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.created).toBe(0);
    }
  });

  it('should be idempotent — no duplicates on second run', async () => {
    const academy = createAcademy('academy-1', 5);
    await academyRepo.save(academy);
    const student = createStudent('s1', 'academy-1', new Date('2024-01-01'));
    await studentRepo.save(student);

    await useCase.execute({ academyId: 'academy-1', now: new Date('2024-03-03') });
    const result = await useCase.execute({
      academyId: 'academy-1',
      now: new Date('2024-03-03'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.created).toBe(0);
    }
  });

  it('should flip UPCOMING to DUE when todayDay >= dueDateDay', async () => {
    const academy = createAcademy('academy-1', 5);
    await academyRepo.save(academy);
    const student = createStudent('s1', 'academy-1', new Date('2024-01-01'));
    await studentRepo.save(student);

    // First run creates as UPCOMING (day 3 < day 5)
    await useCase.execute({ academyId: 'academy-1', now: new Date('2024-03-03') });

    // Second run on day 5 flips to DUE
    const result = await useCase.execute({
      academyId: 'academy-1',
      now: new Date('2024-03-05'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.flippedToDue).toBe(1);
    }
  });

  it('should not flip when todayDay < dueDateDay', async () => {
    const academy = createAcademy('academy-1', 10);
    await academyRepo.save(academy);
    const student = createStudent('s1', 'academy-1', new Date('2024-01-01'));
    await studentRepo.save(student);

    const result = await useCase.execute({
      academyId: 'academy-1',
      now: new Date('2024-03-05'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.created).toBe(1);
      expect(result.value.flippedToDue).toBe(0);
    }
  });
});

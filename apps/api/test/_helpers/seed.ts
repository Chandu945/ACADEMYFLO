import { User } from '../../src/domain/identity/entities/user.entity';
import { Academy } from '../../src/domain/academy/entities/academy.entity';
import { Student } from '../../src/domain/student/entities/student.entity';
import { Subscription } from '../../src/domain/subscription/entities/subscription.entity';
import type { TestRepositories } from './test-db';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SeedOwnerAcademyResult {
  userId: string;
  academyId: string;
}

/** Seed an owner user with an academy. */
export async function seedOwnerAcademy(
  repos: TestRepositories,
  opts: {
    userId?: string;
    academyId?: string;
    email?: string;
    dueDateDay?: number | null;
  } = {},
): Promise<SeedOwnerAcademyResult> {
  const userId = opts.userId ?? 'owner-1';
  const academyId = opts.academyId ?? 'academy-1';
  const email = opts.email ?? `${userId}@test.com`;

  const user = User.create({
    id: userId,
    fullName: 'Test Owner',
    email,
    phoneNumber: '+919876543210',
    role: 'OWNER',
    passwordHash: 'hashed',
  });
  await repos.userRepo.save(User.reconstitute(userId, { ...user['props'], academyId }));

  const academy = Academy.create({
    id: academyId,
    ownerUserId: userId,
    academyName: 'Test Academy',
    address: { line1: '1 St', city: 'A', state: 'B', pincode: '500001', country: 'India' },
  });
  const withSettings =
    opts.dueDateDay !== undefined && opts.dueDateDay !== null
      ? academy.updateSettings({ defaultDueDateDay: opts.dueDateDay })
      : academy;
  await repos.academyRepo.save(withSettings);

  return { userId, academyId };
}

/** Seed a staff user linked to an academy. */
export async function seedStaff(
  repos: TestRepositories,
  opts: {
    userId?: string;
    academyId?: string;
    email?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  } = {},
): Promise<string> {
  const userId = opts.userId ?? 'staff-1';
  const academyId = opts.academyId ?? 'academy-1';
  const email = opts.email ?? `${userId}@test.com`;

  const user = User.create({
    id: userId,
    fullName: 'Test Staff',
    email,
    phoneNumber: '+919876543211',
    role: 'STAFF',
    passwordHash: 'hashed',
  });

  const withAcademy = User.reconstitute(userId, {
    ...user['props'],
    academyId,
    status: opts.status ?? 'ACTIVE',
  });
  await repos.userRepo.save(withAcademy);
  return userId;
}

/** Seed multiple students for an academy. */
export async function seedStudents(
  repos: TestRepositories,
  count: number,
  opts: {
    academyId?: string;
    joiningDate?: string;
    monthlyFee?: number;
    prefix?: string;
  } = {},
): Promise<string[]> {
  const academyId = opts.academyId ?? 'academy-1';
  const joiningDate = opts.joiningDate ?? '2024-01-01';
  const monthlyFee = opts.monthlyFee ?? 500;
  const prefix = opts.prefix ?? 's';
  const ids: string[] = [];

  for (let i = 1; i <= count; i++) {
    const id = `${prefix}${i}`;
    const student = Student.create({
      id,
      academyId,
      fullName: `Student ${i}`,
      dateOfBirth: new Date('2010-01-01'),
      gender: 'MALE',
      address: { line1: '123 St', city: 'City', state: 'ST', pincode: '400001' },
      guardian: { name: 'Parent', mobile: '+919876543210', email: `p${i}@test.com` },
      joiningDate: new Date(joiningDate),
      monthlyFee,
    });
    await repos.studentRepo.save(student);
    ids.push(id);
  }

  return ids;
}

/** Seed an active trial subscription for an academy. */
export async function seedTrialSubscription(
  repos: TestRepositories,
  opts: {
    id?: string;
    academyId?: string;
    trialDays?: number;
  } = {},
): Promise<void> {
  const id = opts.id ?? 'sub-1';
  const academyId = opts.academyId ?? 'academy-1';
  const trialDays = opts.trialDays ?? 30;

  const sub = Subscription.createTrial({
    id,
    academyId,
    trialStartAt: new Date(),
    trialEndAt: new Date(Date.now() + trialDays * DAY_MS),
  });
  await repos.subscriptionRepo.save(sub);
}

/** Seed an expired trial subscription. */
export async function seedExpiredSubscription(
  repos: TestRepositories,
  opts: {
    id?: string;
    academyId?: string;
  } = {},
): Promise<void> {
  const id = opts.id ?? 'sub-1';
  const academyId = opts.academyId ?? 'academy-1';

  const sub = Subscription.createTrial({
    id,
    academyId,
    trialStartAt: new Date(Date.now() - 40 * DAY_MS),
    trialEndAt: new Date(Date.now() - 10 * DAY_MS),
  });
  await repos.subscriptionRepo.save(sub);
}

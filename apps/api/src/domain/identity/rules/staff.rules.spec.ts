import { canManageStaff, staffBelongsToAcademy } from './staff.rules';
import { User } from '../entities/user.entity';

function createStaffUser(academyId: string): User {
  const user = User.create({
    id: 'staff-1',
    fullName: 'Staff User',
    email: 'staff@example.com',
    phoneNumber: '+919876543210',
    role: 'STAFF',
    passwordHash: 'hashed',
  });
  return User.reconstitute('staff-1', {
    ...user['props'],
    academyId,
  });
}

describe('canManageStaff', () => {
  it('should allow OWNER', () => {
    const result = canManageStaff('OWNER');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should reject STAFF', () => {
    const result = canManageStaff('STAFF');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('should reject SUPER_ADMIN', () => {
    const result = canManageStaff('SUPER_ADMIN');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

describe('staffBelongsToAcademy', () => {
  it('should allow when academy matches', () => {
    const staff = createStaffUser('academy-1');
    const result = staffBelongsToAcademy(staff, 'academy-1');
    expect(result.allowed).toBe(true);
  });

  it('should reject when academy does not match', () => {
    const staff = createStaffUser('academy-1');
    const result = staffBelongsToAcademy(staff, 'academy-2');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

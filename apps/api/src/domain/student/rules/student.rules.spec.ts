import {
  validateFullName,
  validatePincode,
  validateMonthlyFee,
  validateGender,
  validateDateOfBirth,
  validateGuardianMobile,
  validateGuardianEmail,
  canManageStudent,
  canChangeStudentFee,
  canChangeStudentStatus,
  canDeleteStudent,
} from './student.rules';

describe('validateFullName', () => {
  it('should accept valid name', () => {
    expect(validateFullName('Arun Sharma').valid).toBe(true);
  });

  it('should reject name shorter than 2 chars', () => {
    const result = validateFullName('A');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at least 2');
  });

  it('should reject name longer than 100 chars', () => {
    const result = validateFullName('A'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('100');
  });

  it('should trim whitespace before validation', () => {
    expect(validateFullName('  AB  ').valid).toBe(true);
  });
});

describe('validatePincode', () => {
  it('should accept valid 6-digit pincode', () => {
    expect(validatePincode('400001').valid).toBe(true);
  });

  it('should reject non-6-digit value', () => {
    const result = validatePincode('12345');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('6 digits');
  });

  it('should reject letters', () => {
    expect(validatePincode('40000A').valid).toBe(false);
  });
});

describe('validateMonthlyFee', () => {
  it('should accept positive integer', () => {
    expect(validateMonthlyFee(500).valid).toBe(true);
  });

  it('should reject zero', () => {
    const result = validateMonthlyFee(0);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('greater than 0');
  });

  it('should reject negative', () => {
    expect(validateMonthlyFee(-100).valid).toBe(false);
  });

  it('should reject non-integer', () => {
    const result = validateMonthlyFee(99.5);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('integer');
  });
});

describe('validateGender', () => {
  it('should accept MALE', () => {
    expect(validateGender('MALE').valid).toBe(true);
  });

  it('should accept FEMALE', () => {
    expect(validateGender('FEMALE').valid).toBe(true);
  });

  it('should accept OTHER', () => {
    expect(validateGender('OTHER').valid).toBe(true);
  });

  it('should reject invalid gender', () => {
    const result = validateGender('UNKNOWN');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('MALE');
  });
});

describe('validateDateOfBirth', () => {
  it('should accept past date', () => {
    expect(validateDateOfBirth(new Date('2010-01-01')).valid).toBe(true);
  });

  it('should reject future date', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = validateDateOfBirth(future);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('future');
  });
});

describe('validateGuardianMobile', () => {
  it('should accept valid E.164 mobile', () => {
    expect(validateGuardianMobile('+919876543210').valid).toBe(true);
  });

  it('should reject without plus prefix', () => {
    expect(validateGuardianMobile('919876543210').valid).toBe(false);
  });

  it('should reject too short', () => {
    expect(validateGuardianMobile('+12345').valid).toBe(false);
  });
});

describe('validateGuardianEmail', () => {
  it('should accept valid email', () => {
    expect(validateGuardianEmail('test@example.com').valid).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateGuardianEmail('not-an-email').valid).toBe(false);
  });
});

describe('canManageStudent', () => {
  it('should allow OWNER', () => {
    expect(canManageStudent('OWNER').allowed).toBe(true);
  });

  it('should allow STAFF', () => {
    expect(canManageStudent('STAFF').allowed).toBe(true);
  });

  it('should reject SUPER_ADMIN', () => {
    expect(canManageStudent('SUPER_ADMIN').allowed).toBe(false);
  });
});

describe('canChangeStudentFee', () => {
  it('should allow OWNER', () => {
    expect(canChangeStudentFee('OWNER').allowed).toBe(true);
  });

  it('should reject STAFF', () => {
    const result = canChangeStudentFee('STAFF');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('owners');
  });
});

describe('canChangeStudentStatus', () => {
  it('should allow OWNER', () => {
    expect(canChangeStudentStatus('OWNER').allowed).toBe(true);
  });

  it('should reject STAFF', () => {
    expect(canChangeStudentStatus('STAFF').allowed).toBe(false);
  });
});

describe('canDeleteStudent', () => {
  it('should allow OWNER', () => {
    expect(canDeleteStudent('OWNER').allowed).toBe(true);
  });

  it('should reject STAFF', () => {
    expect(canDeleteStudent('STAFF').allowed).toBe(false);
  });
});

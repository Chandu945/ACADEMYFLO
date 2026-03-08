import {
  validateBatchName,
  validateDays,
  validateNotes,
  canManageBatch,
  canReadBatch,
} from './batch.rules';

describe('validateBatchName', () => {
  it('should accept valid name', () => {
    expect(validateBatchName('Morning Batch').valid).toBe(true);
  });

  it('should reject name shorter than 2 chars', () => {
    const result = validateBatchName('A');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at least 2');
  });

  it('should reject name longer than 60 chars', () => {
    const result = validateBatchName('A'.repeat(61));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('60');
  });

  it('should trim whitespace before validation', () => {
    expect(validateBatchName('  AB  ').valid).toBe(true);
  });
});

describe('validateDays', () => {
  it('should accept valid unique days', () => {
    expect(validateDays(['MON', 'WED', 'FRI']).valid).toBe(true);
  });

  it('should allow empty days (days are optional)', () => {
    const result = validateDays([]);
    expect(result.valid).toBe(true);
  });

  it('should reject duplicate weekdays', () => {
    const result = validateDays(['MON', 'MON', 'WED']);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Duplicate');
  });

  it('should reject invalid weekday', () => {
    const result = validateDays(['MON', 'INVALID' as 'MON']);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid');
  });

  it('should accept all 7 days', () => {
    expect(validateDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']).valid).toBe(true);
  });
});

describe('validateNotes', () => {
  it('should accept valid notes', () => {
    expect(validateNotes('Some notes').valid).toBe(true);
  });

  it('should reject notes longer than 500 chars', () => {
    const result = validateNotes('A'.repeat(501));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('500');
  });
});

describe('canManageBatch', () => {
  it('should allow OWNER', () => {
    expect(canManageBatch('OWNER').allowed).toBe(true);
  });

  it('should allow STAFF', () => {
    expect(canManageBatch('STAFF').allowed).toBe(true);
  });

  it('should reject SUPER_ADMIN', () => {
    expect(canManageBatch('SUPER_ADMIN').allowed).toBe(false);
  });
});

describe('canReadBatch', () => {
  it('should allow OWNER', () => {
    expect(canReadBatch('OWNER').allowed).toBe(true);
  });

  it('should allow STAFF', () => {
    expect(canReadBatch('STAFF').allowed).toBe(true);
  });

  it('should reject SUPER_ADMIN', () => {
    expect(canReadBatch('SUPER_ADMIN').allowed).toBe(false);
  });
});

describe('name normalization', () => {
  it('should produce deterministic normalized names', () => {
    const name = '  Morning Batch  ';
    const normalized = name.trim().toLowerCase();
    expect(normalized).toBe('morning batch');
  });
});

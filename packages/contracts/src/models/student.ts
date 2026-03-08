/**
 * Gender values for students.
 * Assumption: SRS does not enumerate gender; using standard values.
 * Easily extendable if requirements change.
 */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export const GENDERS: readonly Gender[] = ['MALE', 'FEMALE', 'OTHER'] as const;

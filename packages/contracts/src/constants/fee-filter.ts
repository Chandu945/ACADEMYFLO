export type FeeFilter = 'ALL' | 'DUE' | 'PAID';

export const FEE_FILTERS: readonly FeeFilter[] = ['ALL', 'DUE', 'PAID'] as const;

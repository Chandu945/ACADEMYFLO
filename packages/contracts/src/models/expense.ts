export const EXPENSE_CATEGORIES = ['RENT', 'SALARY', 'SUPPLIES', 'UTILITIES', 'TRANSPORT', 'OTHER'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

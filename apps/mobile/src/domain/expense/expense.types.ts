export type ExpenseCategory = {
  id: string;
  name: string;
};

export type ExpenseItem = {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  notes: string | null;
  createdAt: string;
};

export type ExpenseSummaryCategory = {
  category: string;
  total: number;
};

export type ExpenseSummary = {
  categories: ExpenseSummaryCategory[];
  totalAmount: number;
};

export type ExpensesQuery = {
  month: string;
  categoryId?: string;
  page: number;
  pageSize: number;
};

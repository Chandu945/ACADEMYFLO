'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useExpenses, useExpenseSummary, useExpenseCategories, createExpense, updateExpense, deleteExpense, createCategory } from '@/application/expenses/use-expenses';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Chip } from '@/components/ui/Chip';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from './page.module.css';

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
function formatCurrency(amount: number) { return currencyFormatter.format(amount); }

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function ExpensesPage() {
  const { accessToken } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);

  const month = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthOffset]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: expenses, loading, refetch } = useExpenses(month);
  const { data: summary, loading: summaryLoading } = useExpenseSummary(month);
  const { data: categories, refetch: refetchCategories } = useExpenseCategories();

  // Filter expenses client-side
  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.categoryName?.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      result = result.filter((e) => e.categoryId === categoryFilter);
    }
    return result;
  }, [expenses, searchQuery, categoryFilter]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    categoryId: '',
    amount: '',
    notes: '',
  });

  const resetForm = () => {
    setForm({ date: new Date().toLocaleDateString('en-CA'), categoryId: '', amount: '', notes: '' });
    setEditId(null);
    setError(null);
  };

  const openAdd = () => { resetForm(); setModalOpen(true); };
  const openEdit = (expense: typeof expenses[0]) => {
    const dateVal = expense.date.includes('T') ? expense.date.split('T')[0] : expense.date;
    setForm({ date: dateVal, categoryId: expense.categoryId, amount: String(expense.amount), notes: expense.notes ?? '' });
    setEditId(expense.id);
    setModalOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.categoryId || !form.amount || Number(form.amount) <= 0) {
      setError('Category and amount are required');
      return;
    }
    setSaving(true);
    setError(null);
    const body = { date: form.date, categoryId: form.categoryId, amount: Number(form.amount), notes: form.notes.trim() || undefined };
    const result = editId
      ? await updateExpense(editId, body, accessToken)
      : await createExpense(body, accessToken);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    setModalOpen(false);
    resetForm();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    refetch();
  }, [form, editId, accessToken, refetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteExpense(deleteId, accessToken);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error || 'Failed to delete expense');
      return;
    }
    setDeleteId(null);
    refetch();
  }, [deleteId, accessToken, refetch]);

  const categoryOptions = [
    { value: '', label: 'Select Category' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleAddCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) { setCategoryError('Category name is required'); return; }
    if (name.length > 50) { setCategoryError('Max 50 characters'); return; }
    setAddingCategory(true);
    setCategoryError(null);
    const result = await createCategory({ name }, accessToken);
    setAddingCategory(false);
    if (!result.ok) { setCategoryError(result.error); return; }
    setNewCategoryName('');
    refetchCategories();
    // Auto-select the new category
    if (result.data?.id) {
      setForm((p) => ({ ...p, categoryId: result.data.id }));
    }
  }, [newCategoryName, accessToken, refetchCategories]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Expenses</h1>
        <Button variant="primary" onClick={openAdd}>Add Expense</Button>
      </div>

      {saveSuccess && <Alert variant="success" message="Expense saved successfully" />}

      {/* Month Navigation */}
      <div className={styles.monthNav}>
        <button type="button" className={styles.monthNavBtn} onClick={() => setMonthOffset((p) => p - 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className={styles.monthLabel}>{getMonthLabel(month)}</span>
        <button type="button" className={styles.monthNavBtn} onClick={() => setMonthOffset((p) => p + 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className={styles.filters}>
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search expenses..." />
        <div className={styles.chipGroup}>
          <Chip label="All" selected={categoryFilter === ''} onSelect={() => setCategoryFilter('')} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} selected={categoryFilter === c.id} onSelect={() => setCategoryFilter(categoryFilter === c.id ? '' : c.id)} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className={styles.summarySection}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryTitle}>Summary</span>
          {summaryLoading ? <Spinner size="sm" /> : <span className={styles.totalAmount}>{formatCurrency(summary?.totalAmount ?? 0)}</span>}
        </div>
        {summary && summary.categories.length > 0 && (
          <div className={styles.categoryGrid}>
            {summary.categories.map((cat) => (
              <div key={cat.category} className={styles.categoryCard}>
                <div className={styles.categoryName}>{cat.category}</div>
                <div className={styles.categoryAmount}>{formatCurrency(cat.total)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses Table */}
      {loading ? (
        <Spinner centered size="lg" />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          message="No expenses found"
          subtitle={searchQuery || categoryFilter ? 'Try adjusting your search or filters' : `No expenses for ${getMonthLabel(month)}`}
          action={!searchQuery && !categoryFilter ? <Button variant="primary" onClick={openAdd}>Add Expense</Button> : undefined}
        />
      ) : (
        <Table striped>
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Category</Th>
              <Th>Amount</Th>
              <Th>Notes</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredExpenses.map((expense) => (
              <Tr key={expense.id}>
                <Td>{new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Td>
                <Td>{expense.categoryName}</Td>
                <Td className={styles.expenseAmount}>{formatCurrency(expense.amount)}</Td>
                <Td>{expense.notes ?? '-'}</Td>
                <Td>
                  <div className={styles.tableActions}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(expense)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(expense.id)}>Delete</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title={editId ? 'Edit Expense' : 'Add Expense'} size="sm">
        {error && <Alert variant="error" message={error} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
          <DatePicker label="Date" required value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          <Select label="Category" required options={categoryOptions} value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))} />
          <div className={styles.addCategoryRow}>
            <Input value={newCategoryName} onChange={(e) => { setNewCategoryName(e.target.value); setCategoryError(null); }} placeholder="New category name" maxLength={50} />
            <Button variant="outline" size="sm" loading={addingCategory} onClick={handleAddCategory} disabled={!newCategoryName.trim()}>Add</Button>
          </div>
          {categoryError && <Alert variant="error" message={categoryError} />}
          <Input label="Amount" required type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Expense amount" />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{editId ? 'Update' : 'Add'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
      >
        {deleteError && <Alert variant="error" message={deleteError} />}
      </ConfirmDialog>
    </div>
  );
}

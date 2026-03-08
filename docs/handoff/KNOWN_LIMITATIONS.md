# Known Limitations

Features explicitly excluded from the SRS scope. These are intentional omissions, not bugs.

> Reference: `docs/guardrails/SRS_GUARDRAILS.md`

---

## Communication & Notifications

| Feature | Status | Rationale |
|---------|--------|-----------|
| WhatsApp reminders | Not built | Out of SRS scope |
| SMS reminders | Not built | Out of SRS scope |
| Push notifications | Not built | Out of SRS scope |
| Parent-facing email reminders | Not built | Reminders are owner-facing only |

Current notification support: email fee reminders to academy owners (cron-based, 3 days before due date).

---

## Financial Features

| Feature | Status | Rationale |
|---------|--------|-----------|
| Discounts / discount codes | Not built | Out of SRS scope |
| Partial payments | Not built | Fees are mark-as-paid (full amount only) |
| Payment receipts / invoices | Not built | Out of SRS scope |
| Razorpay / Stripe integration | Not built | Cashfree is the sole payment gateway |
| Expense tracking | Not built | Out of SRS scope |
| GST / tax calculations | Not built | Out of SRS scope |
| Advanced financial reports | Not built | Basic fee summaries + revenue PDF only |

Current financial support: monthly fee due generation, mark-as-paid, staff payment requests, Cashfree subscription payments, revenue PDF export, pending dues PDF export.

---

## Web Portals

| Feature | Status | Rationale |
|---------|--------|-----------|
| Owner web portal | Not built | Owner access is mobile-only |
| Staff web portal | Not built | Staff access is mobile-only |
| Parent / student portal | Not built | Out of SRS scope |

Current web support: Super Admin console only (`apps/admin-web`).

---

## Academy Structure

| Feature | Status | Rationale |
|---------|--------|-----------|
| Multiple branches per academy | Not built | Single-academy model only |
| Sports / activities catalog | Not built | Out of SRS scope |
| Batch-wise attendance | Not built | Attendance is per-student, not per-batch |
| Batch scheduling / timetable | Not built | Out of SRS scope |
| Coach assignment to batches | Not built | Out of SRS scope |

Current support: single academy per owner, batches as student groupings, per-student daily attendance.

---

## HR & Staff Management

| Feature | Status | Rationale |
|---------|--------|-----------|
| Clock-in / clock-out | Not built | Out of SRS scope |
| Payroll | Not built | Out of SRS scope |
| Performance tracking | Not built | Out of SRS scope |
| Leave management | Not built | Out of SRS scope |

Current staff support: staff attendance (present/absent), staff payment requests, staff activation/deactivation.

---

## Advanced Features

| Feature | Status | Rationale |
|---------|--------|-----------|
| Multi-language (i18n) | Not built | English only |
| Dark mode | Not built | Out of SRS scope |
| Offline mode | Not built | Online-only |
| File uploads (photos, documents) | Not built | Out of SRS scope |
| Chat / messaging | Not built | Out of SRS scope |
| Charts / graphs analytics | Not built | Tabular reports only |
| Excel export | Not built | PDF export only |
| Custom fields / form builder | Not built | Fixed schemas |

---

## Data Integrity Constraints

These are not limitations but immutable design decisions:

| Entity | Rule |
|--------|------|
| Academy | Never deleted — disable only |
| User | Never deleted — deactivate via status |
| Student | Soft-delete only (status = 'DELETED') |
| Fee Due | Never deleted — status changes only |
| Attendance | Never deleted — can overwrite same date |
| Audit Log | Immutable — never modified or deleted |
| Subscription | Never deleted — new records for state changes |
| Holiday | Only entity that can be truly deleted (reversible operation) |

Verified by: `academy.retention.no-delete.e2e-spec.ts`

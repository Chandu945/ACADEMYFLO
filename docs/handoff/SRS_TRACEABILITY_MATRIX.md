# SRS Traceability Matrix

Maps every locked SRS requirement to its implementation modules, API endpoints, UI screens, and test coverage.

> Generated reference: `artifacts/handoff/traceability.json` (via `npm run handoff:generate`)

---

## 1. Platforms & Navigation

| Requirement | Backend Module | API Endpoints | Admin Web | Mobile Screens | Tests |
|-------------|---------------|---------------|-----------|----------------|-------|
| Mobile app (Owner + Staff) | — | — | — | All screens under `presentation/screens/` | 13 screen spec files |
| Super Admin web console | — | `admin/*` endpoints | 5 pages: login, dashboard, academies, detail, audit-logs | — | admin-auth, admin-academies E2E |
| API server (NestJS) | All domain modules | 81 routes across 15 controllers | — | — | 47 E2E + 61 unit tests |

## 2. Subscription Rules

| Requirement | Backend Module | API Endpoints | Admin Web | Mobile | Tests |
|-------------|---------------|---------------|-----------|--------|-------|
| 30-day trial from onboarding | `domain/subscription` | `POST /academy/setup` creates trial | — | `AcademySetupScreen` | `create-trial-subscription.usecase.spec.ts` |
| Trial → Grace (7 days) → Blocked | `subscription.rules.ts` | `GET /subscription/me` | Academy detail (status badge) | `SubscriptionScreen`, `SubscriptionBlockedScreen` | `subscription.rules.spec.ts`, `subscription.gating.e2e-spec.ts` |
| DISABLED state (admin toggle) | `academy-access.rules.ts` | `PUT /admin/academies/:id/login-disabled` | Academy detail toggle | `SubscriptionScreen` (Disabled badge) | `academy.disable-login.force-logout.e2e-spec.ts` |
| Blocked users: view subscription + sign out only | `SubscriptionEnforcementGuard` | Guard on all routes, allowlist for subscription paths | — | `SubscriptionBlockedScreen` | `subscription.gating.e2e-spec.ts` |

## 3. Tier Pricing

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| TIER_0_50 (0–50 students, ₹299/mo) | `subscription-tier.rules.ts` | `GET /subscription/me` (tiers array) | `SubscriptionScreen` (pricing table) | `subscription-tier.rules.spec.ts` |
| TIER_51_100 (51–100, ₹499/mo) | `subscription-tier.rules.ts` | Same | Same | Same |
| TIER_101_PLUS (101+, ₹699/mo) | `subscription-tier.rules.ts` | Same | Same | Same |
| Daily tier recomputation | `subscription-tier-cron.service.ts` | Cron job (00:10 IST) | — | `evaluate-tier.usecase.spec.ts` |
| Pending tier change display | `evaluate-tier.usecase.ts` | `GET /subscription/me` | `SubscriptionScreen` (UpgradeBanner) | `SubscriptionScreen.spec.tsx` |

## 4. Cashfree Payments

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Initiate payment | `initiate-subscription-payment.usecase.ts` | `POST /subscription-payments/initiate` | `PayWithCashfreeButton` | `initiate-subscription-payment.usecase.spec.ts`, E2E |
| Web checkout (Cashfree SDK) | `cashfree-web-checkout.ts` (mobile) | — | `usePaymentFlow` hook | `use-payment-flow.spec.ts` |
| Payment status polling | `get-subscription-payment-status.usecase.ts` | `GET /subscription-payments/:orderId/status` | `PaymentStatusBanner` | E2E spec |
| Webhook processing | `handle-cashfree-webhook.usecase.ts` | `POST /subscription-payments/cashfree/webhook` | — | `handle-cashfree-webhook.usecase.spec.ts`, webhook security E2E |
| Idempotent webhook handling | `subscription-payment.entity.ts` | Same | — | Webhook E2E (replay test) |
| Signature verification | `cashfree.signature.ts` | Same | — | `subscription-payments.webhook.security.e2e-spec.ts` |

## 5. Owner/Staff Roles & Permissions

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Owner: full CRUD | `RoleGuard`, all controllers | All endpoints (OWNER allowed) | All screens | `rbac.e2e-spec.ts`, `rbac.*.e2e-spec.ts` (7 files) |
| Staff: read-only + attendance + payment requests | `RoleGuard` | Filtered by `@Roles('STAFF')` | Limited nav | `rbac.e2e-spec.ts` |
| Staff: cannot manage fees, students (write), settings | Guards | 403 on restricted endpoints | Hidden UI | `rbac.fees.e2e-spec.ts`, `rbac.students.e2e-spec.ts` |
| Staff deactivation blocks requests | `InactiveStaffGuard` | 403 for inactive staff | Logout forced | `auth.inactive-staff-*.e2e-spec.ts` |

## 6. Authentication

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Email + phone login | `login.usecase.ts` | `POST /auth/login` | `LoginScreen` | `login.usecase.spec.ts`, `auth.e2e-spec.ts` |
| Owner signup (step 1) | `owner-signup.usecase.ts` | `POST /auth/owner/signup` | `OwnerSignupScreen` | `auth.e2e-spec.ts` |
| Academy setup (step 2) | `setup-academy.usecase.ts` | `POST /academy/setup` | `AcademySetupScreen` | `academy-onboarding.e2e-spec.ts` |
| JWT access + refresh tokens | `token-service.port.ts` | `POST /auth/refresh` | Auto-refresh in `api-client.ts` | `refresh.usecase.spec.ts` |
| OTP password reset | `request-password-reset.usecase.ts` | `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm` | `ForgotPasswordScreen` | `password-reset.e2e-spec.ts` |
| Rate limiting | `ThrottlerModule` | Global + per-route | — | `rate-limit.e2e-spec.ts` |

## 7. Student Management

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Create student | `create-student.usecase.ts` | `POST /students` | `StudentFormScreen` | Unit + E2E |
| Update student | `update-student.usecase.ts` | `PATCH /students/:id` | `StudentFormScreen` | Unit + E2E |
| Soft delete (owner only) | `soft-delete-student.usecase.ts` | `DELETE /students/:id` | — | Unit + E2E |
| Status: ACTIVE/INACTIVE/DELETED | `student.rules.ts` | `PATCH /students/:id/status` | `StudentsListScreen` | `student.rules.spec.ts` |
| Paginated list | `list-students.usecase.ts` | `GET /students?page=N&pageSize=N` | `StudentsListScreen` | Unit + E2E |
| Batch assignment | `set-student-batches.usecase.ts` | `PUT /students/:id/batches`, `GET /students/:id/batches` | — | Unit + E2E |
| No permanent deletion (SRS) | Soft delete only | No hard delete endpoint | — | `academy.retention.no-delete.e2e-spec.ts` |

## 8. Attendance

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Mark daily attendance (absent list) | `mark-student-attendance.usecase.ts` | `PUT /attendance/students/bulk` | `AttendanceScreen` | Unit + E2E |
| Individual mark | Same | `PUT /attendance/students/:id` | Same | Same |
| Holidays (owner declare/remove) | `declare-holiday.usecase.ts` | `POST /attendance/holidays`, `DELETE /attendance/holidays/:date` | — | Unit + E2E |
| Daily/monthly reports | Report use-cases | `GET /attendance/reports/*` | `AttendanceDailyReportScreen`, `AttendanceMonthlySummaryScreen` | E2E |
| Staff attendance | `mark-staff-attendance.usecase.ts` | `GET /staff-attendance`, `PUT /staff-attendance/:id` | — | `staff-attendance.e2e-spec.ts` |

## 9. Fees & Dues Engine

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Monthly dues auto-generation | `run-monthly-dues-engine.usecase.ts` | Cron job (00:10 IST daily) | — | `run-monthly-dues-engine.usecase.spec.ts` |
| Due date day (academy setting) | `academy.settings` | `GET /settings/academy`, `PUT /settings/academy` | `AcademySettingsScreen` | `settings.e2e-spec.ts` |
| Mid-month join (prorated eligibility) | `fee.rules.ts` | — | — | `fee.rules.spec.ts` |
| Mark fee paid (owner only) | `mark-fee-paid.usecase.ts` | `PUT /fees/students/:id/:month/pay` | `UnpaidDuesScreen` | Unit + E2E |
| Unpaid/paid fee lists | List use-cases | `GET /fees/dues`, `GET /fees/paid` | `UnpaidDuesScreen`, `PaidFeesScreen` | `fees.e2e-spec.ts` |
| Student fee history | — | `GET /fees/students/:id` | `StudentFeeDetailScreen` | E2E |
| No discounts/partials/receipts (SRS) | Not implemented | — | — | See [Known Limitations](KNOWN_LIMITATIONS.md) |

## 10. Staff Payment Requests

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Staff creates request | `create-payment-request.usecase.ts` | `POST /fees/payment-requests` | `PaymentRequestFormScreen` | Unit + E2E |
| Owner approves/rejects | `approve-payment-request.usecase.ts` | `PUT /fees/payment-requests/:id/approve`, `/reject` | `PendingApprovalsScreen` | Unit + E2E |
| Staff cancels own | — | `PUT /fees/payment-requests/:id/cancel` | `MyPaymentRequestsScreen` | E2E |
| Transaction logs | — | `GET /fees/payment-requests/transactions` | — | E2E |

## 11. Reports & PDF Export

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Student-wise dues | Report use-cases | `GET /reports/student-wise-dues` | `ReportsHomeScreen` | `reports.e2e-spec.ts` |
| Month-wise dues | Same | `GET /reports/month-wise-dues` | Same | Same |
| Monthly revenue | Same | `GET /reports/monthly-revenue` | Same | `get-monthly-revenue.usecase.spec.ts` |
| Revenue PDF export | PDF generator | `GET /reports/revenue/export.pdf` | PDF download | `export-revenue-pdf.usecase.spec.ts` |
| Pending dues PDF | Same | `GET /reports/dues/pending/export.pdf` | PDF download | E2E |

## 12. Email Fee Reminders

| Requirement | Backend Module | API Endpoints | Mobile | Tests |
|-------------|---------------|---------------|--------|-------|
| Daily reminders (3 days before due) | `send-fee-reminders.usecase.ts` | Cron job (09:00 IST) | — | `send-fee-reminders.usecase.spec.ts`, `fee-reminders.job.spec.ts` |
| Kill-switch via config | `FEE_REMINDER_ENABLED` env | — | — | Tested in cron service |
| HTML email template | `fee-reminder-template.ts` | — | — | `fee-reminder-template.spec.ts` |

## 13. Audit Logs

| Requirement | Backend Module | API Endpoints | Admin Web | Mobile | Tests |
|-------------|---------------|---------------|-----------|--------|-------|
| Record all mutations | `AuditRecorderService` | Implicit (use-case level) | — | — | `audit-recorder.service.spec.ts` |
| List academy audit logs | `list-audit-logs.usecase.ts` | `GET /audit-logs` | — | `AuditLogsScreen` | `audit-logs.e2e-spec.ts` |
| Admin view academy logs | — | `GET /admin/academies/:id/audit-logs` | Audit logs page | — | `admin-academies.e2e-spec.ts` |

## 14. Super Admin Console

| Requirement | Backend Module | API Endpoints | Admin Web | Tests |
|-------------|---------------|---------------|-----------|-------|
| Admin login | `admin-auth.controller.ts` | `POST /admin/auth/login` | Login page | `admin-auth.e2e-spec.ts` |
| Dashboard tiles | `admin.controller.ts` | `GET /admin/dashboard` | Dashboard page | `admin-academies.e2e-spec.ts` |
| Academies list + detail | Same | `GET /admin/academies`, `GET /admin/academies/:id` | Academies + detail pages | Same |
| Set subscription manually | Same | `PUT /admin/academies/:id/subscription` | Detail page action | Same |
| Deactivate subscription | Same | `POST /admin/academies/:id/deactivate` | Detail page action | Same |
| Disable/enable login | Same | `PUT /admin/academies/:id/login-disabled` | Detail page toggle | `academy.disable-login.force-logout.e2e-spec.ts` |
| Force logout | Same | `POST /admin/academies/:id/force-logout` | Detail page action | Same |
| Reset owner password | `reset-owner-password.usecase.ts` | `POST /admin/academies/:id/reset-password` | Detail page action | `reset-owner-password.usecase.spec.ts` |

## 15. Backups & Retention

| Requirement | Backend Module | Tests |
|-------------|---------------|-------|
| Deactivate only (no hard delete) | Soft delete patterns throughout | `academy.retention.no-delete.e2e-spec.ts` |
| Daily backup snapshots | `scripts/backup/` | Operational (not automated test) |
| Restore procedure | `scripts/backup/restore-mongodump.sh` | Operational |

## 16. Reliability & Hardening

| Requirement | Backend Module | Tests |
|-------------|---------------|-------|
| Distributed cron locks | `job-lock.service.ts` | `job-lock.service.spec.ts`, `cron.locking.e2e-spec.ts` |
| External call timeouts/retries | `external-call-policy.ts` | `external-call-policy.spec.ts` |
| Graceful shutdown | `main.ts` (shutdown hooks) | — |
| Dependency audit | `scripts/hardening/dependency-audit.mjs` | CI hardening job |
| License compliance | `scripts/hardening/license-report.mjs` | CI hardening job |
| Secrets scan | `scripts/hardening/secrets-scan.mjs` | CI hardening job |

---

## Test Coverage Summary

| Workspace | Unit Tests | E2E Tests | Screen Tests | Total |
|-----------|-----------|-----------|--------------|-------|
| API | 61 spec files | 47 E2E spec files | — | 108 |
| Mobile | 26 spec files | — | 13 screen specs | 39 + 2 hook specs |
| Admin Web | Component tests | — | — | In coverage report |
| **Total** | **87+** | **47** | **13** | **149+** |

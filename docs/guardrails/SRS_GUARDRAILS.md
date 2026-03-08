# SRS Guardrails

Explicit boundaries for PlayConnect development. These guardrails prevent scope creep and ensure the codebase stays aligned with the Software Requirements Specification.

## Do Not Implement in MVP

The following features are explicitly out of scope. Do not implement, design, or add infrastructure for them:

### Communication & Notifications

- [ ] WhatsApp reminders or notifications
- [ ] SMS reminders or notifications
- [ ] Push notifications (mobile)
- [ ] Email reminders to parents (fee reminders are internal owner-facing only)

### Financial Features

- [ ] Discounts or discount codes
- [ ] Partial payments
- [ ] Payment receipts or invoices
- [ ] Payment gateway integration (Razorpay, Stripe, etc.)
- [ ] Expense tracking
- [ ] Financial reports beyond basic fee collection summaries
- [ ] GST/tax calculations

### Web Portals

- [ ] Owner web portal (owners use mobile app only)
- [ ] Staff web portal (staff uses mobile app only)
- [ ] Parent/student portal

### Academy Structure

- [ ] Multiple branches per academy
- [ ] Sports/activities offered catalog
- [ ] Batch-wise attendance (attendance is per-student, not per-batch)
- [ ] Batch scheduling / timetable
- [ ] Coach/instructor assignment to batches

### HR & Staff Management

- [ ] Staff clock-in/clock-out
- [ ] Staff payroll
- [ ] Staff performance tracking
- [ ] Leave management

### Advanced Features

- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Offline mode / local-first sync
- [ ] File uploads (photos, documents)
- [ ] Chat or messaging between users
- [ ] Analytics dashboard with charts/graphs
- [ ] Export to Excel/PDF (beyond basic CSV)
- [ ] Custom fields or form builder

## Architectural Guardrails

### Business Logic Placement

**Rule:** No business logic in controllers. Controllers handle HTTP concerns only (request parsing, response formatting, status codes).

```
CORRECT:
  Controller → UseCase → Domain Entity → Repository

WRONG:
  Controller → Repository (skipping use case)
  Controller → (inline business logic) → Repository
```

### Database Access

**Rule:** No direct database access outside repositories. All DB operations go through repository interfaces.

```
CORRECT:
  UseCase → UserRepository (interface) → InMemoryUserRepository / MongoUserRepository

WRONG:
  UseCase → mongoose.model('User').find(...)
  Controller → db.collection('users').findOne(...)
```

### Input Validation

**Rule:** No unvalidated inputs reach use cases. All external input is validated at the DTO/controller level.

- HTTP requests: validated by class-validator DTOs with `ValidationPipe`
- Mobile inputs: validated before calling API
- Admin inputs: validated by DTOs on admin controller

### Data Integrity

**Rule:** Never delete academy data. Use soft-delete or status changes only.

| Entity       | Delete Strategy                                                       |
| ------------ | --------------------------------------------------------------------- |
| Academy      | Never deleted. Disable via `loginDisabled` or `DISABLED` subscription |
| User         | Never deleted. Deactivate via status change                           |
| Student      | Soft-delete: `status: 'DELETED'`, record remains in DB                |
| Staff        | Never deleted. Deactivate via status change                           |
| Fee Due      | Never deleted. Status changes: `PENDING → PAID/WAIVED`                |
| Attendance   | Never deleted. Can be overwritten for the same date                   |
| Audit Log    | Immutable. Never modified or deleted                                  |
| Subscription | Never deleted. New records created for changes                        |
| Holiday      | Can be removed (the only true delete, reversible)                     |

### Authentication & Authorization

**Rule:** Every endpoint (except health/liveness) must be protected.

- Public: health endpoints only (`/api/v1/health/*`)
- Auth required: all other endpoints (JWT via `JwtAuthGuard`)
- Role required: all protected endpoints use `@Roles()` decorator
- Subscription required: `SubscriptionEnforcementGuard` checks `canAccessApp`

RBAC matrix:

| Role          | Access                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `OWNER`       | Full academy management (students, staff, fees, attendance, settings, reports, audit logs)     |
| `STAFF`       | Limited: attendance marking, fee viewing, student list, settings viewing                       |
| `SUPER_ADMIN` | Admin panel only: academy list, details, force-logout, password reset, subscription management |

### API Response Consistency

**Rule:** All API responses follow the standard shape:

```json
// Success
{ "data": { ... }, "requestId": "..." }

// Error
{ "error": "ERROR_CODE", "message": "...", "requestId": "..." }
```

### Environment Segregation

| Environment | Purpose                | Data                         |
| ----------- | ---------------------- | ---------------------------- |
| Development | Local development      | Fake/seed data               |
| Staging     | Pre-production testing | Anonymized copy or test data |
| Production  | Live users             | Real data                    |

**Rules:**

- Never use production credentials in development or staging
- Never copy production data to development without anonymization
- Staging should mirror production config but with test data
- Feature flags or env vars control environment-specific behavior

### Dependency Rules (Clean Architecture)

```
Presentation (controllers, guards) → Application (use cases) → Domain (entities, ports)
                                                                    ↑
Infrastructure (repositories, adapters) ─────────────────────────────┘
```

- Domain layer has zero external dependencies
- Application layer depends only on domain ports (interfaces)
- Infrastructure implements domain ports
- Presentation depends on application layer via use case injection
- Boundary validation enforced by `npm run validate:boundaries` and `npm run validate:architecture`

## Decision Records

When considering a feature that might violate these guardrails:

1. Check this document first
2. If the feature is in the "do not implement" list, do not proceed
3. If the feature requires an architectural exception, document the decision with:
   - What the exception is
   - Why it's needed
   - What risks it introduces
   - Who approved it
4. Update this document if the SRS changes

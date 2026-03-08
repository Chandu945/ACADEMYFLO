/**
 * Canonical index specification.
 *
 * Every index defined in Mongoose schemas should be listed here.
 * The IndexVerifierService checks at startup (when INDEX_ASSERTION_ENABLED=true)
 * that all these indexes exist in MongoDB.
 */
export interface IndexDefinition {
  collection: string;
  keys: Record<string, 1 | -1>;
  unique?: boolean;
  sparse?: boolean;
  ttlSeconds?: number;
}

export const INDEX_SPEC: IndexDefinition[] = [
  // ── sessions ──
  { collection: 'sessions', keys: { userId: 1, deviceId: 1 }, unique: true },
  { collection: 'sessions', keys: { expiresAt: 1 }, ttlSeconds: 7 * 24 * 60 * 60 },

  // ── users ──
  { collection: 'users', keys: { role: 1, status: 1 } },
  { collection: 'users', keys: { academyId: 1, role: 1 } },

  // ── batches ──
  { collection: 'batches', keys: { academyId: 1, batchNameNormalized: 1 }, unique: true },
  { collection: 'batches', keys: { academyId: 1, createdAt: -1 } },

  // ── students ──
  { collection: 'students', keys: { academyId: 1, status: 1, createdAt: -1 } },
  { collection: 'students', keys: { academyId: 1, status: 1, joiningDate: 1 } },
  { collection: 'students', keys: { academyId: 1, fullNameNormalized: 1 } },

  // ── studentattendances ──
  {
    collection: 'studentattendances',
    keys: { academyId: 1, studentId: 1, date: 1 },
    unique: true,
  },
  { collection: 'studentattendances', keys: { academyId: 1, date: 1 } },

  // ── holidays ──
  { collection: 'holidays', keys: { academyId: 1, date: 1 }, unique: true },

  // ── feedues ──
  {
    collection: 'feedues',
    keys: { academyId: 1, studentId: 1, monthKey: 1 },
    unique: true,
  },
  { collection: 'feedues', keys: { academyId: 1, monthKey: 1, status: 1 } },
  { collection: 'feedues', keys: { dueDate: 1, status: 1 } },

  // ── paymentrequests ──
  { collection: 'paymentrequests', keys: { academyId: 1, status: 1 } },
  { collection: 'paymentrequests', keys: { feeDueId: 1, status: 1 } },
  { collection: 'paymentrequests', keys: { staffUserId: 1, academyId: 1 } },

  // ── transactionlogs ──
  { collection: 'transactionlogs', keys: { academyId: 1, createdAt: -1 } },
  {
    collection: 'transactionlogs',
    keys: { paymentRequestId: 1 },
    unique: true,
    sparse: true,
  },
  { collection: 'transactionlogs', keys: { academyId: 1, receiptNumber: 1 }, unique: true },
  { collection: 'transactionlogs', keys: { academyId: 1, source: 1, createdAt: -1 } },
  { collection: 'transactionlogs', keys: { academyId: 1, monthKey: 1 } },

  // ── staffattendances ──
  {
    collection: 'staffattendances',
    keys: { academyId: 1, staffUserId: 1, date: 1 },
    unique: true,
  },
  { collection: 'staffattendances', keys: { academyId: 1, date: 1 } },

  // ── auditlogs ──
  { collection: 'auditlogs', keys: { academyId: 1, createdAt: -1 } },
  { collection: 'auditlogs', keys: { academyId: 1, action: 1, createdAt: -1 } },

  // ── subscriptions ──
  { collection: 'subscriptions', keys: { paidEndAt: 1 } },
];

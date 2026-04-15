/* eslint-disable */
// One-off cascade verification — run with:
//   cd apps/api && node --experimental-vm-modules scripts/test-deletion-cascade.mjs
//
// Steps:
//  1. connects to MongoDB
//  2. backdates the pending deletion request to "now"
//  3. bootstraps Nest application context
//  4. invokes ExecuteAccountDeletionUseCase.sweep()
//  5. prints before/after counts for the academy's collections

import { config } from 'dotenv';
import { resolve } from 'path';
import { MongoClient } from '../../../node_modules/mongoose/node_modules/mongodb/lib/index.js';

config({ path: resolve(process.cwd(), '.env') });

const TARGET_OWNER_EMAIL = 'deletetest@playconnect.dev';
const TARGET_ACADEMY_ID = 'e8efdbb4-fd98-4d6d-be9b-23dd7a41beb8';
const URI = process.env.MONGODB_URI;
if (!URI) throw new Error('MONGODB_URI not set');

const COLLECTIONS = [
  'users',
  'students',
  'batches',
  'student_batches',
  'parent_student_links',
  'student_attendance',
  'staff_attendance',
  'holidays',
  'fee_dues',
  'fee_payments',
  'payment_requests',
  'transaction_logs',
  'expenses',
  'expense_categories',
  'enquiries',
  'events',
  'gallery_photos',
  'subscriptions',
  'sessions',
  'device_tokens',
  'password_reset_challenges',
  'academies',
  'audit_logs',
  'subscription_payments',
  'account_deletion_requests',
];

async function snapshot(db) {
  const out = {};
  for (const c of COLLECTIONS) {
    const filter =
      c === 'sessions' || c === 'device_tokens' || c === 'password_reset_challenges'
        ? { userId: { $exists: true } }
        : c === 'academies'
          ? { _id: TARGET_ACADEMY_ID }
          : c === 'users'
            ? { academyId: TARGET_ACADEMY_ID }
            : c === 'account_deletion_requests'
              ? { academyId: TARGET_ACADEMY_ID }
              : { academyId: TARGET_ACADEMY_ID };
    out[c] = await db.collection(c).countDocuments(filter);
  }
  return out;
}

const client = new MongoClient(URI);
await client.connect();
const db = client.db('playconnect');
console.log('--- BEFORE ---');
console.log(await snapshot(db));

console.log('Backdating deletion request...');
const upd = await db.collection('account_deletion_requests').updateMany(
  { academyId: TARGET_ACADEMY_ID, status: 'REQUESTED' },
  { $set: { scheduledExecutionAt: new Date(Date.now() - 1000) } },
);
console.log(`  modified: ${upd.modifiedCount}`);
await client.close();

console.log('Booting Nest app context to invoke sweep()...');
const { NestFactory } = await import('../node_modules/@nestjs/core/index.js');
const { AppModule } = await import('../dist/app.module.js');
const { ExecuteAccountDeletionUseCase } = await import(
  '../dist/application/account-deletion/use-cases/execute-account-deletion.usecase.js'
);

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error'] });
const sweeper = app.get(ExecuteAccountDeletionUseCase);
const result = await sweeper.sweep(new Date(), 50);
console.log('Sweep result:', result);
await app.close();

console.log('--- AFTER ---');
const client2 = new MongoClient(URI);
await client2.connect();
const db2 = client2.db('playconnect');
console.log(await snapshot(db2));

console.log('Owner user state (anonymized?):');
const owner = await db2.collection('users').findOne({ emailNormalized: TARGET_OWNER_EMAIL });
console.log(owner);
const anonOwner = await db2.collection('users').findOne({
  emailNormalized: { $regex: /^deleted-/ },
});
console.log('Found anonymized record by regex:', anonOwner ? anonOwner._id : 'none');

const academy = await db2.collection('academies').findOne({ _id: TARGET_ACADEMY_ID });
console.log('Academy tombstone:', academy ? { status: academy.status, deletedAt: academy.deletedAt } : 'missing');

const completed = await db2
  .collection('account_deletion_requests')
  .findOne({ academyId: TARGET_ACADEMY_ID });
console.log('Deletion request final state:', completed ? { status: completed.status, completedAt: completed.completedAt } : 'missing');

await client2.close();

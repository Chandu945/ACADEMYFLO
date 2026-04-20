/* eslint-disable */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { MongoClient } = require('../../../node_modules/mongoose/node_modules/mongodb');

const TARGET_OWNER_EMAIL = 'deletetest@academyflo.dev';
const TARGET_ACADEMY_ID = 'e8efdbb4-fd98-4d6d-be9b-23dd7a41beb8';
const URI = process.env.MONGODB_URI;

const COLLECTIONS = [
  'users', 'students', 'batches', 'student_batches', 'parent_student_links',
  'student_attendance', 'staff_attendance', 'holidays', 'fee_dues', 'fee_payments',
  'payment_requests', 'transaction_logs', 'expenses', 'expense_categories',
  'enquiries', 'events', 'gallery_photos', 'subscriptions', 'sessions',
  'device_tokens', 'password_reset_challenges', 'academies', 'audit_logs',
  'subscription_payments', 'account_deletion_requests',
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
            : { academyId: TARGET_ACADEMY_ID };
    out[c] = await db.collection(c).countDocuments(filter);
  }
  return out;
}

(async () => {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db('academyflo');

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
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/app.module.js');
  const {
    ExecuteAccountDeletionUseCase,
  } = require('../dist/application/account-deletion/use-cases/execute-account-deletion.usecase.js');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error'] });
  const sweeper = app.get(ExecuteAccountDeletionUseCase);
  const result = await sweeper.sweep(new Date(), 50);
  console.log('Sweep result:', result);
  await app.close();

  console.log('--- AFTER ---');
  const c2 = new MongoClient(URI);
  await c2.connect();
  const d2 = c2.db('academyflo');
  console.log(await snapshot(d2));

  const owner = await d2.collection('users').findOne({ emailNormalized: TARGET_OWNER_EMAIL });
  console.log('Owner by original email (should be null after anonymization):', owner ? owner._id : null);

  const anonOwner = await d2.collection('users').findOne(
    { emailNormalized: { $regex: /^deleted-/ } },
    { projection: { _id: 1, emailNormalized: 1, fullName: 1, status: 1, deletedAt: 1, tokenVersion: 1 } },
  );
  console.log('Anonymized record:', anonOwner);

  const academy = await d2.collection('academies').findOne({ _id: TARGET_ACADEMY_ID });
  console.log('Academy tombstone:', academy ? { status: academy.status, deletedAt: academy.deletedAt } : 'missing');

  const completed = await d2.collection('account_deletion_requests').findOne(
    { academyId: TARGET_ACADEMY_ID, status: 'COMPLETED' },
    { projection: { _id: 1, status: 1, completedAt: 1 } },
  );
  console.log('Completed deletion request:', completed);

  await c2.close();
})().catch((e) => {
  console.error('FAILED', e);
  process.exit(1);
});

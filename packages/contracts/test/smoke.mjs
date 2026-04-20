// Smoke test: ensure the built package loads and exports the expected names.
// Run after `npm run build`; called from the "test" script.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distIndex = resolve(here, '..', 'dist', 'index.js');
const distTypes = resolve(here, '..', 'dist', 'index.d.ts');

// 1. dist/index.js loads without runtime errors and exports the key value-side constants.
const mod = await import(distIndex);

const requiredValueExports = [
  'USER_ROLES',
  'SUBSCRIPTION_STATUSES',
  'TIER_KEYS',
  'TIER_PRICING_INR',
  'TIER_RANGES',
  'STUDENT_ATTENDANCE_STATUSES',
  'STAFF_ATTENDANCE_STATUSES',
  'STUDENT_STATUSES',
  'STAFF_STATUSES',
  'WEEKDAYS',
  'TRIAL_DURATION_DAYS',
];

for (const name of requiredValueExports) {
  assert.ok(name in mod, `missing export: ${name}`);
  assert.ok(
    mod[name] !== undefined && mod[name] !== null,
    `export ${name} is null/undefined`,
  );
}

// 2. dist/index.d.ts exists and re-exports the key type names.
const dts = await readFile(distTypes, 'utf-8');
const requiredTypeExports = [
  'UserRole',
  'SubscriptionStatus',
  'TierKey',
  'ApiResponse',
  'Paginated',
];
for (const name of requiredTypeExports) {
  assert.match(dts, new RegExp(`\\b${name}\\b`), `missing type in d.ts: ${name}`);
}

console.log(`✓ contracts smoke test passed (${requiredValueExports.length} value + ${requiredTypeExports.length} type exports verified)`);

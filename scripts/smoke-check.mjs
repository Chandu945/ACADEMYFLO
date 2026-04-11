#!/usr/bin/env node

/**
 * Post-deploy smoke check — verifies core endpoints are responding.
 *
 * Usage:
 *   node scripts/smoke-check.mjs [API_URL] [ADMIN_URL]
 *
 * Environment variables (override CLI args):
 *   API_URL    — default http://localhost:3001
 *   ADMIN_URL  — default http://localhost:3002
 */

const API_URL = process.env.API_URL || process.argv[2] || 'http://localhost:3001';
const ADMIN_URL = process.env.ADMIN_URL || process.argv[3] || 'http://localhost:3002';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const checks = [
  {
    name: 'API Liveness',
    url: `${API_URL}/api/v1/health/liveness`,
    expect: [200],
  },
  {
    name: 'API Readiness',
    url: `${API_URL}/api/v1/health/readiness`,
    expect: [200],
  },
  {
    name: 'Admin Web',
    url: `${ADMIN_URL}/`,
    expect: [200, 301, 302, 303, 307, 308],
  },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkEndpoint(check) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(check.url, { redirect: 'manual' });
      if (check.expect.includes(res.status)) {
        return { ...check, status: res.status, pass: true, attempt };
      }
      console.log(
        `  [${check.name}] attempt ${attempt}/${MAX_RETRIES} — got ${res.status}, expected ${check.expect.join('/')}`,
      );
    } catch (err) {
      console.log(
        `  [${check.name}] attempt ${attempt}/${MAX_RETRIES} — ${err.cause?.code || err.message}`,
      );
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  return { ...check, status: 'FAIL', pass: false, attempt: MAX_RETRIES };
}

async function main() {
  console.log('Academyflo Smoke Check');
  console.log(`  API:   ${API_URL}`);
  console.log(`  Admin: ${ADMIN_URL}`);
  console.log('');

  const results = [];
  for (const check of checks) {
    const result = await checkEndpoint(check);
    results.push(result);
  }

  // Summary table
  console.log('');
  console.log('--- Results ---');
  console.log('Endpoint'.padEnd(20) + 'URL'.padEnd(50) + 'Status'.padEnd(10) + 'Result');
  console.log('-'.repeat(90));

  for (const r of results) {
    const statusStr = String(r.status).padEnd(10);
    const result = r.pass ? 'PASS' : 'FAIL';
    console.log(r.name.padEnd(20) + r.url.padEnd(50) + statusStr + result);
  }

  console.log('');

  const allPassed = results.every((r) => r.pass);
  if (allPassed) {
    console.log('All checks passed.');
    process.exit(0);
  } else {
    const failed = results.filter((r) => !r.pass);
    console.log(`${failed.length} check(s) failed.`);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

/**
 * End-to-end smoke suite for staging verification.
 *
 * Validates:
 *   1. API health + readiness endpoints
 *   2. Admin web flows (login, dashboard, academies)
 *   3. Owner API flows (subscription, dashboard, students)
 *
 * Environment:
 *   STAGING_API_URL       - e.g. https://staging-api.academyflo.com
 *   STAGING_ADMIN_URL     - e.g. https://staging-admin.academyflo.com
 *   SMOKE_ADMIN_EMAIL     - super admin email for staging
 *   SMOKE_ADMIN_PASSWORD  - super admin password for staging
 *   SMOKE_OWNER_EMAIL     - owner email for staging
 *   SMOKE_OWNER_PASSWORD  - owner password for staging
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_URL = process.env.STAGING_API_URL || 'http://localhost:3001';
const ADMIN_URL = process.env.STAGING_ADMIN_URL || 'http://localhost:3002';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;
const OWNER_EMAIL = process.env.SMOKE_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.SMOKE_OWNER_PASSWORD;

const results = [];

async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`  ✓ ${name} (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, duration, error: message });
    console.error(`  ✗ ${name} (${duration}ms): ${message}`);
  }
}

async function fetchJson(url, opts) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

async function login(email, password) {
  const data = await fetchJson(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.data?.accessToken || data.accessToken;
}

// ── API Health Checks ──
console.log('\n── API Health Checks ──');

await check('GET /api/v1/health/liveness', async () => {
  const res = await fetch(`${API_URL}/api/v1/health/liveness`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

await check('GET /api/v1/health/readiness', async () => {
  const res = await fetch(`${API_URL}/api/v1/health/readiness`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

// ── Admin Web Checks ──
console.log('\n── Admin Web Checks ──');

await check('Admin web login page loads', async () => {
  const res = await fetch(`${ADMIN_URL}/login`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes('</html>')) throw new Error('Invalid HTML response');
});

if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  let adminToken;

  await check('Admin login via API', async () => {
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) throw new Error('No token returned');
  });

  await check('Admin dashboard tiles load', async () => {
    if (!adminToken) throw new Error('No admin token');
    const data = await fetchJson(`${API_URL}/api/v1/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!data.data && !data.totalAcademies && data.totalAcademies !== 0) {
      throw new Error('Dashboard response missing expected fields');
    }
  });

  await check('Admin academies list loads', async () => {
    if (!adminToken) throw new Error('No admin token');
    const data = await fetchJson(`${API_URL}/api/v1/admin/academies?page=1&pageSize=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = data.data?.items || data.items;
    if (!Array.isArray(items)) throw new Error('Expected items array');
  });
} else {
  console.log('  ⊘ Skipping admin flow (no SMOKE_ADMIN_EMAIL/PASSWORD)');
}

// ── Owner API Checks ──
console.log('\n── Owner API Checks ──');

if (OWNER_EMAIL && OWNER_PASSWORD) {
  let ownerToken;

  await check('Owner login', async () => {
    ownerToken = await login(OWNER_EMAIL, OWNER_PASSWORD);
    if (!ownerToken) throw new Error('No token returned');
  });

  await check('GET /api/v1/subscription/me', async () => {
    if (!ownerToken) throw new Error('No owner token');
    await fetchJson(`${API_URL}/api/v1/subscription/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
  });

  await check('GET /api/v1/dashboard/owner?kpiPreset=THIS_MONTH', async () => {
    if (!ownerToken) throw new Error('No owner token');
    await fetchJson(`${API_URL}/api/v1/dashboard/owner?kpiPreset=THIS_MONTH`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
  });

  await check('GET /api/v1/students?page=1&pageSize=20', async () => {
    if (!ownerToken) throw new Error('No owner token');
    await fetchJson(`${API_URL}/api/v1/students?page=1&pageSize=20`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
  });
} else {
  console.log('  ⊘ Skipping owner flow (no SMOKE_OWNER_EMAIL/PASSWORD)');
}

// ── Results ──
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const total = results.length;

console.log(`\n── Results: ${passed}/${total} passed, ${failed} failed ──`);

mkdirSync('artifacts', { recursive: true });
writeFileSync(
  join('artifacts', 'smoke-results.json'),
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      apiUrl: API_URL.replace(/\/\/[^@]*@/, '//***@'), // redact creds in URL
      total,
      passed,
      failed,
      checks: results,
    },
    null,
    2,
  ),
);

if (failed > 0) {
  console.error('\nSmoke suite FAILED');
  process.exit(1);
}

console.log('\nSmoke suite PASSED');

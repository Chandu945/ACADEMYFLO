#!/usr/bin/env node

/**
 * Generate a JSON test report from CI job outcomes.
 *
 * When run in CI, reads job results from CI_* environment variables.
 * When run locally, falls back to running ci:verify (the sequential runner).
 *
 * Output: ./artifacts/test-report.json
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACTS_DIR = join(ROOT, 'artifacts');

const GATE_ENV_MAP = {
  lint: 'CI_LINT',
  typecheck: 'CI_TYPECHECK',
  'unit-tests': 'CI_UNIT_TESTS',
  'e2e-tests': 'CI_E2E_TESTS',
  boundaries: 'CI_BOUNDARIES',
  contracts: 'CI_CONTRACTS',
  format: 'CI_FORMAT',
  hardening: 'CI_HARDENING',
};

mkdirSync(ARTIFACTS_DIR, { recursive: true });

// Check if we're in CI with job result env vars
const hasEnvVars = Object.values(GATE_ENV_MAP).some((key) => process.env[key]);

if (!hasEnvVars) {
  // Running locally — delegate to the sequential runner
  process.stdout.write('No CI env vars detected. Use "npm run ci:verify" for local runs.\n');
  process.exit(0);
}

// Build report from CI job outcomes
const gates = Object.entries(GATE_ENV_MAP).map(([name, envKey]) => {
  const result = process.env[envKey] ?? 'unknown';
  return {
    gate: name,
    result,
    passed: result === 'success',
  };
});

const allPassed = gates.every((g) => g.passed);

// Collect coverage summaries from each workspace
const COVERAGE_THRESHOLD = 80;
const WORKSPACES = [
  { name: 'api', path: join(ROOT, 'apps/api/coverage/coverage-summary.json') },
  { name: 'admin-web', path: join(ROOT, 'apps/admin-web/coverage/coverage-summary.json') },
  { name: 'mobile', path: join(ROOT, 'apps/mobile/coverage/coverage-summary.json') },
];

const coverage = WORKSPACES.map(({ name, path: coveragePath }) => {
  if (!existsSync(coveragePath)) {
    return {
      workspace: name,
      found: false,
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
      meetsThreshold: false,
    };
  }
  try {
    const raw = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    const total = raw.total || {};
    const statements = total.statements?.pct ?? 0;
    const branches = total.branches?.pct ?? 0;
    const functions = total.functions?.pct ?? 0;
    const lines = total.lines?.pct ?? 0;
    const meetsThreshold =
      statements >= COVERAGE_THRESHOLD &&
      branches >= COVERAGE_THRESHOLD &&
      functions >= COVERAGE_THRESHOLD &&
      lines >= COVERAGE_THRESHOLD;
    return { workspace: name, found: true, statements, branches, functions, lines, meetsThreshold };
  } catch {
    return {
      workspace: name,
      found: false,
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
      meetsThreshold: false,
    };
  }
});

const report = {
  timestamp: new Date().toISOString(),
  allPassed,
  source: 'github-actions',
  summary: {
    total: gates.length,
    passed: gates.filter((g) => g.passed).length,
    failed: gates.filter((g) => !g.passed).length,
  },
  gates,
  coverage: {
    threshold: COVERAGE_THRESHOLD,
    workspaces: coverage,
    allMeetThreshold: coverage.every((c) => c.meetsThreshold),
  },
};

const reportPath = join(ARTIFACTS_DIR, 'test-report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

process.stdout.write(`Report written to: ${reportPath}\n`);
process.stdout.write(`Result: ${allPassed ? 'ALL GATES PASSED' : 'SOME GATES FAILED'}\n`);

// Print coverage summary
process.stdout.write('\nCoverage Summary (threshold: ' + COVERAGE_THRESHOLD + '%):\n');
for (const c of coverage) {
  const status = !c.found ? 'NOT FOUND' : c.meetsThreshold ? 'PASS' : 'FAIL';
  process.stdout.write(
    `  ${c.workspace}: statements=${c.statements}% branches=${c.branches}% functions=${c.functions}% lines=${c.lines}% [${status}]\n`,
  );
}

#!/usr/bin/env node

/**
 * Full Hardening Sweep
 *
 * Orchestrates all hardening scripts in sequence:
 * 1. dependency-audit.mjs
 * 2. license-report.mjs
 * 3. secrets-scan.mjs
 *
 * Writes a combined report to artifacts/hardening-report.json.
 * Exits 1 if any individual script fails.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACTS_DIR = join(ROOT, 'artifacts');
const SCRIPTS_DIR = join(ROOT, 'scripts/hardening');

mkdirSync(ARTIFACTS_DIR, { recursive: true });

const SCRIPTS = [
  { name: 'dependency-audit', script: 'dependency-audit.mjs', artifact: 'dependency-audit.json' },
  { name: 'license-report', script: 'license-report.mjs', artifact: 'licenses.json' },
  { name: 'secrets-scan', script: 'secrets-scan.mjs', artifact: 'secrets-scan.json' },
];

const results = [];
let allPassed = true;

for (const { name, script, artifact } of SCRIPTS) {
  process.stdout.write(`\n${'='.repeat(60)}\n`);
  process.stdout.write(`Running: ${name}\n`);
  process.stdout.write(`${'='.repeat(60)}\n`);

  let passed = false;
  try {
    execSync(`node ${join(SCRIPTS_DIR, script)}`, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'inherit',
    });
    passed = true;
  } catch {
    passed = false;
    allPassed = false;
  }

  // Load the individual report if it exists
  const artifactPath = join(ARTIFACTS_DIR, artifact);
  let report = null;
  if (existsSync(artifactPath)) {
    try {
      report = JSON.parse(readFileSync(artifactPath, 'utf-8'));
    } catch {
      // Ignore parse errors
    }
  }

  results.push({
    name,
    passed,
    artifact,
    summary: report?.summary || null,
  });
}

process.stdout.write(`\n${'='.repeat(60)}\n`);
process.stdout.write(`Hardening Sweep Summary\n`);
process.stdout.write(`${'='.repeat(60)}\n`);

for (const r of results) {
  process.stdout.write(`  ${r.name}: ${r.passed ? 'PASSED' : 'FAILED'}\n`);
}

const combinedReport = {
  timestamp: new Date().toISOString(),
  tool: 'hardening-sweep',
  allPassed,
  results,
};

const reportPath = join(ARTIFACTS_DIR, 'hardening-report.json');
writeFileSync(reportPath, JSON.stringify(combinedReport, null, 2), 'utf-8');

process.stdout.write(`\nCombined report: ${reportPath}\n`);
process.stdout.write(`Overall result: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}\n`);

if (!allPassed) {
  process.exit(1);
}

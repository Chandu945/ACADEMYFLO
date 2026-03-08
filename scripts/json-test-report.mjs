#!/usr/bin/env node

/**
 * CI verification pipeline — JSON test report generator.
 *
 * Runs each quality gate sequentially, captures results,
 * and writes a structured JSON report to ./artifacts/test-report.json.
 *
 * Exit code: 0 if all gates pass, 1 if any gate fails.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACTS_DIR = join(ROOT, 'artifacts');

const gates = [
  {
    name: 'lint',
    tool: 'turbo',
    command: 'npm run lint',
  },
  {
    name: 'typecheck',
    tool: 'turbo',
    command: 'npm run typecheck',
  },
  {
    name: 'test',
    tool: 'turbo',
    command: 'npm run test',
  },
  {
    name: 'test:e2e',
    tool: 'jest',
    command: 'npm run test:e2e',
  },
  {
    name: 'contract:check',
    tool: 'swagger-parser',
    command: 'npm run contract:check',
  },
  {
    name: 'validate:boundaries',
    tool: 'dependency-cruiser',
    command: 'npm run validate:boundaries',
  },
  {
    name: 'validate:architecture',
    tool: 'dependency-cruiser',
    command: 'npm run validate:architecture',
  },
  {
    name: 'format',
    tool: 'prettier',
    command: 'npm run format',
  },
];

function runGate(gate) {
  const start = Date.now();
  let exitCode = 0;
  let stdout = '';
  let stderr = '';

  try {
    const output = execSync(gate.command, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    stdout = output.slice(-2000); // Keep last 2000 chars to avoid huge reports
  } catch (error) {
    exitCode = error.status ?? 1;
    stdout = (error.stdout ?? '').slice(-2000);
    stderr = (error.stderr ?? '').slice(-2000);
  }

  const duration = Date.now() - start;

  return {
    gate: gate.name,
    tool: gate.tool,
    command: gate.command,
    exitCode,
    passed: exitCode === 0,
    durationMs: duration,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

// Ensure artifacts directory exists
mkdirSync(ARTIFACTS_DIR, { recursive: true });

process.stdout.write('=== PlayConnect CI Verification ===\n\n');

const results = [];
let allPassed = true;

for (const gate of gates) {
  process.stdout.write(`Running gate: ${gate.name} ...\n`);
  const result = runGate(gate);
  results.push(result);

  if (!result.passed) {
    allPassed = false;
    process.stdout.write(`  FAILED (exit ${result.exitCode}, ${result.durationMs}ms)\n`);
  } else {
    process.stdout.write(`  PASSED (${result.durationMs}ms)\n`);
  }
}

const report = {
  timestamp: new Date().toISOString(),
  allPassed,
  summary: {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
  },
  gates: results,
};

const reportPath = join(ARTIFACTS_DIR, 'test-report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

process.stdout.write(`\nReport written to: ${reportPath}\n`);
process.stdout.write(`\nResult: ${allPassed ? 'ALL GATES PASSED' : 'SOME GATES FAILED'}\n`);

process.exit(allPassed ? 0 : 1);

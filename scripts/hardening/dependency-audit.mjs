#!/usr/bin/env node

/**
 * Dependency Audit Scanner
 *
 * Runs `npm audit --json --omit=dev` and evaluates results against policy:
 * - Critical vulnerabilities: ALWAYS fail (never allowlistable)
 * - High vulnerabilities: fail unless allowlisted with valid (non-expired) entry
 * - Moderate/Low: reported but do not fail the build
 *
 * Output: artifacts/dependency-audit.json
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACTS_DIR = join(ROOT, 'artifacts');
const ALLOWLIST_PATH = join(ROOT, 'scripts/hardening/allowlist.json');

mkdirSync(ARTIFACTS_DIR, { recursive: true });

// Load allowlist
const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf-8'));
const now = new Date();

const validAuditAllowlist = allowlist.audit.entries.filter((entry) => {
  const expiry = new Date(entry.expiry);
  if (expiry < now) {
    process.stdout.write(`WARNING: Expired audit allowlist entry: ${entry.id} (expired ${entry.expiry})\n`);
    return false;
  }
  return true;
});

const allowedAdvisoryIds = new Set(validAuditAllowlist.map((e) => String(e.id)));

// Run npm audit
let auditRaw;
try {
  auditRaw = execSync('npm audit --json --omit=dev', {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (err) {
  // npm audit exits non-zero when vulnerabilities are found — that's expected
  auditRaw = err.stdout || '{}';
}

let auditData;
try {
  auditData = JSON.parse(auditRaw);
} catch {
  process.stderr.write('ERROR: Failed to parse npm audit JSON output\n');
  process.exit(1);
}

const vulnerabilities = auditData.vulnerabilities || {};
const findings = [];
let criticalCount = 0;
let highUnallowlistedCount = 0;
let highAllowlistedCount = 0;
let moderateCount = 0;
let lowCount = 0;

for (const [name, vuln] of Object.entries(vulnerabilities)) {
  const severity = vuln.severity;
  const viaEntries = Array.isArray(vuln.via)
    ? vuln.via.filter((v) => typeof v === 'object')
    : [];

  const advisoryIds = viaEntries.map((v) => String(v.source)).filter(Boolean);

  const finding = {
    package: name,
    severity,
    advisoryIds,
    range: vuln.range || 'unknown',
    fixAvailable: vuln.fixAvailable || false,
  };

  if (severity === 'critical') {
    criticalCount++;
    finding.status = 'FAIL';
    finding.reason = 'Critical vulnerabilities are never allowlistable';
  } else if (severity === 'high') {
    const allAllowlisted = advisoryIds.length > 0 && advisoryIds.every((id) => allowedAdvisoryIds.has(id));
    if (allAllowlisted) {
      highAllowlistedCount++;
      finding.status = 'ALLOWLISTED';
      finding.reason = 'All advisories are in valid allowlist';
    } else {
      highUnallowlistedCount++;
      finding.status = 'FAIL';
      finding.reason = 'High-severity advisory not in allowlist';
    }
  } else if (severity === 'moderate') {
    moderateCount++;
    finding.status = 'WARN';
  } else {
    lowCount++;
    finding.status = 'INFO';
  }

  findings.push(finding);
}

const passed = criticalCount === 0 && highUnallowlistedCount === 0;

const report = {
  timestamp: new Date().toISOString(),
  tool: 'dependency-audit',
  passed,
  summary: {
    critical: criticalCount,
    highUnallowlisted: highUnallowlistedCount,
    highAllowlisted: highAllowlistedCount,
    moderate: moderateCount,
    low: lowCount,
    total: findings.length,
  },
  findings,
};

const outputPath = join(ARTIFACTS_DIR, 'dependency-audit.json');
writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

process.stdout.write(`\nDependency Audit Report\n`);
process.stdout.write(`=======================\n`);
process.stdout.write(`Critical:              ${criticalCount}\n`);
process.stdout.write(`High (unallowlisted):  ${highUnallowlistedCount}\n`);
process.stdout.write(`High (allowlisted):    ${highAllowlistedCount}\n`);
process.stdout.write(`Moderate:              ${moderateCount}\n`);
process.stdout.write(`Low:                   ${lowCount}\n`);
process.stdout.write(`\nResult: ${passed ? 'PASSED' : 'FAILED'}\n`);
process.stdout.write(`Report: ${outputPath}\n`);

if (!passed) {
  process.exit(1);
}

#!/usr/bin/env node

/**
 * License Compliance Reporter
 *
 * Reads `npm ls --all --json --omit=dev` and checks each production
 * dependency's license against a disallowed list.
 *
 * Disallowed licenses: GPL-3.0, AGPL-3.0, SSPL-1.0, EUPL-1.1, EUPL-1.2
 * (copy-left licenses incompatible with proprietary distribution)
 *
 * Packages can be exempted via allowlist.json with reason + expiry.
 *
 * Output: artifacts/licenses.json
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACTS_DIR = join(ROOT, 'artifacts');
const ALLOWLIST_PATH = join(ROOT, 'scripts/hardening/allowlist.json');

mkdirSync(ARTIFACTS_DIR, { recursive: true });

const DISALLOWED_LICENSES = [
  'GPL-3.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-3.0',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'SSPL-1.0',
  'EUPL-1.1',
  'EUPL-1.2',
];

// Load allowlist
const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf-8'));
const now = new Date();

const validLicenseAllowlist = new Map();
for (const entry of allowlist.licenses.entries) {
  const expiry = new Date(entry.expiry);
  if (expiry < now) {
    process.stdout.write(`WARNING: Expired license allowlist entry: ${entry.package} (expired ${entry.expiry})\n`);
    continue;
  }
  validLicenseAllowlist.set(entry.package, entry);
}

// Run npm ls
let lsRaw;
try {
  lsRaw = execSync('npm ls --all --json --omit=dev', {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
} catch (err) {
  // npm ls exits non-zero for peer dep issues — use stdout anyway
  lsRaw = err.stdout || '{}';
}

let lsData;
try {
  lsData = JSON.parse(lsRaw);
} catch {
  process.stderr.write('ERROR: Failed to parse npm ls JSON output\n');
  process.exit(1);
}

// Flatten dependency tree
const packages = new Map();

function walkDeps(deps) {
  if (!deps || typeof deps !== 'object') return;
  for (const [name, info] of Object.entries(deps)) {
    const key = `${name}@${info.version || 'unknown'}`;
    if (!packages.has(key)) {
      packages.set(key, {
        name,
        version: info.version || 'unknown',
        license: info.license || info.licenses || 'UNKNOWN',
      });
    }
    if (info.dependencies) {
      walkDeps(info.dependencies);
    }
  }
}

walkDeps(lsData.dependencies);

// Check licenses
const findings = [];
let violationCount = 0;
let allowlistedCount = 0;

for (const [, pkg] of packages) {
  const license = typeof pkg.license === 'string' ? pkg.license : String(pkg.license);
  const isDisallowed = DISALLOWED_LICENSES.some(
    (d) => license.toUpperCase().includes(d.toUpperCase()),
  );

  if (isDisallowed) {
    if (validLicenseAllowlist.has(pkg.name)) {
      allowlistedCount++;
      findings.push({
        package: pkg.name,
        version: pkg.version,
        license,
        status: 'ALLOWLISTED',
        reason: validLicenseAllowlist.get(pkg.name).reason,
      });
    } else {
      violationCount++;
      findings.push({
        package: pkg.name,
        version: pkg.version,
        license,
        status: 'VIOLATION',
        reason: `License ${license} is in the disallowed list`,
      });
    }
  }
}

const passed = violationCount === 0;

const report = {
  timestamp: new Date().toISOString(),
  tool: 'license-report',
  passed,
  summary: {
    totalPackages: packages.size,
    violations: violationCount,
    allowlisted: allowlistedCount,
    disallowedLicenses: DISALLOWED_LICENSES,
  },
  findings,
};

const outputPath = join(ARTIFACTS_DIR, 'licenses.json');
writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

process.stdout.write(`\nLicense Compliance Report\n`);
process.stdout.write(`========================\n`);
process.stdout.write(`Total packages scanned: ${packages.size}\n`);
process.stdout.write(`Violations:             ${violationCount}\n`);
process.stdout.write(`Allowlisted:            ${allowlistedCount}\n`);
process.stdout.write(`\nResult: ${passed ? 'PASSED' : 'FAILED'}\n`);
process.stdout.write(`Report: ${outputPath}\n`);

if (!passed) {
  process.exit(1);
}

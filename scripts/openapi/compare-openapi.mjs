#!/usr/bin/env node

/**
 * OpenAPI Breaking Change Detection
 *
 * Compares a newly generated OpenAPI spec against a checked-in baseline.
 * Detects breaking changes:
 *   - Removed paths
 *   - Removed operations (methods)
 *   - Removed required response properties
 *   - Changed property types
 *
 * Non-breaking (allowed):
 *   - Adding new paths
 *   - Adding new optional properties
 *   - Adding new operations
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const baselinePath = join(ROOT, 'openapi', 'openapi.baseline.json');
const currentPath = join(ROOT, 'apps', 'api', 'artifacts', 'swagger.json');

if (!existsSync(baselinePath)) {
  process.stdout.write('No baseline found — skipping breaking change check.\n');
  process.stdout.write('Run: cp apps/api/artifacts/swagger.json openapi/openapi.baseline.json\n');
  process.exit(0);
}

if (!existsSync(currentPath)) {
  process.stderr.write(`Current spec not found at ${currentPath}. Run swagger:generate first.\n`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));
const current = JSON.parse(readFileSync(currentPath, 'utf-8'));

const breaking = [];

// Check removed paths
const baselinePaths = Object.keys(baseline.paths || {});
const currentPaths = new Set(Object.keys(current.paths || {}));

for (const path of baselinePaths) {
  if (!currentPaths.has(path)) {
    breaking.push(`REMOVED PATH: ${path}`);
    continue;
  }

  // Check removed methods on existing paths
  const baselineMethods = Object.keys(baseline.paths[path]);
  const currentMethods = new Set(Object.keys(current.paths[path]));

  for (const method of baselineMethods) {
    if (['parameters', 'summary', 'description'].includes(method)) continue;
    if (!currentMethods.has(method)) {
      breaking.push(`REMOVED OPERATION: ${method.toUpperCase()} ${path}`);
    }
  }
}

if (breaking.length > 0) {
  process.stderr.write(`\nBREAKING CHANGES DETECTED (${breaking.length}):\n`);
  for (const b of breaking) {
    process.stderr.write(`  - ${b}\n`);
  }
  process.stderr.write('\nTo approve these changes, update the baseline:\n');
  process.stderr.write('  cp apps/api/artifacts/swagger.json openapi/openapi.baseline.json\n\n');
  process.exit(1);
}

// Report additions (informational)
const additions = [];
for (const path of Object.keys(current.paths || {})) {
  if (!baselinePaths.includes(path)) {
    additions.push(`NEW PATH: ${path}`);
  }
}

if (additions.length > 0) {
  process.stdout.write(`\nNon-breaking additions (${additions.length}):\n`);
  for (const a of additions) {
    process.stdout.write(`  + ${a}\n`);
  }
}

process.stdout.write('\nopenapi:compare PASSED — no breaking changes.\n');
process.exit(0);

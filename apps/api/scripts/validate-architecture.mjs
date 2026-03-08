#!/usr/bin/env node

/**
 * Architecture boundary validator for the API.
 *
 * Runs dependency-cruiser with the API-specific config to enforce
 * Clean Architecture layer rules:
 *   - Domain cannot import application/infrastructure/presentation
 *   - Application cannot import infrastructure/presentation
 *   - Presentation cannot import infrastructure directly
 *   - No circular dependencies
 *
 * Exits 0 on success, 1 on violation.
 */

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = join(__dirname, '..');

try {
  const cmd = 'npx depcruise --config .dependency-cruiser.js src';
  process.stdout.write(`validate-architecture: Running: ${cmd}\n`);
  execSync(cmd, { cwd: API_ROOT, stdio: 'inherit' });
  process.stdout.write('validate-architecture: PASSED — no layer violations.\n');
  process.exit(0);
} catch {
  process.stderr.write('validate-architecture: FAILED — layer violations detected.\n');
  process.exit(1);
}

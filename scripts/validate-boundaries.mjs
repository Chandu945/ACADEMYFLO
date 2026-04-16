#!/usr/bin/env node

/**
 * Workspace boundary validation script.
 *
 * Runs dependency-cruiser to detect:
 *   - Circular dependencies
 *   - Illegal cross-workspace imports (apps importing from other apps)
 *   - Clean Architecture layer violations
 *
 * Exits with code 0 on success, 1 on violation.
 * Handles empty source directories gracefully.
 */

import { execSync } from 'node:child_process';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');

/**
 * Collect all directories under apps/ and packages/ that contain
 * at least one .ts or .tsx file (recursively).
 */
function findSourceDirs() {
  const dirs = [];
  const workspaceDirs = ['apps', 'packages'];

  for (const wsDir of workspaceDirs) {
    const wsPath = join(ROOT, wsDir);
    if (!existsSync(wsPath)) continue;

    const entries = readdirSync(wsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = join(wsPath, entry.name);
      if (hasTsFiles(fullPath)) {
        dirs.push(join(wsDir, entry.name));
      }
    }
  }

  return dirs;
}

function hasTsFiles(dir) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        if (hasTsFiles(fullPath)) return true;
      }
      if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
        return true;
      }
    }
  } catch {
    // ignore permission errors
  }
  return false;
}

const sourceDirs = findSourceDirs();

if (sourceDirs.length === 0) {
  // No TypeScript source files found — pass cleanly
  process.stdout.write(
    'validate-boundaries: No TypeScript source files found in workspaces. Skipping.\n',
  );
  process.exit(0);
}

try {
  const cmd = `npx depcruise --config .dependency-cruiser.js ${sourceDirs.join(' ')}`;
  process.stdout.write(`Running: ${cmd}\n`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  process.stdout.write('validate-boundaries: PASSED — no violations found.\n');
  process.exit(0);
} catch (error) {
  process.stderr.write('validate-boundaries: FAILED — boundary violations detected.\n');
  process.exit(1);
}

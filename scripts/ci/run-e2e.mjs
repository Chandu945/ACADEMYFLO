#!/usr/bin/env node

/**
 * CI E2E test runner.
 *
 * Starts MongoDB via docker-compose.ci.yml, waits for health,
 * runs API e2e tests, and tears down on completion.
 *
 * Usage: node scripts/ci/run-e2e.mjs
 */

import { execSync, spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const COMPOSE_FILE = 'docker-compose.ci.yml';
const MAX_WAIT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function runSilent(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

async function waitForMongo() {
  const start = Date.now();
  process.stdout.write('Waiting for MongoDB to be ready');

  while (Date.now() - start < MAX_WAIT_MS) {
    const ready = runSilent(
      `docker compose -f ${COMPOSE_FILE} exec -T mongo mongosh --eval "rs.status().ok" --quiet`,
    );
    if (ready) {
      process.stdout.write(' ready!\n');
      return;
    }
    process.stdout.write('.');
    await setTimeout(POLL_INTERVAL_MS);
  }

  throw new Error('MongoDB failed to become ready within timeout');
}

async function main() {
  let exitCode = 0;

  try {
    // Start MongoDB
    process.stdout.write('Starting CI MongoDB...\n');
    run(`docker compose -f ${COMPOSE_FILE} up -d`);

    // Wait for MongoDB to be healthy
    await waitForMongo();

    // Run e2e tests
    process.stdout.write('\nRunning API E2E tests...\n');
    run('npm run test:e2e:api', {
      env: {
        ...process.env,
        MONGODB_URI: 'mongodb://localhost:27017/playconnect_e2e_test?replicaSet=rs0',
        APP_ENV: 'test',
        NODE_ENV: 'test',
      },
    });
  } catch (error) {
    exitCode = error.status ?? 1;
    process.stderr.write(`E2E tests failed with exit code ${exitCode}\n`);
  } finally {
    // Always tear down
    process.stdout.write('\nTearing down CI MongoDB...\n');
    try {
      run(`docker compose -f ${COMPOSE_FILE} down -v`);
    } catch {
      process.stderr.write('Warning: failed to tear down compose stack\n');
    }
  }

  process.exit(exitCode);
}

main();

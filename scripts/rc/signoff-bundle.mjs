#!/usr/bin/env node

/**
 * Generates the sign-off bundle for Release Candidate approval.
 *
 * Collects artifacts from CI jobs and packages them into a single directory
 * for upload as a GitHub Actions artifact.
 *
 * Environment:
 *   RC_TAG              - release candidate tag (e.g. rc-abc1234)
 *   RC_SHA              - full commit SHA
 *   CI_GATES_RESULT     - result of ci-gates job
 *   HARDENING_RESULT    - result of hardening job
 *   SMOKE_RESULT        - result of smoke-suite job
 */

import { cpSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RC_TAG = process.env.RC_TAG || 'rc-unknown';
const RC_SHA = process.env.RC_SHA || 'unknown';
const BUNDLE_DIR = join('artifacts', 'signoff-bundle');

mkdirSync(BUNDLE_DIR, { recursive: true });

// ── Collect artifacts from downloaded CI artifacts ──
const ARTIFACT_SOURCES = [
  // [source, destination filename]
  ['rc-artifacts/hardening-reports/artifacts/dependency-audit.json', 'dependency-audit.json'],
  ['rc-artifacts/hardening-reports/artifacts/licenses.json', 'licenses.json'],
  ['rc-artifacts/hardening-reports/artifacts/secrets-scan.json', 'secrets-scan.json'],
  ['rc-artifacts/hardening-reports/artifacts/hardening-report.json', 'hardening-report.json'],
  ['rc-artifacts/docker-digests/artifacts/docker-digests.json', 'docker-digests.json'],
  ['rc-artifacts/smoke-results/artifacts/smoke-results.json', 'smoke-results.json'],
  ['artifacts/test-report.json', 'test-report.json'],
  ['apps/api/artifacts/swagger.json', 'openapi.v1.json'],
];

for (const [src, dest] of ARTIFACT_SOURCES) {
  if (existsSync(src)) {
    cpSync(src, join(BUNDLE_DIR, dest));
    console.log(`  ✓ ${dest}`);
  } else {
    console.log(`  ⊘ ${dest} (not found at ${src})`);
  }
}

// ── Collect coverage summaries ──
const WORKSPACES = ['api', 'admin-web', 'mobile'];
const coverageSummaries = {};

for (const ws of WORKSPACES) {
  const paths = [
    `rc-artifacts/rc-coverage/apps/${ws}/coverage/coverage-summary.json`,
    `apps/${ws}/coverage/coverage-summary.json`,
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        coverageSummaries[ws] = JSON.parse(readFileSync(p, 'utf-8'));
        console.log(`  ✓ coverage-${ws}`);
      } catch {
        console.log(`  ⊘ coverage-${ws} (parse error)`);
      }
      break;
    }
  }

  if (!coverageSummaries[ws]) {
    console.log(`  ⊘ coverage-${ws} (not found)`);
  }
}

writeFileSync(
  join(BUNDLE_DIR, 'coverage-summary.json'),
  JSON.stringify(coverageSummaries, null, 2),
);

// ── RC version manifest ──
const manifest = {
  tag: RC_TAG,
  sha: RC_SHA,
  createdAt: new Date().toISOString(),
  gates: {
    ciGates: process.env.CI_GATES_RESULT || 'unknown',
    hardening: process.env.HARDENING_RESULT || 'unknown',
    smoke: process.env.SMOKE_RESULT || 'unknown',
  },
};

writeFileSync(join(BUNDLE_DIR, `rc-${RC_TAG}.json`), JSON.stringify(manifest, null, 2));
console.log(`  ✓ rc-${RC_TAG}.json`);

// Also write to deploy/versions for reference
mkdirSync('deploy/versions', { recursive: true });
writeFileSync(join('deploy', 'versions', `${RC_TAG}.json`), JSON.stringify(manifest, null, 2));
console.log(`  ✓ deploy/versions/${RC_TAG}.json`);

// ── Summary ──
const allPassed =
  manifest.gates.ciGates === 'success' &&
  manifest.gates.hardening === 'success' &&
  manifest.gates.smoke === 'success';

console.log(`\n── Sign-off Bundle: ${RC_TAG} ──`);
console.log(`  CI Gates:  ${manifest.gates.ciGates}`);
console.log(`  Hardening: ${manifest.gates.hardening}`);
console.log(`  Smoke:     ${manifest.gates.smoke}`);
console.log(`  Verdict:   ${allPassed ? 'READY FOR SIGN-OFF' : 'NOT READY — check failures'}`);

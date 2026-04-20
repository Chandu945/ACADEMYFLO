#!/usr/bin/env node

/**
 * generate-handoff-summary.mjs
 *
 * Aggregates coverage, CI gates, docker digests, and traceability
 * into a single artifacts/handoff/handoff-summary.json for sign-off review.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACTS = join(ROOT, 'artifacts');
const HANDOFF = join(ARTIFACTS, 'handoff');
const OUT = join(HANDOFF, 'handoff-summary.json');

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function loadJsonSafe(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  1. Traceability (from generate-traceability.mjs)                   */
/* ------------------------------------------------------------------ */

const traceability = loadJsonSafe(join(HANDOFF, 'traceability.json'));

/* ------------------------------------------------------------------ */
/*  2. Test Report                                                      */
/* ------------------------------------------------------------------ */

const testReport = loadJsonSafe(join(ARTIFACTS, 'test-report.json'));

/* ------------------------------------------------------------------ */
/*  3. Hardening Reports                                                */
/* ------------------------------------------------------------------ */

const depAudit = loadJsonSafe(join(ARTIFACTS, 'dependency-audit.json'));
const licenses = loadJsonSafe(join(ARTIFACTS, 'licenses.json'));
const secretsScan = loadJsonSafe(join(ARTIFACTS, 'secrets-scan.json'));
const hardeningReport = loadJsonSafe(join(ARTIFACTS, 'hardening-report.json'));

/* ------------------------------------------------------------------ */
/*  4. Docker Digests (from RC build)                                   */
/* ------------------------------------------------------------------ */

const dockerDigests = loadJsonSafe(join(ARTIFACTS, 'docker-digests.json'));

/* ------------------------------------------------------------------ */
/*  5. OpenAPI Spec Metadata                                            */
/* ------------------------------------------------------------------ */

const openApiSpec = loadJsonSafe(join(ROOT, 'apps/api/artifacts/swagger.json'));
const openApiMeta = openApiSpec
  ? {
      title: openApiSpec.info?.title || 'Academyflo API',
      version: openApiSpec.info?.version || 'unknown',
      pathCount: Object.keys(openApiSpec.paths || {}).length,
    }
  : null;

/* ------------------------------------------------------------------ */
/*  6. Coverage Summary                                                 */
/* ------------------------------------------------------------------ */

function extractCoverage(coveragePath) {
  const data = loadJsonSafe(coveragePath);
  if (!data?.total) return null;
  return {
    statements: data.total.statements?.pct ?? null,
    branches: data.total.branches?.pct ?? null,
    functions: data.total.functions?.pct ?? null,
    lines: data.total.lines?.pct ?? null,
  };
}

const apiCoverage = extractCoverage(join(ROOT, 'apps/api/coverage/coverage-summary.json'));
const mobileCoverage = extractCoverage(join(ROOT, 'apps/mobile/coverage/coverage-summary.json'));

/* ------------------------------------------------------------------ */
/*  7. Handoff Documents Inventory                                      */
/* ------------------------------------------------------------------ */

const handoffDocs = [
  'SRS_TRACEABILITY_MATRIX.md',
  'ENTERPRISE_ACCEPTANCE_CHECKLIST.md',
  'ARCHITECTURE_COMPLIANCE.md',
  'SECURITY_COMPLIANCE.md',
  'PERFORMANCE_SCALABILITY.md',
  'OBSERVABILITY.md',
  'OPERATIONAL_HANDOVER.md',
  'KNOWN_LIMITATIONS.md',
].map((name) => ({
  name,
  exists: existsSync(join(ROOT, 'docs/handoff', name)),
}));

/* ------------------------------------------------------------------ */
/*  Assemble                                                            */
/* ------------------------------------------------------------------ */

const summary = {
  generatedAt: new Date().toISOString(),
  project: 'Academyflo',
  version: openApiMeta?.version || 'unknown',

  traceability: traceability?.summary || null,

  testReport: testReport
    ? {
        gates: testReport.gates || null,
        summary: testReport.summary || null,
      }
    : null,

  coverage: {
    api: apiCoverage,
    mobile: mobileCoverage,
  },

  hardening: {
    dependencyAudit: depAudit ? { status: depAudit.status || 'unknown' } : null,
    licenses: licenses ? { status: licenses.status || 'unknown' } : null,
    secretsScan: secretsScan ? { status: secretsScan.status || 'unknown' } : null,
    overall: hardeningReport ? { status: hardeningReport.status || 'unknown' } : null,
  },

  openApi: openApiMeta,

  dockerImages: dockerDigests || null,

  handoffDocuments: {
    total: handoffDocs.length,
    present: handoffDocs.filter((d) => d.exists).length,
    documents: handoffDocs,
  },

  verdict: {
    allDocsPresent: handoffDocs.every((d) => d.exists),
    traceabilityGenerated: traceability !== null,
    note: 'Run enterprise acceptance checklist for full Go/No-Go decision.',
  },
};

writeFileSync(OUT, JSON.stringify(summary, null, 2));
console.log(`Handoff summary written to ${relative(ROOT, OUT)}`);
console.log(`  Handoff docs:     ${summary.handoffDocuments.present}/${summary.handoffDocuments.total} present`);
console.log(`  Traceability:     ${summary.traceability ? 'available' : 'missing (run generate-traceability first)'}`);
console.log(`  Test report:      ${summary.testReport ? 'available' : 'not found'}`);
console.log(`  Hardening:        ${summary.hardening.overall ? summary.hardening.overall.status : 'not found'}`);
console.log(`  OpenAPI spec:     ${summary.openApi ? `v${summary.openApi.version} (${summary.openApi.pathCount} paths)` : 'not found'}`);
console.log(`  All docs present: ${summary.verdict.allDocsPresent ? 'YES' : 'NO'}`);

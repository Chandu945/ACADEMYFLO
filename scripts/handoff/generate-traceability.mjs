#!/usr/bin/env node

/**
 * generate-traceability.mjs
 *
 * Scans the codebase for routes, screens, and test files, then combines with
 * the OpenAPI spec (if available) to produce artifacts/handoff/traceability.json.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const API_DIR = join(ROOT, 'apps/api');
const MOBILE_DIR = join(ROOT, 'apps/mobile');
const ADMIN_DIR = join(ROOT, 'apps/admin-web');
const OUT = join(ROOT, 'artifacts/handoff/traceability.json');

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function walkDir(dir, filter) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...walkDir(full, filter));
    } else if (entry.isFile() && filter(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function extractDecorators(filePath, pattern) {
  try {
    const src = readFileSync(filePath, 'utf8');
    const matches = [];
    const re = new RegExp(pattern, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      matches.push(m[1] || m[0]);
    }
    return matches;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  1. API Routes — scan controllers for @Get/@Post/@Put etc.          */
/* ------------------------------------------------------------------ */

function scanApiRoutes() {
  const controllerFiles = walkDir(
    join(API_DIR, 'src/presentation/http'),
    (name) => name.endsWith('.controller.ts'),
  );

  const routes = [];
  for (const file of controllerFiles) {
    const src = readFileSync(file, 'utf8');

    // Extract controller-level path: @Controller('path')
    const ctrlMatch = src.match(/@Controller\(['"`]([^'"`]*)['"`]\)/);
    const basePath = ctrlMatch ? ctrlMatch[1] : '';

    // Extract route decorators
    const routeRe = /@(Get|Post|Put|Patch|Delete)\(['"`]?([^'"`)\n]*)['"`]?\)/g;
    let m;
    while ((m = routeRe.exec(src)) !== null) {
      const method = m[1].toUpperCase();
      const subPath = m[2] || '';
      routes.push({
        method,
        path: `/api/v1/${basePath}${subPath ? '/' + subPath : ''}`.replace(/\/+/g, '/'),
        controller: relative(ROOT, file),
      });
    }
  }

  return routes;
}

/* ------------------------------------------------------------------ */
/*  2. Mobile Screens                                                   */
/* ------------------------------------------------------------------ */

function scanMobileScreens() {
  const screenFiles = walkDir(
    join(MOBILE_DIR, 'src/presentation/screens'),
    (name) => name.endsWith('.tsx') && !name.includes('.spec.') && !name.includes('.test.'),
  );

  return screenFiles.map((f) => ({
    name: basename(f, '.tsx'),
    path: relative(ROOT, f),
  }));
}

/* ------------------------------------------------------------------ */
/*  3. Admin Web Pages                                                  */
/* ------------------------------------------------------------------ */

function scanAdminPages() {
  const pageDir = join(ADMIN_DIR, 'src/app');
  const pageFiles = walkDir(pageDir, (name) => name === 'page.tsx');

  return pageFiles.map((f) => ({
    route: '/' + relative(pageDir, f).replace(/\/page\.tsx$/, '').replace(/\\/g, '/'),
    path: relative(ROOT, f),
  }));
}

/* ------------------------------------------------------------------ */
/*  4. Test Files                                                       */
/* ------------------------------------------------------------------ */

function scanTestFiles() {
  const unitTests = walkDir(join(API_DIR, 'src'), (name) => name.endsWith('.spec.ts'));
  const e2eTests = walkDir(join(API_DIR, 'test'), (name) => name.endsWith('.spec.ts'));
  const mobileTests = walkDir(join(MOBILE_DIR, 'src'), (name) =>
    name.endsWith('.spec.ts') || name.endsWith('.spec.tsx'),
  );
  const adminTests = walkDir(join(ADMIN_DIR, 'src'), (name) =>
    name.endsWith('.spec.ts') || name.endsWith('.spec.tsx'),
  );

  return {
    api: {
      unit: unitTests.map((f) => relative(ROOT, f)),
      e2e: e2eTests.map((f) => relative(ROOT, f)),
    },
    mobile: mobileTests.map((f) => relative(ROOT, f)),
    adminWeb: adminTests.map((f) => relative(ROOT, f)),
  };
}

/* ------------------------------------------------------------------ */
/*  5. OpenAPI Spec (optional)                                          */
/* ------------------------------------------------------------------ */

function loadOpenApiRoutes() {
  const specPath = join(API_DIR, 'artifacts/swagger.json');
  if (!existsSync(specPath)) return [];

  try {
    const spec = JSON.parse(readFileSync(specPath, 'utf8'));
    const routes = [];
    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const method of Object.keys(methods)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          routes.push({
            method: method.toUpperCase(),
            path,
            operationId: methods[method].operationId || null,
            tags: methods[method].tags || [],
          });
        }
      }
    }
    return routes;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Assemble                                                            */
/* ------------------------------------------------------------------ */

const traceability = {
  generatedAt: new Date().toISOString(),
  apiRoutes: {
    scanned: scanApiRoutes(),
    openapi: loadOpenApiRoutes(),
  },
  mobileScreens: scanMobileScreens(),
  adminPages: scanAdminPages(),
  tests: scanTestFiles(),
  summary: {},
};

// Compute summary counts
traceability.summary = {
  apiRouteCount: traceability.apiRoutes.scanned.length,
  openApiRouteCount: traceability.apiRoutes.openapi.length,
  mobileScreenCount: traceability.mobileScreens.length,
  adminPageCount: traceability.adminPages.length,
  apiUnitTestCount: traceability.tests.api.unit.length,
  apiE2eTestCount: traceability.tests.api.e2e.length,
  mobileTestCount: traceability.tests.mobile.length,
  adminTestCount: traceability.tests.adminWeb.length,
  totalTests:
    traceability.tests.api.unit.length +
    traceability.tests.api.e2e.length +
    traceability.tests.mobile.length +
    traceability.tests.adminWeb.length,
};

writeFileSync(OUT, JSON.stringify(traceability, null, 2));
console.log(`Traceability report written to ${relative(ROOT, OUT)}`);
console.log(`  API routes (scanned): ${traceability.summary.apiRouteCount}`);
console.log(`  API routes (OpenAPI): ${traceability.summary.openApiRouteCount}`);
console.log(`  Mobile screens:       ${traceability.summary.mobileScreenCount}`);
console.log(`  Admin pages:          ${traceability.summary.adminPageCount}`);
console.log(`  Total test files:     ${traceability.summary.totalTests}`);

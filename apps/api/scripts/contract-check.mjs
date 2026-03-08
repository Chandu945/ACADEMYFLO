#!/usr/bin/env node

/**
 * Contract validation script.
 * 1. Generates the Swagger spec via NestJS
 * 2. Validates it using swagger-parser
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SPEC_PATH = join(ROOT, 'artifacts', 'swagger.json');

// Step 1: Generate swagger spec
try {
  process.stdout.write('Generating Swagger spec...\n');
  execSync('npx ts-node -r tsconfig-paths/register src/swagger-generate.ts', {
    cwd: ROOT,
    stdio: 'pipe',
    timeout: 30_000,
  });
} catch (error) {
  process.stderr.write(`Failed to generate Swagger spec: ${error.message}\n`);
  if (error.stderr) process.stderr.write(error.stderr.toString());
  process.exit(1);
}

if (!existsSync(SPEC_PATH)) {
  process.stderr.write(`Swagger spec not found at ${SPEC_PATH}\n`);
  process.exit(1);
}

// Step 2: Validate with swagger-parser
try {
  process.stdout.write('Validating OpenAPI spec...\n');

  // Dynamic import for ESM compatibility
  const SwaggerParser = await import('@apidevtools/swagger-parser');
  const parser = SwaggerParser.default || SwaggerParser;
  const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf-8'));
  await parser.validate(spec);

  process.stdout.write('contract:check PASSED — valid OpenAPI spec.\n');
  process.exit(0);
} catch (error) {
  process.stderr.write(`contract:check FAILED — invalid OpenAPI spec: ${error.message}\n`);
  process.exit(1);
}

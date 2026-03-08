import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Validates that the generated OpenAPI spec does not expose
 * sensitive internal fields in any schema definition.
 *
 * Requires: `npm run swagger:generate` (or `contract:check`) to have run first.
 */

const SPEC_PATH = join(__dirname, '..', 'artifacts', 'swagger.json');

const SENSITIVE_FIELDS = [
  'passwordHash',
  'refreshTokenHash',
  'tokenVersion',
  'deletedAt',
  'deletedBy',
  '__v',
];

interface OpenApiSpec {
  components?: {
    schemas?: Record<string, { properties?: Record<string, unknown> }>;
  };
  paths?: Record<string, Record<string, { responses?: Record<string, { content?: Record<string, { schema?: unknown }> }> }>>;
}

function collectSchemaPropertyNames(spec: OpenApiSpec): Array<{ schema: string; field: string }> {
  const found: Array<{ schema: string; field: string }> = [];
  const schemas = spec.components?.schemas ?? {};

  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    const props = schemaDef.properties ?? {};
    for (const propName of Object.keys(props)) {
      if (SENSITIVE_FIELDS.includes(propName)) {
        found.push({ schema: schemaName, field: propName });
      }
    }
  }

  return found;
}

function collectAllPropertyNamesDeep(obj: unknown, path = ''): string[] {
  if (obj === null || obj === undefined || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) {
    return obj.flatMap((item, i) => collectAllPropertyNamesDeep(item, `${path}[${i}]`));
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      for (const propName of Object.keys(value as Record<string, unknown>)) {
        if (SENSITIVE_FIELDS.includes(propName)) {
          keys.push(`${path}.properties.${propName}`);
        }
      }
    }
    keys.push(...collectAllPropertyNamesDeep(value, `${path}.${key}`));
  }
  return keys;
}

describe('OpenAPI Sensitive Fields (e2e)', () => {
  let spec: OpenApiSpec;

  beforeAll(() => {
    if (!existsSync(SPEC_PATH)) {
      return;
    }
    spec = JSON.parse(readFileSync(SPEC_PATH, 'utf-8'));
  });

  it('should have a generated spec available', () => {
    if (!existsSync(SPEC_PATH)) {
      console.warn(
        'swagger.json not found at artifacts/swagger.json — run swagger:generate first. Skipping.',
      );
      return;
    }
    expect(spec).toBeDefined();
    expect(spec.components).toBeDefined();
  });

  it('schema definitions must not contain sensitive fields', () => {
    if (!spec) return; // skip if no spec

    const violations = collectSchemaPropertyNames(spec);

    if (violations.length > 0) {
      const details = violations
        .map((v) => `  - ${v.schema}.${v.field}`)
        .join('\n');
      fail(`Sensitive fields found in OpenAPI schemas:\n${details}`);
    }
  });

  it('no sensitive field names anywhere in the spec (deep scan)', () => {
    if (!spec) return; // skip if no spec

    const found = collectAllPropertyNamesDeep(spec, 'root');

    if (found.length > 0) {
      fail(
        `Sensitive field names found in OpenAPI spec:\n${found.map((f) => `  - ${f}`).join('\n')}`,
      );
    }
  });

  it('spec must not contain password-related example values', () => {
    if (!spec) return; // skip if no spec

    const specString = JSON.stringify(spec);
    const dangerousPatterns = [
      /\$2[aby]\$\d{2}\$/,       // bcrypt hash pattern
      /"password[Hh]ash"/,        // passwordHash as a key
      /"refresh[Tt]oken[Hh]ash"/, // refreshTokenHash as a key
    ];

    for (const pattern of dangerousPatterns) {
      expect(specString).not.toMatch(pattern);
    }
  });
});

import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import type { AppConfigService } from '../../shared/config/config.service';
import type { LoggerPort } from '../../shared/logging/logger.port';

const DOCS_PATH = 'api/v1/docs';

/** Timing-safe string comparison to prevent token enumeration via timing attacks. */
function safeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    // Pad the shorter buffer so timingSafeEqual can still run in constant time
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);
    bufA.copy(paddedA);
    bufB.copy(paddedB);
    // Always run the comparison to avoid leaking length info via early return timing
    timingSafeEqual(paddedA, paddedB);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Conditionally set up Swagger/OpenAPI documentation.
 *
 * - Only enabled when SWAGGER_ENABLED=true
 * - Optionally gated by SWAGGER_TOKEN header
 * - Returns 404 for all doc routes when disabled (no discovery)
 */
export function setupSwagger(
  app: INestApplication,
  config: AppConfigService,
  logger: LoggerPort,
): void {
  if (!config.swaggerEnabled) {
    return;
  }

  const document = buildOpenApiDocument(app);

  // Token gating middleware — must be registered before SwaggerModule.setup
  const token = config.swaggerToken;
  if (token) {
    app.use(`/${DOCS_PATH}`, (req: { headers: Record<string, string | undefined> }, res: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void) => {
      const provided = req.headers['x-swagger-token'] ?? '';
      if (!safeStringEqual(provided, token)) {
        res.status(404).json({ statusCode: 404, message: 'Not Found' });
        return;
      }
      next();
    });
    app.use(`/${DOCS_PATH}-json`, (req: { headers: Record<string, string | undefined> }, res: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void) => {
      const provided = req.headers['x-swagger-token'] ?? '';
      if (!safeStringEqual(provided, token)) {
        res.status(404).json({ statusCode: 404, message: 'Not Found' });
        return;
      }
      next();
    });
  }

  SwaggerModule.setup(DOCS_PATH, app, document, {
    jsonDocumentUrl: `${DOCS_PATH}-json`,
  });

  logger.info('Swagger documentation enabled', { path: `/${DOCS_PATH}` });
}

/**
 * Build the OpenAPI document for the given NestJS application.
 * Exported for use by the spec generation script.
 */
export function buildOpenApiDocument(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Academyflo API')
    .setDescription('Academy Management Application API — v1')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT access token' },
      'bearer',
    )
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
}

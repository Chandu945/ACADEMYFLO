import { Controller, Get, HttpStatus, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { MongoDbHealthIndicator } from '../../../infrastructure/database/mongodb.health';
import { AppConfigService } from '../../../shared/config/config.service';
import { getRequestId } from '../../../shared/logging/request-id.interceptor';
import { Public } from '../common/decorators/public.decorator';

function compareVersions(current: string, minimum: string): boolean {
  const cur = current.split('.').map(Number);
  const min = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((cur[i] ?? 0) > (min[i] ?? 0)) return true;
    if ((cur[i] ?? 0) < (min[i] ?? 0)) return false;
  }
  return true; // equal
}

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
@Public()
export class HealthController {
  constructor(
    private readonly mongoHealth: MongoDbHealthIndicator,
    private readonly config: AppConfigService,
  ) {}

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'academyflo-api' },
        time: { type: 'string', format: 'date-time' },
        requestId: { type: 'string' },
      },
    },
  })
  liveness(@Req() req: Request) {
    return {
      status: 'ok',
      service: 'academyflo-api',
      time: new Date().toISOString(),
      requestId: getRequestId(req),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({
    status: 200,
    description: 'Service readiness status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'unavailable'] },
        service: { type: 'string', example: 'academyflo-api' },
        time: { type: 'string', format: 'date-time' },
        dependencies: {
          type: 'object',
          properties: {
            mongodb: { type: 'string', enum: ['up', 'down', 'not_configured'] },
          },
        },
        requestId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Service unavailable — dependency down' })
  async readiness(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const mongoStatus = await this.mongoHealth.check();

    const isDown = mongoStatus === 'down';

    if (isDown) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: isDown ? 'unavailable' : 'ok',
      service: 'academyflo-api',
      time: new Date().toISOString(),
      dependencies: {
        mongodb: mongoStatus,
      },
      requestId: getRequestId(req),
    };
  }

  @Get('app-version')
  @ApiOperation({ summary: 'Check if mobile app version meets minimum requirement' })
  @ApiQuery({ name: 'platform', enum: ['android', 'ios'], required: true })
  @ApiQuery({ name: 'version', required: true, example: '1.0.0' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        updateRequired: { type: 'boolean' },
        currentVersion: { type: 'string' },
        minVersion: { type: 'string' },
        storeUrl: { type: 'string' },
      },
    },
  })
  appVersion(
    @Query('platform') platform: string,
    @Query('version') version: string,
  ) {
    const isAndroid = platform === 'android';
    const minVersion = isAndroid
      ? this.config.minAppVersionAndroid
      : this.config.minAppVersionIos;

    const storeUrl = isAndroid
      ? 'https://play.google.com/store/apps/details?id=com.academyflo'
      : 'https://apps.apple.com/app/academyflo/id000000000';

    const updateRequired = !compareVersions(version || '0.0.0', minVersion);

    return {
      updateRequired,
      currentVersion: version || '0.0.0',
      minVersion,
      storeUrl,
    };
  }
}

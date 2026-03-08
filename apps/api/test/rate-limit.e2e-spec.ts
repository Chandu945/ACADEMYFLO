import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Controller, Get, Module } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerModule, ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Controller('test-default')
class TestDefaultController {
  @Get()
  default() {
    return { ok: true };
  }
}

@Controller('test-strict')
@Throttle({ default: { limit: 2, ttl: 60_000 } })
class TestStrictController {
  @Get()
  strict() {
    return { ok: true };
  }
}

@Controller('test-skip')
@SkipThrottle()
class TestSkipController {
  @Get()
  skip() {
    return { ok: true };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])],
  controllers: [TestDefaultController, TestStrictController, TestSkipController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class TestRateLimitModule {}

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [TestRateLimitModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should allow requests within default limit', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/test-default').expect(200);
    }
  });

  it('should block requests exceeding default limit', async () => {
    // Need a fresh app since state carries over
    const moduleFixture = await Test.createTestingModule({
      imports: [TestRateLimitModule],
    }).compile();
    const freshApp = moduleFixture.createNestApplication();
    await freshApp.init();

    for (let i = 0; i < 5; i++) {
      await request(freshApp.getHttpServer()).get('/test-default').expect(200);
    }

    await request(freshApp.getHttpServer()).get('/test-default').expect(429);
    await freshApp.close();
  });

  it('should apply strict limit on @Throttle controller', async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [TestRateLimitModule],
    }).compile();
    const freshApp = moduleFixture.createNestApplication();
    await freshApp.init();

    await request(freshApp.getHttpServer()).get('/test-strict').expect(200);
    await request(freshApp.getHttpServer()).get('/test-strict').expect(200);
    await request(freshApp.getHttpServer()).get('/test-strict').expect(429);
    await freshApp.close();
  });

  it('should skip throttling on @SkipThrottle controller', async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [TestRateLimitModule],
    }).compile();
    const freshApp = moduleFixture.createNestApplication();
    await freshApp.init();

    // Should never get 429 regardless of how many requests
    for (let i = 0; i < 10; i++) {
      await request(freshApp.getHttpServer()).get('/test-skip').expect(200);
    }
    await freshApp.close();
  });
});

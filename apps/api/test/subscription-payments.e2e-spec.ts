import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { GlobalExceptionFilter } from '../src/shared/errors/global-exception.filter';
import { RequestIdInterceptor } from '../src/shared/logging/request-id.interceptor';
import { createGlobalValidationPipe } from '../src/shared/validation/validation.pipe';
import { AppConfigModule } from '../src/shared/config/config.module';
import { LoggingModule } from '../src/shared/logging/logging.module';
import { SubscriptionPaymentsController } from '../src/presentation/http/subscription-payments/subscription-payments.controller';
import { USER_REPOSITORY } from '../src/domain/identity/ports/user.repository';
import { ACADEMY_REPOSITORY } from '../src/domain/academy/ports/academy.repository';
import { SUBSCRIPTION_REPOSITORY } from '../src/domain/subscription/ports/subscription.repository';
import { SUBSCRIPTION_PAYMENT_REPOSITORY } from '../src/domain/subscription-payments/ports/subscription-payment.repository';
import { CASHFREE_GATEWAY } from '../src/domain/subscription-payments/ports/cashfree-gateway.port';
import { ACTIVE_STUDENT_COUNTER } from '../src/application/subscription/ports/active-student-counter.port';
import { CLOCK_PORT } from '../src/application/common/clock.port';
import { TOKEN_SERVICE } from '../src/application/identity/ports/token-service.port';
import { LOGGER_PORT } from '../src/shared/logging/logger.port';
import { InitiateSubscriptionPaymentUseCase } from '../src/application/subscription-payments/use-cases/initiate-subscription-payment.usecase';
import { HandleCashfreeWebhookUseCase } from '../src/application/subscription-payments/use-cases/handle-cashfree-webhook.usecase';
import { GetSubscriptionPaymentStatusUseCase } from '../src/application/subscription-payments/use-cases/get-subscription-payment-status.usecase';
import { SubscriptionPayment } from '../src/domain/subscription-payments/entities/subscription-payment.entity';
import { Subscription } from '../src/domain/subscription/entities/subscription.entity';
import {
  InMemoryUserRepository,
  InMemoryAcademyRepository,
  InMemorySubscriptionRepository,
} from './helpers/in-memory-repos';
import { createTestTokenService } from './helpers/test-services';
import { User } from '../src/domain/identity/entities/user.entity';
import { Academy } from '../src/domain/academy/entities/academy.entity';
import type { SubscriptionPaymentRepository } from '../src/domain/subscription-payments/ports/subscription-payment.repository';
import type { CashfreeGatewayPort } from '../src/domain/subscription-payments/ports/cashfree-gateway.port';
import type { ClockPort } from '../src/application/common/clock.port';
import type { LoggerPort } from '../src/shared/logging/logger.port';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_SIGNATURE_VERIFIER = Symbol('WEBHOOK_SIGNATURE_VERIFIER');

class InMemorySubscriptionPaymentRepository implements SubscriptionPaymentRepository {
  private payments: Map<string, SubscriptionPayment> = new Map();

  async save(payment: SubscriptionPayment): Promise<void> {
    this.payments.set(payment.id.toString(), payment);
  }

  async findByOrderId(orderId: string): Promise<SubscriptionPayment | null> {
    for (const p of this.payments.values()) {
      if (p.orderId === orderId) return p;
    }
    return null;
  }

  async findPendingByAcademyId(academyId: string): Promise<SubscriptionPayment | null> {
    for (const p of this.payments.values()) {
      if (p.academyId === academyId && p.status === 'PENDING') return p;
    }
    return null;
  }

  clear(): void {
    this.payments.clear();
  }
}

describe('Subscription Payments (e2e)', () => {
  let app: INestApplication;
  let userRepo: InMemoryUserRepository;
  let academyRepo: InMemoryAcademyRepository;
  let subscriptionRepo: InMemorySubscriptionRepository;
  let paymentRepo: InMemorySubscriptionPaymentRepository;
  let jwtService: JwtService;
  let clock: { now: () => Date };
  let cashfreeGateway: CashfreeGatewayPort;
  let signatureVerifier: { verify: jest.Mock };

  beforeAll(async () => {
    process.env['APP_ENV'] = 'development';
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '3001';
    process.env['TZ'] = 'Asia/Kolkata';
    process.env['JWT_ACCESS_SECRET'] = 'test-access-secret';
    process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret';
    process.env['BCRYPT_COST'] = '4';

    userRepo = new InMemoryUserRepository();
    academyRepo = new InMemoryAcademyRepository();
    subscriptionRepo = new InMemorySubscriptionRepository();
    paymentRepo = new InMemorySubscriptionPaymentRepository();
    jwtService = new JwtService({});
    const tokenService = createTestTokenService(jwtService);
    clock = { now: () => new Date() };

    cashfreeGateway = {
      createOrder: jest.fn().mockResolvedValue({
        cfOrderId: 'cf_order_123',
        paymentSessionId: 'session_test_abc',
        orderExpiryTime: '2026-03-15T13:00:00Z',
      }),
      getOrder: jest.fn().mockResolvedValue({
        orderId: 'test',
        cfOrderId: 'cf_123',
        orderStatus: 'PAID',
        orderAmount: 299,
      }),
    };

    signatureVerifier = { verify: jest.fn().mockReturnValue(true) };

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        LoggingModule,
        JwtModule.register({}),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
      ],
      controllers: [SubscriptionPaymentsController],
      providers: [
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: ACADEMY_REPOSITORY, useValue: academyRepo },
        { provide: SUBSCRIPTION_REPOSITORY, useValue: subscriptionRepo },
        { provide: SUBSCRIPTION_PAYMENT_REPOSITORY, useValue: paymentRepo },
        { provide: CASHFREE_GATEWAY, useValue: cashfreeGateway },
        { provide: ACTIVE_STUDENT_COUNTER, useValue: { countActiveStudents: jest.fn().mockResolvedValue(30) } },
        { provide: CLOCK_PORT, useValue: clock },
        { provide: TOKEN_SERVICE, useValue: tokenService },
        { provide: WEBHOOK_SIGNATURE_VERIFIER, useValue: signatureVerifier },
        {
          provide: 'INITIATE_SUBSCRIPTION_PAYMENT_USE_CASE',
          useFactory: (ur: any, ar: any, sr: any, pr: any, gw: any, sc: any, c: any, l: any) =>
            new InitiateSubscriptionPaymentUseCase(ur, ar, sr, pr, gw, sc, c, l),
          inject: [
            USER_REPOSITORY, ACADEMY_REPOSITORY, SUBSCRIPTION_REPOSITORY,
            SUBSCRIPTION_PAYMENT_REPOSITORY, CASHFREE_GATEWAY, ACTIVE_STUDENT_COUNTER,
            CLOCK_PORT, LOGGER_PORT,
          ],
        },
        {
          provide: 'HANDLE_CASHFREE_WEBHOOK_USE_CASE',
          useFactory: (pr: any, sr: any, sv: any, c: any, l: any) =>
            new HandleCashfreeWebhookUseCase(pr, sr, sv, c, l),
          inject: [
            SUBSCRIPTION_PAYMENT_REPOSITORY, SUBSCRIPTION_REPOSITORY,
            WEBHOOK_SIGNATURE_VERIFIER, CLOCK_PORT, LOGGER_PORT,
          ],
        },
        {
          provide: 'GET_SUBSCRIPTION_PAYMENT_STATUS_USE_CASE',
          useFactory: (ur: any, ar: any, sr: any, pr: any, c: any) =>
            new GetSubscriptionPaymentStatusUseCase(ur, ar, sr, pr, c),
          inject: [
            USER_REPOSITORY, ACADEMY_REPOSITORY, SUBSCRIPTION_REPOSITORY,
            SUBSCRIPTION_PAYMENT_REPOSITORY, CLOCK_PORT,
          ],
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new RequestIdInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    userRepo.clear();
    academyRepo.clear();
    subscriptionRepo.clear();
    paymentRepo.clear();
    jest.clearAllMocks();
  });

  function makeToken(sub = 'user-1', role = 'OWNER') {
    return jwtService.sign(
      { sub, role, email: 'owner@test.com', tokenVersion: 0 },
      { secret: 'test-access-secret', expiresIn: 900 },
    );
  }

  async function seedOwnerWithAcademy() {
    const user = User.create({
      id: 'user-1',
      fullName: 'Test Owner',
      email: 'owner@test.com',
      phoneNumber: '+919876543210',
      role: 'OWNER',
      passwordHash: 'hashed',
    });
    const withAcademy = User.reconstitute('user-1', {
      ...user['props'],
      academyId: 'academy-1',
    });
    await userRepo.save(withAcademy);

    const academy = Academy.create({
      id: 'academy-1',
      ownerUserId: 'user-1',
      academyName: 'Test Academy',
      address: { line1: '1 St', city: 'A', state: 'B', pincode: '500001', country: 'India' },
    });
    await academyRepo.save(academy);

    const sub = Subscription.createTrial({
      id: 'sub-1',
      academyId: 'academy-1',
      trialStartAt: new Date(Date.now() - 15 * DAY_MS),
      trialEndAt: new Date(Date.now() + 15 * DAY_MS),
    });
    await subscriptionRepo.save(sub);
  }

  describe('POST /api/v1/subscription-payments/initiate', () => {
    it('requires bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/subscription-payments/initiate')
        .expect(401);
    });

    it('returns orderId + paymentSessionId for OWNER', async () => {
      await seedOwnerWithAcademy();
      const token = makeToken();

      const res = await request(app.getHttpServer())
        .post('/api/v1/subscription-payments/initiate')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentSessionId).toBe('session_test_abc');
      expect(res.body.data.amountInr).toBe(299);
      expect(res.body.data.tierKey).toBe('TIER_0_50');
      expect(res.body.data.orderId).toMatch(/^pc_sub_/);
    });

    it('rejects STAFF role', async () => {
      await seedOwnerWithAcademy();
      // Create a staff user
      const staff = User.create({
        id: 'staff-1',
        fullName: 'Staff',
        email: 'staff@test.com',
        phoneNumber: '+919876543211',
        role: 'STAFF',
        passwordHash: 'hashed',
      });
      const withAcademy = User.reconstitute('staff-1', { ...staff['props'], academyId: 'academy-1' });
      await userRepo.save(withAcademy);

      const token = makeToken('staff-1', 'STAFF');

      await request(app.getHttpServer())
        .post('/api/v1/subscription-payments/initiate')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/subscription-payments/:orderId/status', () => {
    it('returns payment status after initiation', async () => {
      await seedOwnerWithAcademy();
      const token = makeToken();

      // First initiate
      const initRes = await request(app.getHttpServer())
        .post('/api/v1/subscription-payments/initiate')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const orderId = initRes.body.data.orderId;

      // Then check status
      const statusRes = await request(app.getHttpServer())
        .get(`/api/v1/subscription-payments/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(statusRes.body.data.orderId).toBe(orderId);
      expect(statusRes.body.data.status).toBe('PENDING');
      expect(statusRes.body.data.tierKey).toBe('TIER_0_50');
    });

    it('returns 404 for unknown orderId', async () => {
      await seedOwnerWithAcademy();
      const token = makeToken();

      await request(app.getHttpServer())
        .get('/api/v1/subscription-payments/nonexistent/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});

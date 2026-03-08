import { NodemailerEmailSender } from './nodemailer-email-sender';
import type { AppConfigService } from '@shared/config/config.service';
import type { LoggerPort } from '@shared/logging/logger.port';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockRejectedValue(new Error('SMTP connection refused')),
  }),
}));

function mockConfig(overrides: Partial<AppConfigService> = {}): AppConfigService {
  return {
    emailDryRun: true,
    smtpHost: 'localhost',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'noreply@playconnect.app',
    ...overrides,
  } as unknown as AppConfigService;
}

function mockLogger(): jest.Mocked<LoggerPort> {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe('NodemailerEmailSender', () => {
  const testMessage = {
    to: 'user@test.com',
    subject: 'Test Subject',
    html: '<p>Test</p>',
  };

  it('should return true and log in DRY_RUN mode without creating transport', async () => {
    const logger = mockLogger();
    const sender = new NodemailerEmailSender(mockConfig(), logger);

    const result = await sender.send(testMessage);

    expect(result).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      'Email DRY_RUN: would send',
      expect.objectContaining({ to: 'user@test.com' }),
    );
  });

  it('should return false and log error on send failure', async () => {
    const logger = mockLogger();
    const sender = new NodemailerEmailSender(
      mockConfig({ emailDryRun: false } as Partial<AppConfigService>),
      logger,
    );

    const result = await sender.send(testMessage);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'Email send failed',
      expect.objectContaining({ to: 'user@test.com' }),
    );
  });
});

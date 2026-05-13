import { UploadPaymentProofUseCase } from './upload-payment-proof.usecase';
import { InMemoryUserRepository } from '../../../../test/helpers/in-memory-repos';
import { User } from '@domain/identity/entities/user.entity';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { LoggerPort } from '@shared/logging/logger.port';

function createParent(id = 'parent-1', academyId = 'academy-1'): User {
  const user = User.create({
    id,
    fullName: 'Test Parent',
    email: `${id}@test.com`,
    phoneNumber: '+919876543210',
    role: 'PARENT',
    passwordHash: 'hashed',
  });
  return User.reconstitute(id, { ...user['props'], academyId });
}

// Tiny 1x1 transparent PNG — passes both the magic-byte and the deep sharp
// parse the use case runs before hitting storage. Reused across tests so
// each case starts from a known-good payload.
const PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da636400000000050001a3a3a30000000049454e44ae426082',
  'hex',
);

// Oversize variant: real PNG header + padding. We only need the buffer LENGTH
// to exceed MAX_IMAGE_FILE_SIZE; the size check runs before validateImageBuffer
// so we never actually attempt to parse this monster.
function oversizePngBuffer(): Buffer {
  return Buffer.alloc(5 * 1024 * 1024 + 1);
}

describe('UploadPaymentProofUseCase (H2: upload-hardening)', () => {
  let userRepo: InMemoryUserRepository;
  let fileStorage: jest.Mocked<FileStoragePort>;
  let logger: jest.Mocked<LoggerPort>;
  let useCase: UploadPaymentProofUseCase;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    fileStorage = {
      upload: jest.fn().mockResolvedValue({ url: 'https://r2.example/x.jpg' }),
      // Other methods on the port may exist; tests only call upload.
    } as unknown as jest.Mocked<FileStoragePort>;
    logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;
    useCase = new UploadPaymentProofUseCase(userRepo, fileStorage, logger);
    await userRepo.save(createParent());
  });

  it('rejects non-PARENT actors as FORBIDDEN', async () => {
    const result = await useCase.execute({
      actorUserId: 'parent-1',
      actorRole: 'OWNER',
      buffer: PNG_BUFFER,
      mimeType: 'image/png',
      originalName: 'proof.png',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('rejects mime types outside the allow-list as VALIDATION', async () => {
    // H2 fix gate: the pre-fix code went straight to the buffer-magic-byte
    // check, so an unknown mime with a plausible-looking buffer could slip
    // through. Now the allow-list runs first.
    const result = await useCase.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      buffer: PNG_BUFFER,
      mimeType: 'application/pdf',
      originalName: 'proof.pdf',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    expect(fileStorage.upload).not.toHaveBeenCalled();
  });

  it('rejects oversize buffers (>5MB) as VALIDATION before hitting storage', async () => {
    // H2 fix: the size cap closes a denial-of-storage path where a parent
    // could push 30+ MB images at us — these would either fill the bucket
    // (cost), bog down R2 (timeouts), or surface as a raw 500 from R2 with
    // no client-friendly error path.
    const big = oversizePngBuffer();

    const result = await useCase.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      buffer: big,
      mimeType: 'image/png',
      originalName: 'huge.png',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    expect(fileStorage.upload).not.toHaveBeenCalled();
  });

  it('returns NETWORK when R2 throws a timeout-shaped error (retry signal)', async () => {
    // Timeout / network failures are recoverable — the client can back off
    // and retry the same payload. Surfacing them as NETWORK lets the mobile
    // app distinguish "try again" from "this won't work, give up".
    fileStorage.upload.mockRejectedValueOnce(
      Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
    );

    const result = await useCase.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      buffer: PNG_BUFFER,
      mimeType: 'image/png',
      originalName: 'proof.png',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK');
    // Network errors are expected operational signal — we don't burn an
    // error-log row on each one.
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns UPLOAD_FAILED and logs when R2 throws a terminal error', async () => {
    // Anything that doesn't look like a transient network blip gets surfaced
    // as UPLOAD_FAILED. We also log it so ops can see what's happening — the
    // user-facing error is intentionally vague, the log line carries the
    // diagnostic detail.
    fileStorage.upload.mockRejectedValueOnce(
      Object.assign(new Error('AccessDenied'), { code: 'AccessDenied' }),
    );

    const result = await useCase.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      buffer: PNG_BUFFER,
      mimeType: 'image/png',
      originalName: 'proof.png',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UPLOAD_FAILED');
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Payment-proof storage upload failed',
      expect.objectContaining({
        code: 'accessdenied',
        parentUserId: 'parent-1',
        academyId: 'academy-1',
      }),
    );
  });

  it('returns the storage URL on a happy-path upload', async () => {
    const result = await useCase.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      buffer: PNG_BUFFER,
      mimeType: 'image/png',
      originalName: 'proof.png',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.url).toBe('https://r2.example/x.jpg');
    expect(fileStorage.upload).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('works without a logger (optional dep stays optional)', async () => {
    // Some fixtures instantiate the use case without logger wiring; we don't
    // want R2 failures to NPE there. Failure path should still produce a
    // typed AppError, just without the ops-side log entry.
    const ucNoLogger = new UploadPaymentProofUseCase(userRepo, fileStorage);
    fileStorage.upload.mockRejectedValueOnce(new Error('boom'));

    const result = await ucNoLogger.execute({
      actorUserId: 'parent-1',
      actorRole: 'PARENT',
      buffer: PNG_BUFFER,
      mimeType: 'image/png',
      originalName: 'proof.png',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UPLOAD_FAILED');
  });
});

import { mapApiError } from './error-mapper';

describe('mapApiError', () => {
  it('maps 401 to UNAUTHORIZED', () => {
    const err = mapApiError(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('maps 400 to VALIDATION', () => {
    const err = mapApiError(400, { message: 'Bad input' });
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toBe('Bad input');
  });

  it('maps 403 to FORBIDDEN', () => {
    const err = mapApiError(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('maps 404 to NOT_FOUND', () => {
    const err = mapApiError(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('maps 500 to UNKNOWN', () => {
    const err = mapApiError(500);
    expect(err.code).toBe('UNKNOWN');
  });

  it('uses body message when available', () => {
    const err = mapApiError(401, { message: 'Invalid credentials' });
    expect(err.message).toBe('Invalid credentials');
  });

  it('uses default message when body has no message', () => {
    const err = mapApiError(401, { error: 'Unauthorized' });
    expect(err.message).toBe('Unauthorized');
  });
});

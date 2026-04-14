import { mapHttpError } from './error-mapper';

describe('mapHttpError', () => {
  describe('client errors (pass-through)', () => {
    it('passes server message for 400 validation errors', () => {
      const error = mapHttpError(400, { message: 'Email is required' });
      expect(error.code).toBe('VALIDATION');
      expect(error.message).toBe('Email is required');
    });

    it('passes server message for 401', () => {
      const error = mapHttpError(401, { message: 'Token expired' });
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Token expired');
    });

    it('passes server message for 403', () => {
      const error = mapHttpError(403, { message: 'Only owners can do this' });
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Only owners can do this');
    });

    it('passes server message for 404', () => {
      const error = mapHttpError(404, { message: 'Student not found' });
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Student not found');
    });

    it('passes server message for 409', () => {
      const error = mapHttpError(409, { message: 'Duplicate entry' });
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Duplicate entry');
    });

    it('reads "error" field if "message" is missing', () => {
      const error = mapHttpError(400, { error: 'Bad input' });
      expect(error.message).toBe('Bad input');
    });
  });

  describe('server errors (safe fallback)', () => {
    it('uses safe message for 500', () => {
      const error = mapHttpError(500, { message: 'MongoError: connection refused' });
      expect(error.code).toBe('UNKNOWN');
      expect(error.message).toBe('Something unexpected happened. Please try again or contact support if the issue persists.');
    });

    it('uses safe message for 502', () => {
      const error = mapHttpError(502, { message: 'Bad gateway' });
      expect(error.code).toBe('UNKNOWN');
      expect(error.message).toBe('Something unexpected happened. Please try again or contact support if the issue persists.');
    });

    it('uses safe message for unmapped status codes', () => {
      const error = mapHttpError(418, { message: "I'm a teapot" });
      expect(error.code).toBe('UNKNOWN');
      expect(error.message).toBe('Something unexpected happened. Please try again or contact support if the issue persists.');
    });
  });

  describe('missing body', () => {
    it('uses safe fallback when body is null', () => {
      const error = mapHttpError(400, null);
      expect(error.code).toBe('VALIDATION');
      expect(error.message).toBe('Please check your input and try again.');
    });

    it('uses safe fallback when body has no message', () => {
      const error = mapHttpError(401, { data: {} });
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Your session has expired. Please log in again.');
    });
  });

  describe('message truncation', () => {
    it('truncates overly long server messages', () => {
      const longMessage = 'a'.repeat(600);
      const error = mapHttpError(400, { message: longMessage });
      expect(error.message.length).toBe(500);
    });
  });
});

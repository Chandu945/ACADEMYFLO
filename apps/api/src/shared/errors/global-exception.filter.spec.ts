import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import type { ErrorEnvelope } from './error.types';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockRequest: Record<string, unknown>;
  let mockResponse: { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock };
  let mockHost: {
    switchToHttp: () => {
      getRequest: () => typeof mockRequest;
      getResponse: () => typeof mockResponse;
    };
  };

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockRequest = {
      url: '/api/v1/test',
      method: 'GET',
      headers: { 'x-request-id': 'test-request-id' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
  });

  it('should return standardized error envelope for BadRequestException', () => {
    const exception = new BadRequestException('Invalid input');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const body = mockResponse.json.mock.calls[0][0] as ErrorEnvelope;
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('BadRequest');
    expect(body.message).toBe('Invalid input');
    expect(body.path).toBe('/api/v1/test');
    expect(body.method).toBe('GET');
    expect(body.requestId).toBe('test-request-id');
    expect(body.timestamp).toBeDefined();
    expect(body.details).toEqual([]);
  });

  it('should return standardized error envelope for NotFoundException', () => {
    const exception = new NotFoundException('Resource not found');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body = mockResponse.json.mock.calls[0][0] as ErrorEnvelope;
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe('NotFound');
  });

  it('should handle validation errors with details array', () => {
    const exception = new BadRequestException({
      message: ['field1 must be a string', 'field2 is required'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, mockHost as never);

    const body = mockResponse.json.mock.calls[0][0] as ErrorEnvelope;
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Validation failed');
    expect(body.details).toEqual(['field1 must be a string', 'field2 is required']);
  });

  it('should handle unknown exceptions as 500', () => {
    const exception = new Error('Something broke');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = mockResponse.json.mock.calls[0][0] as ErrorEnvelope;
    expect(body.statusCode).toBe(500);
    expect(body.error).toBe('InternalServerError');
  });

  it('should not leak error details in production for 500 errors', () => {
    const prodFilter = new GlobalExceptionFilter(true);

    const exception = new Error('Database connection string leaked');

    prodFilter.catch(exception, mockHost as never);

    const body = mockResponse.json.mock.calls[0][0] as ErrorEnvelope;
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(body.details).toEqual([]);
  });

  it('should preserve non-500 error details in production', () => {
    const prodFilter = new GlobalExceptionFilter(true);

    const exception = new HttpException('Not authorized', HttpStatus.UNAUTHORIZED);

    prodFilter.catch(exception, mockHost as never);

    const body = mockResponse.json.mock.calls[0][0] as ErrorEnvelope;
    expect(body.statusCode).toBe(401);
    expect(body.message).toBe('Not authorized');
  });
});

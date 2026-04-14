import type { AppErrorCode } from '@playconnect/contracts';
export type { AppErrorCode } from '@playconnect/contracts';

export type AppError = {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
};

export function validation(message: string, fieldErrors?: Record<string, string>): AppError {
  return { code: 'VALIDATION', message, fieldErrors };
}

export function network(message = 'Network error'): AppError {
  return { code: 'NETWORK', message };
}

export function unknown(message = 'An unexpected error occurred'): AppError {
  return { code: 'UNKNOWN', message };
}

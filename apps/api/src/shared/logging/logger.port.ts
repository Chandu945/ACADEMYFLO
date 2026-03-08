/**
 * Logger port — abstraction for structured logging.
 * Domain and Application layers depend on this interface only,
 * never on the concrete implementation (pino, winston, etc.).
 */
export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export const LOGGER_PORT = Symbol('LOGGER_PORT');

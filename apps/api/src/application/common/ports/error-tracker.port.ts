export const ERROR_TRACKER_PORT = Symbol('ERROR_TRACKER_PORT');

export interface ErrorTrackerPort {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

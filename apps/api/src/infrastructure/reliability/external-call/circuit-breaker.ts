/**
 * Circuit breaker — Not applicable in this step.
 *
 * Future implementation will open after N failures in a window,
 * half-open after cool down, and reject fast when open.
 *
 * For now, reliability is handled by timeout + bounded retry only.
 */
export const CIRCUIT_BREAKER_NOT_IMPLEMENTED = true;

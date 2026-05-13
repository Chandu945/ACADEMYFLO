export interface ErrorEnvelope {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  /**
   * Typed AppError code propagated from the application layer (G1 mobile-
   * alignment fix). When a use case returns `err(new AppError('UPLOAD_FAILED',
   * '...'))`, the result-mapper passes the code through here so the mobile
   * error-mapper can render the right copy + take the right branch (retry
   * for NETWORK, terminal for UPLOAD_FAILED, etc.) instead of falling back
   * to a status-code-only mapping that loses the distinction. Optional —
   * plain framework exceptions (BadRequestException from DTO validation,
   * etc.) don't carry a typed code, and clients should fall back to
   * status-code mapping when absent.
   */
  code?: string;
  path: string;
  method: string;
  timestamp: string;
  requestId: string;
  details: unknown[];
}

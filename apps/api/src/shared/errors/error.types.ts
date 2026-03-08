export interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  method: string;
  timestamp: string;
  requestId: string;
  details: unknown[];
}

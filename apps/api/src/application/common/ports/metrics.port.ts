export const METRICS_PORT = Symbol('METRICS_PORT');

export interface MetricsPort {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  render(): string;
}

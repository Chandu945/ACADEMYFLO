import { Injectable } from '@nestjs/common';
import type { MetricsPort } from '@application/common/ports/metrics.port';

@Injectable()
export class BasicMetricsAdapter implements MetricsPort {
  private counters = new Map<string, number>();
  private histograms = new Map<string, { sum: number; count: number }>();

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.key(name, labels);
    const existing = this.histograms.get(key) ?? { sum: 0, count: 0 };
    existing.sum += value;
    existing.count += 1;
    this.histograms.set(key, existing);
  }

  render(): string {
    const lines: string[] = [];

    for (const [key, value] of this.counters) {
      lines.push(`# TYPE ${key} counter`);
      lines.push(`${key} ${value}`);
    }

    for (const [key, value] of this.histograms) {
      lines.push(`# TYPE ${key} summary`);
      lines.push(`${key}_sum ${value.sum}`);
      lines.push(`${key}_count ${value.count}`);
    }

    return lines.join('\n') + '\n';
  }

  private key(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const sorted = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${sorted}}`;
  }
}

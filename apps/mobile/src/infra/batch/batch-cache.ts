import type { BatchListItem } from '../../domain/batch/batch.types';
import { listBatches } from './batch-api';

/**
 * Tiny module-level cache for the first-page batch list that filter/multi-select
 * components use. Without this, every Fees / Attendance / Students mount re-fetches
 * the same 100 batches. Stale-while-revalidate: return cached immediately if within
 * TTL; otherwise fetch fresh. Callers that care about refreshing on mutation can
 * call `invalidateBatchCache()`.
 */

const TTL_MS = 60_000;
const PAGE_SIZE = 100;

let cache: { items: BatchListItem[]; at: number } | null = null;
let inFlight: Promise<BatchListItem[]> | null = null;

async function fetchAndCache(): Promise<BatchListItem[]> {
  const result = await listBatches(1, PAGE_SIZE);
  const items = result.ok && Array.isArray(result.value?.data) ? result.value.data : [];
  cache = { items, at: Date.now() };
  return items;
}

export async function getBatchesCached(): Promise<BatchListItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  if (inFlight) return inFlight;
  inFlight = fetchAndCache().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function invalidateBatchCache(): void {
  cache = null;
}

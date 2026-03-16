import { APP_VERSION, APP_PLATFORM } from '../../../infra/app-version';
import { env } from '../../../infra/env';

export type VersionCheckResult = {
  updateRequired: boolean;
  minVersion: string;
  storeUrl: string;
};

export async function checkAppVersionUseCase(): Promise<VersionCheckResult | null> {
  try {
    const url = `${env.API_BASE_URL}/api/v1/health/app-version?platform=${APP_PLATFORM}&version=${APP_VERSION}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;

    const json = (await res.json()) as VersionCheckResult;
    return json;
  } catch {
    // Network error — don't block the user, skip version check
    return null;
  }
}

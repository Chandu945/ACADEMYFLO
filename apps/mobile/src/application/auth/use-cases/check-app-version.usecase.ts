export type VersionCheckResult = {
  updateRequired: boolean;
  minVersion: string;
  storeUrl: string;
};

export type VersionCheckDeps = {
  apiBaseUrl: string;
  appVersion: string;
  platform: 'android' | 'ios' | 'web';
};

// In-memory cache of the last successful version-check response. Lets the
// kill-switch keep enforcing the most-recently-seen minimum version when the
// endpoint has a transient outage during a single session, instead of
// silently failing open. Reset on app cold-start.
let lastGoodResult: VersionCheckResult | null = null;

export async function checkAppVersionUseCase(
  deps: VersionCheckDeps,
): Promise<VersionCheckResult | null> {
  try {
    const url = `${deps.apiBaseUrl}/api/v1/health/app-version?platform=${deps.platform}&version=${deps.appVersion}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return lastGoodResult;

    const json = (await res.json()) as VersionCheckResult;
    lastGoodResult = json;
    return json;
  } catch {
    // Network/timeout error — return the last-known-good result so a flaky
    // endpoint doesn't silently disable the kill-switch mid-session.
    return lastGoodResult;
  }
}

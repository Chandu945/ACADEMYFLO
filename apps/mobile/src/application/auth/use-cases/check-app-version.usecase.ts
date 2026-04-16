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

export async function checkAppVersionUseCase(
  deps: VersionCheckDeps,
): Promise<VersionCheckResult | null> {
  try {
    const url = `${deps.apiBaseUrl}/api/v1/health/app-version?platform=${deps.platform}&version=${deps.appVersion}`;
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

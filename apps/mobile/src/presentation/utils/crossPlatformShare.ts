/**
 * Cross-platform share helpers. The mobile app uses `react-native-share`
 * which is native-only — on the react-native-web QA build it silently
 * no-ops. These helpers route to:
 *
 *   - native (iOS/Android): `react-native-share` as before
 *   - web: the browser's Web Share API when available, falling back to
 *     clipboard for text, or a forced blob download for files
 *
 * Use these instead of importing `react-native-share` (or RN's built-in
 * `Share`) directly. Existing native call sites can switch one-for-one;
 * the web side will Just Work.
 */
import { Platform } from 'react-native';
import RNShare from 'react-native-share';
import { crossAlert } from './crossPlatformAlert';
import { getAccessToken } from '../../infra/http/api-client';

type ShareTextInput = {
  message: string;
  title?: string;
};

type ShareFileInput = {
  /**
   * Source for the file.
   *   - Web: an http(s) URL we can `fetch`. If the URL is on our API origin
   *     we'll automatically attach the bearer token.
   *   - Native: any URL/path `RNShare.open` accepts (http, file://, data:).
   */
  url: string;
  /** Display filename. Drives the saved name on web and the share-sheet name on native. */
  filename: string;
  /** e.g. 'application/pdf', 'image/jpeg' */
  mimeType: string;
  /** Optional title shown in the native share sheet. */
  title?: string;
};

/**
 * Share a plain-text message. On web, prefers the OS share sheet (Web
 * Share API). Falls back to copying the message to the clipboard and
 * surfacing a friendly confirmation if the share sheet isn't available
 * (older browsers, non-HTTPS origins, etc.).
 */
export async function shareText(input: ShareTextInput): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      await RNShare.open({ message: input.message, title: input.title });
    } catch (e: any) {
      // RNShare throws on user cancel — swallow only that signature.
      const msg = String(e?.message ?? '');
      if (msg !== 'User did not share' && !msg.includes('cancel') && !msg.includes('dismiss')) {
        crossAlert('Error', 'Could not share. Please try again.');
      }
    }
    return;
  }

  // Web path
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.share) {
      await nav.share({ title: input.title, text: input.message });
      return;
    }
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(input.message);
      crossAlert('Copied', 'Details copied to clipboard.');
      return;
    }
    crossAlert(input.title ?? 'Share', input.message);
  } catch (e: any) {
    // AbortError fires when the user dismisses the share sheet.
    if (e?.name !== 'AbortError') {
      crossAlert('Error', 'Could not share. Please try again.');
    }
  }
}

/**
 * Share a file (image, PDF, etc.). On native, hands off to the OS share
 * sheet via react-native-share. On web, fetches the bytes, builds a Blob
 * URL, and triggers a download — there is no reliable way to inject
 * arbitrary files into the Web Share API across browsers, and a download
 * matches what users actually want on a laptop.
 */
export async function shareFile(input: ShareFileInput): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const fileUri =
        Platform.OS === 'android' && input.url.startsWith('/')
          ? `file://${input.url}`
          : input.url;
      await RNShare.open({
        url: fileUri,
        type: input.mimeType,
        filename: input.filename,
        title: input.title,
      });
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg !== 'User did not share' && !msg.includes('cancel') && !msg.includes('dismiss')) {
        crossAlert('Error', 'Could not share. Please try again.');
      }
    }
    return;
  }

  // Web path: fetch + blob + <a download> click.
  try {
    // Detect data: URLs — we can build a blob directly without fetch.
    let blob: Blob;
    if (input.url.startsWith('data:')) {
      const res = await fetch(input.url);
      blob = await res.blob();
    } else {
      const token = getAccessToken();
      // Only attach auth when the URL is on our API origin; we don't want
      // to leak bearer tokens to third-party hosts (CDNs, etc.).
      const headers: Record<string, string> = {};
      if (token && typeof location !== 'undefined') {
        try {
          const target = new URL(input.url, location.origin);
          const apiHost = (process as any).env?.NEXT_PUBLIC_API_BASE_URL ?? '';
          if (
            target.origin === location.origin ||
            (apiHost && input.url.startsWith(apiHost))
          ) {
            headers.Authorization = `Bearer ${token}`;
          }
        } catch {
          // ignore URL parse errors
        }
      }
      const res = await fetch(input.url, { headers });
      if (!res.ok) {
        crossAlert('Error', `Could not download file. (HTTP ${res.status})`);
        return;
      }
      blob = await res.blob();
    }

    const g = globalThis as unknown as {
      URL: { createObjectURL: (b: Blob) => string; revokeObjectURL: (u: string) => void };
      document: { createElement: (tag: string) => { href: string; download: string; click: () => void } };
    };
    const objectUrl = g.URL.createObjectURL(blob);
    const link = g.document.createElement('a');
    link.href = objectUrl;
    link.download = input.filename;
    link.click();
    // Revoke on the next tick — same-tick revoke can race with the
    // browser's download trigger on some Chromium versions.
    setTimeout(() => g.URL.revokeObjectURL(objectUrl), 0);
  } catch {
    crossAlert('Error', 'Could not share. Please try again.');
  }
}

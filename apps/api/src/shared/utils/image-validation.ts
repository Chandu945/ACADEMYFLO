import sharp from 'sharp';

/** Allowed image MIME types across all upload endpoints. */
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Max upload size in bytes (5 MB). */
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

/** MIME → canonical file extension mapping. */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Return the canonical extension for a validated MIME type.
 * Falls back to 'jpg' if the MIME type is unknown (should never happen
 * when called after validateImageBuffer).
 */
export function extensionForMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? 'jpg';
}

// Magic-byte signatures for each allowed format
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  // JPEG: FF D8 FF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  // WebP: RIFF....WEBP  (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Validate that the buffer is a genuine image of the claimed MIME type.
 * Two layers:
 *   1. Magic-byte signature match (fast reject on obvious non-images / MIME spoofing)
 *   2. sharp metadata parse (catches polyglots that pass magic bytes but are otherwise
 *      malformed, or whose declared format mismatches the real content after decoding)
 */
export async function validateImageBuffer(
  buffer: Buffer,
  claimedMime: string,
): Promise<{ valid: true; detectedMime: string } | { valid: false; reason: string }> {
  if (buffer.length < 12) {
    return { valid: false, reason: 'File too small to be a valid image' };
  }

  // Detect actual format from magic bytes
  let detectedMime: string | null = null;

  for (const sig of SIGNATURES) {
    const match = sig.bytes.every((b, i) => buffer[i] === b);
    if (match) {
      // Extra check for WebP: bytes 8-11 must be "WEBP"
      if (sig.mime === 'image/webp') {
        if (
          buffer[8] === 0x57 && // W
          buffer[9] === 0x45 && // E
          buffer[10] === 0x42 && // B
          buffer[11] === 0x50 // P
        ) {
          detectedMime = sig.mime;
        }
      } else {
        detectedMime = sig.mime;
      }
      break;
    }
  }

  if (!detectedMime) {
    return { valid: false, reason: 'File content does not match any allowed image format' };
  }

  if (detectedMime !== claimedMime) {
    return {
      valid: false,
      reason: `MIME type mismatch: claimed ${claimedMime} but content is ${detectedMime}`,
    };
  }

  // Deep parseability check: sharp will throw if the buffer can't be decoded as
  // a real image (truncated, polyglot, malformed body after a valid header).
  try {
    const meta = await sharp(buffer, { failOn: 'error' }).metadata();
    const sharpMime = meta.format ? SHARP_FORMAT_TO_MIME[meta.format] : undefined;
    if (!sharpMime) {
      return { valid: false, reason: 'Image format not supported' };
    }
    if (sharpMime !== detectedMime) {
      return {
        valid: false,
        reason: `Content mismatch: header says ${detectedMime} but decoded as ${sharpMime}`,
      };
    }
  } catch {
    return { valid: false, reason: 'Image content is corrupt or unreadable' };
  }

  return { valid: true, detectedMime };
}

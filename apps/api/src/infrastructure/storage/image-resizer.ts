import sharp from 'sharp';

export const IMAGE_CAP_WIDTH_PX = 2000;
export const IMAGE_THUMB_WIDTH_PX = 400;
export const IMAGE_JPEG_QUALITY = 82;

export interface ResizedImage {
  /** Original (downscaled to IMAGE_CAP_WIDTH_PX if larger). Always JPEG. */
  original: Buffer;
  /** Thumbnail at IMAGE_THUMB_WIDTH_PX longest edge. Always JPEG. */
  thumbnail: Buffer;
}

/**
 * Decode any supported image (JPEG / PNG / WebP / HEIC) and emit:
 *   - `original` capped at 2000px longest edge, JPEG q82, EXIF stripped
 *   - `thumbnail` at 400px longest edge, JPEG q82
 *
 * Throws if the input buffer is not a valid image.
 */
export async function resizeForUpload(input: Buffer): Promise<ResizedImage> {
  const base = sharp(input, { failOn: 'error' }).rotate(); // auto-orient from EXIF before stripping
  const original = await base
    .clone()
    .resize({
      width: IMAGE_CAP_WIDTH_PX,
      height: IMAGE_CAP_WIDTH_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  const thumbnail = await base
    .clone()
    .resize({
      width: IMAGE_THUMB_WIDTH_PX,
      height: IMAGE_THUMB_WIDTH_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { original, thumbnail };
}

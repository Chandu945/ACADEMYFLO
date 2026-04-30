/**
 * Derive the thumbnail URL for a profile/photo URL produced by our R2 upload
 * pipeline (apps/api/src/infrastructure/storage/r2-storage.service.ts). The
 * pipeline writes both `<name>.jpg` and `<name>-thumb.jpg` for every upload.
 *
 * Returns the thumb URL if we can compute one; otherwise null. Callers should
 * fall back to the original on Image `onError` since photos uploaded before
 * the pipeline added thumbs may not have a `-thumb` sibling on R2.
 *
 * Examples
 *   https://cdn.example.com/students/abc.jpg     → ...abc-thumb.jpg
 *   https://cdn.example.com/students/abc-thumb.jpg → unchanged (already thumb)
 *   /uploads/students/abc.jpg                    → null (legacy local storage,
 *                                                   no thumb sibling exists)
 */
export function getThumbnailUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Already a thumbnail — use as-is
  if (/-thumb\.[a-zA-Z0-9]+(\?|$)/.test(url)) return url;
  // Local-storage fallback (dev only) — no thumb generated
  if (url.startsWith('/uploads/')) return null;
  // Insert `-thumb` before the file extension, preserving any query string
  return url.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/, (_match, ext: string, query?: string) => {
    return `-thumb${ext}${query ?? ''}`;
  });
}

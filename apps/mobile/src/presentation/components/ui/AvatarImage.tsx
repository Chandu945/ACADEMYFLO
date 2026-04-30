import React, { useMemo, useState } from 'react';
import { Image, type ImageProps, type StyleProp, type ImageStyle } from 'react-native';
import { getThumbnailUrl } from '../../utils/image-url';

type AvatarImageProps = Omit<ImageProps, 'source'> & {
  url: string;
  /**
   * When true (default), tries the `-thumb` variant first and falls back to
   * the full-size URL on error. Pass `false` for places that need the full
   * resolution (e.g. detail screens).
   */
  preferThumbnail?: boolean;
  style?: StyleProp<ImageStyle>;
};

/**
 * Avatar image that prefers the server-side thumbnail (~10–50 KB) over the
 * full-resolution upload (~500 KB–1.5 MB), with graceful fallback for older
 * photos that pre-date the thumb pipeline.
 *
 * Use this anywhere a profile/student/staff photo is rendered at small size
 * (lists, rows, badges). For detail screens at full size, pass
 * preferThumbnail={false}.
 */
export function AvatarImage({ url, preferThumbnail = true, ...rest }: AvatarImageProps) {
  const thumbUrl = useMemo(
    () => (preferThumbnail ? getThumbnailUrl(url) : null),
    [url, preferThumbnail],
  );
  const [src, setSrc] = useState(thumbUrl ?? url);

  // If the URL prop changes (e.g. parent re-renders with a different student),
  // reset to the preferred source. Keying on url avoids stale fallback state.
  const lastUrlRef = React.useRef(url);
  if (lastUrlRef.current !== url) {
    lastUrlRef.current = url;
    const next = (preferThumbnail ? getThumbnailUrl(url) : null) ?? url;
    if (next !== src) setSrc(next);
  }

  return (
    <Image
      {...rest}
      source={{ uri: src }}
      onError={() => {
        // Thumb missing on server (legacy upload) — fall back to original.
        if (src !== url) setSrc(url);
      }}
    />
  );
}

import { getThumbnailUrl } from './image-url';

describe('getThumbnailUrl', () => {
  it('inserts -thumb before the extension on a normal URL', () => {
    expect(
      getThumbnailUrl('https://cdn.example.com/students/abc123.jpg'),
    ).toBe('https://cdn.example.com/students/abc123-thumb.jpg');
  });

  it('preserves a query string', () => {
    expect(
      getThumbnailUrl('https://cdn.example.com/students/abc.jpg?v=5'),
    ).toBe('https://cdn.example.com/students/abc-thumb.jpg?v=5');
  });

  it('returns the same URL when it is already a thumbnail', () => {
    const u = 'https://cdn.example.com/students/abc-thumb.jpg';
    expect(getThumbnailUrl(u)).toBe(u);
  });

  it('handles webp / png extensions', () => {
    expect(
      getThumbnailUrl('https://cdn.example.com/students/abc.png'),
    ).toBe('https://cdn.example.com/students/abc-thumb.png');
    expect(
      getThumbnailUrl('https://cdn.example.com/students/abc.webp'),
    ).toBe('https://cdn.example.com/students/abc-thumb.webp');
  });

  it('returns null for legacy local-storage URLs (no thumbnail sibling exists)', () => {
    expect(getThumbnailUrl('/uploads/students/abc.jpg')).toBeNull();
  });

  it('returns null for null or empty input', () => {
    expect(getThumbnailUrl(null)).toBeNull();
    expect(getThumbnailUrl(undefined)).toBeNull();
    expect(getThumbnailUrl('')).toBeNull();
  });

  it('does not double-thumb a URL that contains "thumb" as part of a path segment', () => {
    // "thumbnails" segment in path is NOT the same as a -thumb suffix; should
    // still derive a thumb-suffixed sibling.
    expect(
      getThumbnailUrl('https://cdn.example.com/thumbnails/abc.jpg'),
    ).toBe('https://cdn.example.com/thumbnails/abc-thumb.jpg');
  });

  it('handles UUID filenames with hyphens', () => {
    expect(
      getThumbnailUrl(
        'https://cdn.example.com/students/3b2e9c7a-5f1a-4d8a-8b6c-e2f0a1b4d9c7.jpg',
      ),
    ).toBe(
      'https://cdn.example.com/students/3b2e9c7a-5f1a-4d8a-8b6c-e2f0a1b4d9c7-thumb.jpg',
    );
  });
});

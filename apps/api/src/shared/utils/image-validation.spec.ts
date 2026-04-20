import sharp from 'sharp';
import { validateImageBuffer } from './image-validation';

async function makeRealImage(format: 'jpeg' | 'png' | 'webp'): Promise<Buffer> {
  return sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    [format]()
    .toBuffer();
}

describe('validateImageBuffer', () => {
  it('accepts a real JPEG', async () => {
    const buf = await makeRealImage('jpeg');
    const result = await validateImageBuffer(buf, 'image/jpeg');
    expect(result.valid).toBe(true);
  });

  it('accepts a real PNG', async () => {
    const buf = await makeRealImage('png');
    const result = await validateImageBuffer(buf, 'image/png');
    expect(result.valid).toBe(true);
  });

  it('rejects a file whose MIME claim does not match content', async () => {
    const buf = await makeRealImage('png');
    const result = await validateImageBuffer(buf, 'image/jpeg');
    expect(result.valid).toBe(false);
  });

  it('rejects a polyglot: valid PNG magic bytes, corrupt body', async () => {
    // PNG magic + malformed body. Magic check passes, sharp decode fails.
    const polyglot = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('THIS-IS-NOT-A-REAL-IMAGE-BODY-'.repeat(10), 'utf-8'),
    ]);
    const result = await validateImageBuffer(polyglot, 'image/png');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/corrupt|unreadable/i);
  });

  it('rejects a file too small to be an image', async () => {
    const tiny = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const result = await validateImageBuffer(tiny, 'image/png');
    expect(result.valid).toBe(false);
  });

  it('rejects a text file masquerading as an image', async () => {
    const text = Buffer.from('GET / HTTP/1.1\r\nHost: evil.com\r\n\r\n'.repeat(10));
    const result = await validateImageBuffer(text, 'image/png');
    expect(result.valid).toBe(false);
  });
});

import { requestContextStorage, getRequestContext } from './request-context';

describe('RequestContext', () => {
  it('should return undefined outside of a context', () => {
    expect(getRequestContext()).toBeUndefined();
  });

  it('should return context when inside run()', async () => {
    const ctx = { requestId: 'test-123' };

    await new Promise<void>((resolve) => {
      requestContextStorage.run(ctx, () => {
        const retrieved = getRequestContext();
        expect(retrieved).toBeDefined();
        expect(retrieved!.requestId).toBe('test-123');
        resolve();
      });
    });
  });

  it('should isolate contexts between concurrent runs', async () => {
    const results: string[] = [];

    await Promise.all([
      new Promise<void>((resolve) => {
        requestContextStorage.run({ requestId: 'ctx-a' }, async () => {
          await new Promise((r) => setTimeout(r, 10));
          results.push(getRequestContext()!.requestId);
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        requestContextStorage.run({ requestId: 'ctx-b' }, async () => {
          await new Promise((r) => setTimeout(r, 5));
          results.push(getRequestContext()!.requestId);
          resolve();
        });
      }),
    ]);

    expect(results).toContain('ctx-a');
    expect(results).toContain('ctx-b');
  });
});

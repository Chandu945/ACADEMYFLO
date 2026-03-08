import { IndexVerifierService } from './index-verifier.service';
import { INDEX_SPEC } from './index-spec';

describe('IndexVerifierService', () => {
  function createMockConnection(
    indexesByCollection: Record<string, Array<{ key: Record<string, 1 | -1> }>>,
  ) {
    return {
      db: {
        collection: (name: string) => ({
          indexes: async () => indexesByCollection[name] ?? [],
        }),
      },
    };
  }

  function createMockConfig(enabled: boolean) {
    return { indexAssertionEnabled: enabled } as any;
  }

  it('should return no missing indexes when all exist', async () => {
    const indexesByCollection: Record<string, Array<{ key: Record<string, 1 | -1> }>> = {};
    for (const spec of INDEX_SPEC) {
      if (!indexesByCollection[spec.collection]) {
        indexesByCollection[spec.collection] = [];
      }
      indexesByCollection[spec.collection]!.push({ key: spec.keys });
    }

    const service = new IndexVerifierService(
      createMockConnection(indexesByCollection) as any,
      createMockConfig(true),
    );

    const missing = await service.verify();
    expect(missing).toHaveLength(0);
  });

  it('should detect missing indexes', async () => {
    const service = new IndexVerifierService(
      createMockConnection({}) as any,
      createMockConfig(true),
    );

    const missing = await service.verify();
    expect(missing.length).toBe(INDEX_SPEC.length);
  });

  it('should not run when disabled', async () => {
    const service = new IndexVerifierService(
      createMockConnection({}) as any,
      createMockConfig(false),
    );

    // onModuleInit should silently return
    await service.onModuleInit();
    // No error thrown = success
  });

  it('should detect partially missing indexes', async () => {
    const partial: Record<string, Array<{ key: Record<string, 1 | -1> }>> = {
      sessions: [{ key: { userId: 1, deviceId: 1 } }],
      // Missing the expiresAt TTL index
    };

    const service = new IndexVerifierService(
      createMockConnection(partial) as any,
      createMockConfig(true),
    );

    const missing = await service.verify();
    const missingCollections = missing.map((m) => m.collection);
    expect(missingCollections).toContain('sessions');
    // The expiresAt index for sessions should be missing
    const sessionMissing = missing.filter((m) => m.collection === 'sessions');
    expect(sessionMissing).toHaveLength(1);
    expect(sessionMissing[0]!.keys).toEqual({ expiresAt: 1 });
  });
});

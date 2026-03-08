import { execSync } from 'child_process';
import { join } from 'path';

const API_ROOT = join(__dirname, '..', '..');

function runDepcruise(
  srcPath: string,
  configOverrides?: string,
): { exitCode: number; output: string } {
  const config = configOverrides || '.dependency-cruiser.js';
  const cmd = `npx depcruise --config ${config} ${srcPath}`;
  try {
    const output = execSync(cmd, {
      cwd: API_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, output };
  } catch (error: unknown) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: e.status ?? 1,
      output: (e.stdout ?? '') + (e.stderr ?? ''),
    };
  }
}

describe('Architecture Rules', () => {
  describe('Real codebase', () => {
    it('should have zero layer violations in src/', () => {
      const result = runDepcruise('src');
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('no dependency violations found');
    });
  });

  describe('Fixture: domain-imports-infra', () => {
    it('should detect violation when domain imports infrastructure', () => {
      // Use a temporary inline config that maps fixture paths to layer rules
      const fixtureConfig = 'test/architecture/fixture-domain-infra.js';
      const result = runDepcruise('test/architecture/fixtures/domain-imports-infra', fixtureConfig);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain('domain-no-infrastructure-import');
    });
  });

  describe('Fixture: presentation-imports-infra', () => {
    it('should detect violation when presentation imports infrastructure', () => {
      const fixtureConfig = 'test/architecture/fixture-pres-infra.js';
      const result = runDepcruise(
        'test/architecture/fixtures/presentation-imports-infra',
        fixtureConfig,
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain('presentation-no-direct-infrastructure');
    });
  });
});

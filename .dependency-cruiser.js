/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // === WORKSPACE BOUNDARY RULES ===

    {
      name: 'no-cross-app-imports',
      comment: 'Apps must not import directly from other apps. Use shared packages instead.',
      severity: 'error',
      from: { path: '^apps/api/' },
      to: { path: '^apps/(admin-web|mobile)/' },
    },
    {
      name: 'no-cross-app-imports',
      comment: 'Apps must not import directly from other apps. Use shared packages instead.',
      severity: 'error',
      from: { path: '^apps/admin-web/' },
      to: { path: '^apps/(api|mobile)/' },
    },
    {
      name: 'no-cross-app-imports',
      comment: 'Apps must not import directly from other apps. Use shared packages instead.',
      severity: 'error',
      from: { path: '^apps/mobile/' },
      to: { path: '^apps/(api|admin-web)/' },
    },

    // === CIRCULAR DEPENDENCY DETECTION ===

    {
      name: 'no-circular',
      comment: 'Circular dependencies are not allowed.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },

    // === CLEAN ARCHITECTURE LAYER RULES (enforced once source exists) ===

    {
      name: 'domain-no-infra-import',
      comment: 'Domain layer must not import from infrastructure layer.',
      severity: 'error',
      from: { path: 'src/domain/' },
      to: { path: 'src/infrastructure/' },
    },
    {
      name: 'domain-no-infra-import-short',
      comment: 'Domain layer must not import from infra layer (mobile naming).',
      severity: 'error',
      from: { path: 'src/domain/' },
      to: { path: 'src/infra/' },
    },
    {
      name: 'domain-no-presentation-import',
      comment: 'Domain layer must not import from presentation layer.',
      severity: 'error',
      from: { path: 'src/domain/' },
      to: { path: 'src/presentation/' },
    },
    {
      name: 'domain-no-application-import',
      comment: 'Domain layer must not depend on application layer (inner depends on outer violation).',
      severity: 'error',
      from: { path: 'src/domain/' },
      to: { path: 'src/application/' },
    },
    {
      name: 'application-no-infra-import',
      comment: 'Application layer must not import from infrastructure layer.',
      severity: 'error',
      from: { path: 'src/application/' },
      to: { path: 'src/infrastructure/' },
    },
    {
      name: 'application-no-infra-import-short',
      comment: 'Application layer must not import from infra layer (mobile naming).',
      severity: 'error',
      from: { path: 'src/application/' },
      to: { path: 'src/infra/' },
    },
    {
      name: 'application-no-presentation-import',
      comment: 'Application layer must not import from presentation layer.',
      severity: 'error',
      from: { path: 'src/application/' },
      to: { path: 'src/presentation/' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};

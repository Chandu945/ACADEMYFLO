/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // =====================================================================
    // DOMAIN LAYER: No outward dependencies (purest layer)
    // Domain can only import from shared/kernel
    // =====================================================================
    {
      name: 'domain-no-application-import',
      comment: 'Domain layer must not import from application layer.',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { path: '^src/application/' },
    },
    {
      name: 'domain-no-infrastructure-import',
      comment: 'Domain layer must not import from infrastructure layer.',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { path: '^src/infrastructure/' },
    },
    {
      name: 'domain-no-presentation-import',
      comment: 'Domain layer must not import from presentation layer.',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { path: '^src/presentation/' },
    },
    {
      name: 'domain-no-shared-non-kernel',
      comment:
        'Domain layer may only use shared/kernel. No config, logging, errors, or validation.',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: {
        path: '^src/shared/(config|logging|errors|validation)/',
      },
    },

    // =====================================================================
    // APPLICATION LAYER: Only depends on domain + shared/kernel
    // =====================================================================
    {
      name: 'application-no-infrastructure-import',
      comment: 'Application layer must not import from infrastructure layer.',
      severity: 'error',
      from: { path: '^src/application/' },
      to: { path: '^src/infrastructure/' },
    },
    {
      name: 'application-no-presentation-import',
      comment: 'Application layer must not import from presentation layer.',
      severity: 'error',
      from: { path: '^src/application/' },
      to: { path: '^src/presentation/' },
    },

    // =====================================================================
    // PRESENTATION LAYER: Must not bypass application to reach infrastructure
    // =====================================================================
    {
      name: 'presentation-no-direct-infrastructure',
      comment:
        'Presentation must not import infrastructure directly (except database module for DI wiring).',
      severity: 'error',
      from: { path: '^src/presentation/' },
      to: {
        path: '^src/infrastructure/',
        pathNot: '^src/infrastructure/database/mongodb\\.(module|health)\\.ts$',
      },
    },

    // =====================================================================
    // CIRCULAR DEPENDENCY DETECTION
    // =====================================================================
    {
      name: 'no-circular',
      comment: 'Circular dependencies are not allowed.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: [
        'dist',
        'coverage',
        'test/architecture/fixtures',
        '\\.spec\\.ts$',
        '\\.e2e-spec\\.ts$',
      ],
    },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};

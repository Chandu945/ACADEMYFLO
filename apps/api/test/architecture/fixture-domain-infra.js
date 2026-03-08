/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-infrastructure-import',
      severity: 'error',
      comment: 'Domain must not import infrastructure.',
      from: { path: 'domain\\.ts$' },
      to: { path: 'infra\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: false,
  },
};

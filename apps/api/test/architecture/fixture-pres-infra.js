/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'presentation-no-direct-infrastructure',
      severity: 'error',
      comment: 'Presentation must not import infrastructure directly.',
      from: { path: 'controller\\.ts$' },
      to: { path: 'infra\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: false,
  },
};

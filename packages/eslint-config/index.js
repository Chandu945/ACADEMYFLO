/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Disallow console.log in production code — test files get an override below
    'no-console': ['error', { allow: ['warn', 'error'] }],

    // TypeScript strict rules
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // Prevent relative imports that escape workspace boundaries
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../../apps/*', '../../../apps/*'],
            message: 'Cross-app imports are forbidden. Use shared packages instead.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['*.spec.ts', '*.e2e-spec.ts'],
      rules: {
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'coverage/',
    '*.js',
    '*.cjs',
    '*.mjs',
  ],
};

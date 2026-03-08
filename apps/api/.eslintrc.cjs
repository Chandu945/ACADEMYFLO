module.exports = {
  extends: [require.resolve('@playconnect/eslint-config')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // NestJS uses empty interfaces and parameter decorators extensively
    '@typescript-eslint/no-empty-interface': 'off',
  },
};

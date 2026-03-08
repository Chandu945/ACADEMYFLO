module.exports = {
  extends: [require.resolve('@playconnect/eslint-config'), 'next/core-web-vitals'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: { version: 'detect' },
  },
  env: {
    browser: true,
    jest: true,
  },
};

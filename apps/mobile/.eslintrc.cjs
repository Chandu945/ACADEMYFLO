module.exports = {
  extends: [require.resolve('@playconnect/eslint-config')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    jest: true,
  },
  settings: {
    react: {
      version: '18',
    },
  },
};

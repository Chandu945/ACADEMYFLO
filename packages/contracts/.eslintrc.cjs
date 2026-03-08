module.exports = {
  extends: [require.resolve('@playconnect/eslint-config')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};

module.exports = {
  // Block committing secret files
  '.env*(!(.example))': () => {
    throw new Error('Attempted to commit an .env file. Only .env.example files are allowed.');
  },
  '*.{pem,key,p12,pfx}': () => {
    throw new Error('Attempted to commit a secret/key file. This is forbidden.');
  },

  // Lint and format TypeScript files
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],

  // Format other files
  '*.{js,cjs,mjs,json,md,yaml,yml}': ['prettier --write'],
};

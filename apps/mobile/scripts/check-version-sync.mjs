#!/usr/bin/env node
// Fails the build if apps/mobile/package.json `version` doesn't match the
// Android `versionName` in apps/mobile/android/app/build.gradle. Prevents
// silent drift between the JS-bundle version (sent to the force-update
// endpoint) and the native version (what Play Store shows).
//
// Wire into Android release builds via build.gradle:
//   tasks.named('preBuild') { dependsOn 'checkVersionSync' }
// Or run manually: `node scripts/check-version-sync.mjs`

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const buildGradle = fs.readFileSync(
  path.join(root, 'android', 'app', 'build.gradle'),
  'utf8',
);

const m = buildGradle.match(/versionName\s+"([^"]+)"/);
if (!m) {
  console.error('Could not find versionName in build.gradle');
  process.exit(1);
}
const nativeVersion = m[1];

if (pkg.version !== nativeVersion) {
  console.error(
    `Version mismatch:\n  package.json:  ${pkg.version}\n  build.gradle:  ${nativeVersion}\n` +
      'Update both to the same value before building a release.',
  );
  process.exit(1);
}

console.log(`Version sync OK: ${pkg.version}`);

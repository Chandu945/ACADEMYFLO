#!/usr/bin/env node

/**
 * Build and push Docker images for Release Candidate.
 *
 * Usage:
 *   node scripts/rc/build-and-push-images.mjs
 *
 * Environment:
 *   DOCKER_REGISTRY - registry URL (default: ghcr.io/playconnect)
 *   IMAGE_TAG       - tag to apply (default: rc-<shortsha>)
 *   GITHUB_SHA      - full commit SHA (used for default tag)
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REGISTRY = process.env.DOCKER_REGISTRY || 'ghcr.io/playconnect';
const SHA = process.env.GITHUB_SHA || execSync('git rev-parse HEAD').toString().trim();
const TAG = process.env.IMAGE_TAG || `rc-${SHA.slice(0, 7)}`;

const IMAGES = [
  { name: 'api', dockerfile: 'apps/api/Dockerfile' },
  { name: 'admin-web', dockerfile: 'apps/admin-web/Dockerfile' },
];

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const digests = { tag: TAG, sha: SHA, builtAt: new Date().toISOString(), images: {} };

for (const img of IMAGES) {
  const fullTag = `${REGISTRY}/${img.name}:${TAG}`;
  const latestTag = `${REGISTRY}/${img.name}:staging-latest`;

  console.log(`\nBuilding ${img.name}...`);
  run(`docker build -t ${fullTag} -t ${latestTag} -f ${img.dockerfile} .`);

  console.log(`Pushing ${img.name}...`);
  run(`docker push ${fullTag}`);
  run(`docker push ${latestTag}`);

  // Capture digest
  const digest = execSync(`docker inspect --format='{{index .RepoDigests 0}}' ${fullTag}`)
    .toString()
    .trim();

  digests.images[img.name] = { image: fullTag, digest };
  console.log(`  digest: ${digest}`);
}

// Write digests artifact
mkdirSync('artifacts', { recursive: true });
const digestsPath = join('artifacts', 'docker-digests.json');
writeFileSync(digestsPath, JSON.stringify(digests, null, 2));
console.log(`\nDigests written to ${digestsPath}`);

#!/usr/bin/env node

/**
 * Deploy Release Candidate to staging via SSH.
 *
 * Usage:
 *   node scripts/rc/deploy-staging.mjs
 *
 * Environment:
 *   STAGING_HOST       - staging server hostname/IP
 *   STAGING_USER       - SSH username
 *   STAGING_SSH_KEY    - path to SSH private key (or set in ssh-agent)
 *   STAGING_DEPLOY_DIR - deploy directory on server (default: /opt/playconnect)
 *   IMAGE_TAG          - docker image tag to deploy
 *   DOCKER_REGISTRY    - registry URL
 */

import { execSync } from 'node:child_process';

const HOST = process.env.STAGING_HOST;
const USER = process.env.STAGING_USER;
const KEY = process.env.STAGING_SSH_KEY;
const DEPLOY_DIR = process.env.STAGING_DEPLOY_DIR || '/opt/playconnect';
const TAG = process.env.IMAGE_TAG;
const REGISTRY = process.env.DOCKER_REGISTRY || 'ghcr.io/playconnect';

if (!HOST || !USER || !TAG) {
  console.error('Missing required environment variables: STAGING_HOST, STAGING_USER, IMAGE_TAG');
  process.exit(1);
}

const sshOpts = KEY ? `-i ${KEY} -o StrictHostKeyChecking=no` : '-o StrictHostKeyChecking=no';

const remoteCommands = [
  `cd ${DEPLOY_DIR}`,
  `export IMAGE_TAG=${TAG}`,
  `export DOCKER_REGISTRY=${REGISTRY}`,
  'docker compose -f deploy/docker-compose.staging.yml pull',
  'docker compose -f deploy/docker-compose.staging.yml up -d --remove-orphans',
  `echo "Deployed IMAGE_TAG=${TAG}"`,
].join(' && ');

console.log(`Deploying ${TAG} to ${HOST}...`);

try {
  execSync(`ssh ${sshOpts} ${USER}@${HOST} '${remoteCommands}'`, { stdio: 'inherit' });
  console.log('Staging deployment complete.');
} catch (err) {
  console.error('Staging deployment failed.');
  process.exit(1);
}

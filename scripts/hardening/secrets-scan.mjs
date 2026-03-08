#!/usr/bin/env node

/**
 * Secrets Scanner
 *
 * Regex-based scanner for common secret patterns in the codebase:
 * - AWS access keys and secret keys
 * - RSA/EC/DSA private keys
 * - JWT tokens
 * - MongoDB URIs with credentials
 * - GitHub personal access tokens
 * - Slack tokens (bot, user, webhook)
 * - Generic high-entropy API keys
 *
 * Excludes: .env.*.example, node_modules, binaries, .git, artifacts
 * Respects allowlist.json for false-positive management.
 *
 * Output: artifacts/secrets-scan.json
 */

import { readdirSync, readFileSync, statSync, mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACTS_DIR = join(ROOT, 'artifacts');
const ALLOWLIST_PATH = join(ROOT, 'scripts/hardening/allowlist.json');

mkdirSync(ARTIFACTS_DIR, { recursive: true });

// Load allowlist
const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf-8'));
const now = new Date();

const validSecretsAllowlist = allowlist.secrets.entries.filter((entry) => {
  const expiry = new Date(entry.expiry);
  if (expiry < now) {
    process.stdout.write(`WARNING: Expired secrets allowlist entry: ${entry.pattern} (expired ${entry.expiry})\n`);
    return false;
  }
  return true;
});

const allowlistPatterns = validSecretsAllowlist.map((e) => e.pattern);

function isAllowlisted(filePath) {
  const rel = relative(ROOT, filePath);
  return allowlistPatterns.some((pattern) => rel.includes(pattern));
}

// Directories and extensions to skip
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'artifacts',
  '.turbo',
  '.husky',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.bz2', '.7z',
  '.pdf', '.doc', '.docx',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.avi', '.mov',
  '.lock',
]);

// Secret patterns
const SECRET_PATTERNS = [
  {
    name: 'AWS Access Key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    name: 'AWS Secret Key',
    regex: /(?:aws_secret_access_key|secret_key)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
  },
  {
    name: 'RSA Private Key',
    regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
  },
  {
    name: 'JWT Token',
    regex: /\beyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: 'MongoDB URI with Credentials',
    regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^/\s]+/gi,
  },
  {
    name: 'GitHub Personal Access Token',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g,
  },
  {
    name: 'Slack Bot Token',
    regex: /\bxoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24,}\b/g,
  },
  {
    name: 'Slack User Token',
    regex: /\bxoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}\b/g,
  },
  {
    name: 'Slack Webhook URL',
    regex: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
  },
  {
    name: 'Generic API Key Assignment',
    regex: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"]([A-Za-z0-9_\-]{32,})['"](?!\s*(?:process\.env|import\.meta))/gi,
  },
];

// Walk directory tree
function walk(dir) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;

      // Skip large files (> 1MB)
      try {
        const stat = statSync(fullPath);
        if (stat.size > 1024 * 1024) continue;
      } catch {
        continue;
      }

      files.push(fullPath);
    }
  }

  return files;
}

// Scan files
const files = walk(ROOT);
const findings = [];

for (const filePath of files) {
  if (isAllowlisted(filePath)) continue;

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    continue;
  }

  for (const pattern of SECRET_PATTERNS) {
    // Reset regex lastIndex
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      findings.push({
        file: relative(ROOT, filePath),
        line: lineNum,
        pattern: pattern.name,
        snippet: match[0].substring(0, 20) + '***REDACTED***',
      });
    }
  }
}

const passed = findings.length === 0;

const report = {
  timestamp: new Date().toISOString(),
  tool: 'secrets-scan',
  passed,
  summary: {
    filesScanned: files.length,
    findingsCount: findings.length,
    patternsChecked: SECRET_PATTERNS.length,
  },
  findings,
};

const outputPath = join(ARTIFACTS_DIR, 'secrets-scan.json');
writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

process.stdout.write(`\nSecrets Scan Report\n`);
process.stdout.write(`===================\n`);
process.stdout.write(`Files scanned:  ${files.length}\n`);
process.stdout.write(`Patterns:       ${SECRET_PATTERNS.length}\n`);
process.stdout.write(`Findings:       ${findings.length}\n`);
process.stdout.write(`\nResult: ${passed ? 'PASSED' : 'FAILED'}\n`);
process.stdout.write(`Report: ${outputPath}\n`);

if (!passed) {
  process.stdout.write(`\nFindings:\n`);
  for (const f of findings) {
    process.stdout.write(`  ${f.file}:${f.line} — ${f.pattern} (${f.snippet})\n`);
  }
  process.exit(1);
}

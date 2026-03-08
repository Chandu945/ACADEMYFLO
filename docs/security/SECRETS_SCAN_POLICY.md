# Secrets Scan Policy

## Overview

A JS-based regex scanner checks the entire codebase for accidentally committed secrets on every CI run. No external binaries (e.g., gitleaks) are required.

## Detected Patterns

| Pattern | Example |
|---------|---------|
| AWS Access Key | `AKIA...` (20 chars) |
| AWS Secret Key | `aws_secret_access_key = ...` (40 chars) |
| RSA/EC/DSA Private Key | `-----BEGIN RSA PRIVATE KEY-----` |
| JWT Token | `eyJhbGciOi...` |
| MongoDB URI with Credentials | `mongodb+srv://user:pass@host` |
| GitHub Personal Access Token | `ghp_...` (36+ chars) |
| Slack Bot Token | `xoxb-...` |
| Slack User Token | `xoxp-...` |
| Slack Webhook URL | `https://hooks.slack.com/services/...` |
| Generic API Key Assignment | `api_key = "..."` (32+ chars) |

## Exclusions

The scanner automatically skips:

- `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`, `artifacts/`
- Binary files (images, fonts, archives, PDFs)
- Files larger than 1 MB

## False-Positive Management

False positives are managed via `scripts/hardening/allowlist.json` under the `secrets.entries` array.

### Entry Format

```json
{
  "pattern": ".env.example",
  "reason": "Example env file contains placeholder values, not real secrets",
  "expiry": "2027-01-01"
}
```

### Rules

1. The `pattern` is matched against the relative file path (substring match).
2. Every entry **must** include a `reason` explaining why it is a false positive.
3. Every entry **must** include an `expiry` date.
4. **Expired entries** re-trigger CI failure — the team must re-evaluate.
5. Allowlist changes require code review.

## Incident Response

If the scanner detects a real secret:

1. **Do NOT push** the branch — the CI will block it, but the secret may already be in git history.
2. **Rotate the secret immediately** — assume it is compromised.
3. **Remove from git history** using `git filter-branch` or BFG Repo-Cleaner.
4. **Update the secret** in all environments (staging, production).
5. **File an incident** per the [Security Runbook](SECURITY_RUNBOOK.md).

## Running Locally

```bash
npm run hardening:secrets
```

Output: `artifacts/secrets-scan.json`

## CI Integration

The hardening job in `.github/workflows/ci.yml` runs the scan automatically. Any finding blocks the merge.

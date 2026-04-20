# Security Policy

## Reporting a Vulnerability

- Email: `security@academyflo.com` (or file a private security advisory on GitHub).
- Do not open public issues for security reports.
- Expect an acknowledgement within 2 business days.

## Hardening Gates

CI runs three hardening scripts (see `scripts/hardening/`):

| Script | Script | Fail condition |
| --- | --- | --- |
| Dependency audit | `npm run hardening:audit` | Any `critical` advisory; any non-allowlisted `high` advisory |
| License report | `npm run hardening:licenses` | Any non-allowlisted disallowed license in runtime deps |
| Secrets scan | `npm run hardening:secrets` | Any match of the secret-pattern set outside allowlisted paths |

All three run on every PR via `npm run hardening:sweep`.

## Allowlist Policy (`scripts/hardening/allowlist.json`)

The allowlist is a release valve — **not a long-term mute button**. Each entry must carry a human-readable reason and an expiry date; expired entries re-trigger CI failure.

### When an allowlist entry is acceptable

- **`audit.entries`**
  - Only `high`-severity advisories. Critical advisories are **never allowlistable** — they block releases until patched or worked around.
  - Allowed only when: (a) no patched version exists, (b) the advisory is not exploitable in our usage pattern (document why), and (c) a dated plan exists to remove the workaround.
  - Expiry: ≤ 30 days. If the upstream fix is slower, re-evaluate and re-extend with updated context.
- **`secrets.entries`**
  - False positives only (example files, fixtures, docs). Real secrets must not be allowlisted — rotate them and remove.
  - Expiry: ≤ 1 year; file-shape allowlists (e.g. `.env.example`) are stable and get the full year.
- **`licenses.entries`**
  - Specific package names that carry a flagged license but are vetted as acceptable (e.g. legal-reviewed multi-license packages).
  - Expiry: aligned with the next legal review cycle.

### Process to add an entry

1. Open a PR that:
   - Adds the entry with `reason`, `expiry`, and a link to the upstream issue / review ticket.
   - Updates this policy or a linked doc if the reason is novel.
2. Reviewer must be a repo code-owner and sign off on the risk.
3. Before expiry, either remove the entry (root-cause fixed) or re-open the PR with updated context and a new expiry.

### Process to remove an entry

- Preferred: fix the root cause (upgrade the package, rotate the secret, drop the license) and delete the entry in the same PR.
- Acceptable: if the finding is confirmed a false positive that cannot be suppressed at the scanner level, convert to a permanent scanner exclusion (not an allowlist entry) and document.

## Accepted Tradeoffs

Design decisions from the security audit that we've consciously accepted rather than changed. Revisit if the threat model shifts.

- **Session cookie `sameSite: lax` (admin-web, user-web)** — keeps link-based flows working (password reset, shared links, external OAuth redirects). CSRF is mitigated separately by the double-submit token (`csrf-token.ts`), so weakening SameSite does not reduce protection on state-changing routes. Upgrade to `strict` the day we remove all inbound navigation paths.
- **Delete-account returns "Password is incorrect"** — trades email-enumeration risk for clearer UX on the most common failure mode. Acceptable because (a) the endpoint is Throttled (3/min, 10/day per IP), (b) owners are the only role that can hit it, and (c) deletion also requires the phrase "DELETE". A generic "Invalid credentials" would save enumeration but leave users confused about which field was wrong.
- **No biometric / re-auth on mobile sensitive screens** — the app is Owner + Staff only, and the device keychain already requires unlock to yield the refresh token. Revisit if a parent role is added or if device-sharing becomes common.
- **React version drift (web apps on 19, mobile on 18.3.1)** — intentional. React Native 0.76.9 ships against React 18; upgrading is a platform-wide migration, not a security item.

## Quick Reference

- Run the full hardening sweep locally: `npm run hardening:sweep`
- Re-run one gate: `npm run hardening:audit`, `npm run hardening:licenses`, `npm run hardening:secrets`
- Edit the allowlist: `scripts/hardening/allowlist.json` (schema: `scripts/hardening/allowlist-schema.json`)

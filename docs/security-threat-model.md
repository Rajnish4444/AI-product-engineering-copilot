# Security threat model

A STRIDE-style walk of the specific threats BuildPilot is exposed to and the controls that address each. The higher-level decisions are in [ADR-0007](adr/0007-safety-guardrails-cost-controls.md); this document is the accountable ledger.

## System boundaries

Trust boundaries in the system:

1. **Public internet ↔ Vercel route handlers** — anything crossing this boundary is user-controlled.
2. **Route handlers ↔ Model providers** — provider APIs are trusted for infrastructure; their outputs are not trusted.
3. **Route handlers ↔ GitHub API** — GitHub is trusted for infra; user-controlled data flowing through it is not.
4. **Vercel ↔ Target repo's GitHub Actions** — cross-tenant boundary. The dispatch payload is the only channel.
5. **Adapter ↔ Model provider (in Actions)** — same trust posture as boundary 2.

## Threat catalog

### Spoofing

| Threat | Vector | Control |
|---|---|---|
| Attacker impersonates a user | Session cookie theft | Signed JWT with 15-minute lifetime, `HttpOnly`, `Secure`, `SameSite=lax`; rotation on privileged actions |
| Attacker impersonates GitHub webhook sender | Forged webhook to `/api/webhook` | Verify `X-Hub-Signature-256` HMAC against the App's webhook secret; reject unsigned or mismatched |
| Attacker triggers a dispatch as another user | Missing auth on `/api/dispatch` | Route handler verifies session JWT and confirms the user has the target repo installed |

### Tampering

| Threat | Vector | Control |
|---|---|---|
| Prompt injection in user input | Malicious PRD input | User content wrapped in delimiters; PM layer has no tools (ADR-0007); adversarial eval rows catch regressions |
| Prompt injection via repo file content | Adapter reads `README.md` containing hostile instructions | Adapter's tool set is restricted to branch scope; sensitive tools (workflow file edit, secret access) are disabled |
| Tampering with dispatch payload in transit | MitM between browser and Vercel | HTTPS-only; strict CSP; no dispatch acceptance outside HTTPS |
| Adapter modifies workflow files or protected branches | Overprivileged agent | Adapter is denied write access to `.github/workflows/**` at the workflow level; branch protection on default branch is a documented prereq |

### Repudiation

| Threat | Vector | Control |
|---|---|---|
| User denies triggering a destructive-ish action | No audit trail | Every dispatch creates a GitHub Issue with the payload snapshot; every action taken by an adapter appears in the target repo's Actions log |
| Model call attribution disputes | Provider log latency | We log every `/api/plan` and `/api/dispatch` call to Vercel logs with session ID + user ID + cost estimate |

### Information disclosure

| Threat | Vector | Control |
|---|---|---|
| Provider API key leak to browser | Accidental client-side use | Provider adapters live in `lib/providers/`; ESLint rule forbids importing them from `app/**` client components |
| Provider key logged | Debug output including headers | Log redaction middleware strips `Authorization`, `x-api-key`, and any header matching `/key|token|secret/i` |
| Repo secrets exposed to adapter | Adapter reads GitHub Actions env | Adapters run with `permissions:` narrowed; secrets not needed by the adapter are not exposed |
| PRD content leaks between users | Session mixing | Sessions are namespaced by JWT `sub`; Gist URLs are unlisted (secret Gists) but user-visible for their own sessions |
| Model returns training data resembling private info | Provider-side data handling | Not fully controllable; disclosed in privacy policy; use providers with zero-retention API modes where available |

### Denial of service

| Threat | Vector | Control |
|---|---|---|
| Unbounded model calls burn free tier | Runaway agent loop, buggy repair loop | Per-session token cap (default 200k); per-user daily cap (default 2M); adapter cost cap enforced by adapter itself |
| Route handler flooded | Public endpoint abuse | Vercel platform rate limiting; per-IP soft cap in middleware; unauthenticated dispatch is rejected |
| GitHub API quota exhausted | Chatty webhook handler or dispatch retry | In-request-scope caching; exponential backoff on 429; single retry only |
| Eval CI cost blowout | Malicious PR adds a huge golden set | Per-run cost cap; PRs that raise cost by > 2x require manual approval |

### Elevation of privilege

| Threat | Vector | Control |
|---|---|---|
| Adapter escalates from write to admin | Uses stolen token for admin API calls | GitHub App installed with minimum scopes (`contents:write`, `pull_requests:write`, `issues:write`, `metadata:read`); no admin scopes granted |
| Adapter reaches outside its target repo | Uses installation token for other repos | Installation token is per-repo by default; adapter code path forbids repo-name overrides in tool inputs |
| User escalates to another user's session | Cookie tampering | JWT is signed with `NEXTAUTH_SECRET`; any tampering invalidates the signature |
| Adapter triggers destructive GitHub Actions in target repo | Modifying workflow files | Workflow files are excluded from adapter-writable paths |

## Secret handling policy

- **Never commit secrets.** `.gitignore` excludes `.env*` and `*.pem`. Pre-commit hook (optional but recommended) runs `gitleaks`.
- **Where secrets live**:
  - Provider API keys → Vercel env vars, marked as "sensitive."
  - GitHub App private key → Vercel env var, `\n`-encoded PEM.
  - Webhook secret → Vercel env var.
  - Adapter secrets (per target repo) → repo-level GitHub secrets.
- **Rotation**: documented in [`runbook.md`](runbook.md). Any key we suspect is exposed is rotated within one hour.
- **Access**: Vercel env vars are readable only by the deployment; team members have no default access. GitHub App private key has a single copy in Vercel; local dev uses a separate throwaway App.

## Prompt-injection defense-in-depth

Because prompt injection is the top novel threat class in AI systems, we layer defenses:

1. **Delimiter discipline**: user content is always wrapped in `<user_input>...</user_input>` with a system-prompt clause stating the enclosed text is data, not instructions.
2. **Tool-scope minimization**: the PM layer has zero tools. The eng adapter has a fixed, small tool set (read/write file, run test command, open PR). No `curl`, no `eval`, no arbitrary shell.
3. **Output validation**: every consumed output is Zod-validated. Injection attempts that would break the schema are rejected before they can act.
4. **Adversarial evals**: every user-facing prompt has adversarial rows in its golden set. Regressions caught pre-merge.
5. **Human-in-the-loop for dispatch**: no PM output becomes a PR without an explicit user click. Even a fully successful injection cannot skip the user's confirmation.

## What is out of scope

- **Multi-tenant abuse (BuildPilot-hosted-as-SaaS scenarios).** BuildPilot v1 is single-tenant per Vercel deployment. Multi-tenant hardening is a v2 concern.
- **Formal supply-chain attestation** (SLSA, Sigstore). We rely on the default GitHub/npm chain of custody.
- **Model-side data poisoning.** Not addressable at our layer; mitigated by evals catching quality regressions.
- **Regulatory compliance** (SOC 2, HIPAA, GDPR data-processing agreements). None of these apply to a portfolio deployment.

## Review cadence

- **Every PR** touching auth, `lib/providers/`, or `.github/workflows/**` gets a mini threat-model check as part of review. Use the `review-prompt-safety` Claude Code skill.
- **Quarterly**: full walk of this document. Update the catalog with any new threats observed.
- **On incident**: add a threat row and a control row for whatever was learned.

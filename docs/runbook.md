# Runbook

Operational playbook for BuildPilot. Covers first-time setup, day-to-day operations, and incident response.

## Local development setup

Prerequisites:

- Node 20+ (check `node -v`).
- pnpm 9+ (`npm install -g pnpm`).
- A GitHub account.
- An API key for at least one provider: Anthropic, Google (Gemini), or GitHub Models.

Steps:

```bash
pnpm install
cp .env.example .env.local
# fill in the required env vars — see the table below
pnpm dev
```

Open `http://localhost:3000`. Sign in with GitHub. You should see the chat pane.

### Required environment variables

| Var | Purpose | Where to get it |
|---|---|---|
| `NEXTAUTH_SECRET` | Signs the session JWT | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL for OAuth callbacks | `http://localhost:3000` for dev |
| `GITHUB_OAUTH_CLIENT_ID` | User login | Create OAuth App at github.com/settings/developers |
| `GITHUB_OAUTH_CLIENT_SECRET` | User login | Same OAuth App |
| `GITHUB_APP_ID` | Repo access | Create GitHub App (see below) |
| `GITHUB_APP_PRIVATE_KEY` | Signs App JWTs | Downloaded from the GitHub App page, `\n`-encoded |
| `GITHUB_APP_WEBHOOK_SECRET` | Verifies webhook payloads | Set when creating the App |
| `BUILDPILOT_PROVIDER` | Which model provider to use | `anthropic` / `google` / `github-models` |
| `ANTHROPIC_API_KEY` | If provider is anthropic | console.anthropic.com |
| `GOOGLE_GENERATIVE_AI_API_KEY` | If provider is google | aistudio.google.com |
| `GITHUB_TOKEN` | If provider is github-models | GitHub Personal Access Token with `models:read` scope |

## Creating the GitHub App (one-time)

1. github.com → Settings → Developer settings → GitHub Apps → New GitHub App.
2. Name: `BuildPilot Dev` (production is a separate App).
3. Homepage URL: `http://localhost:3000` for dev, your Vercel domain for prod.
4. Webhook URL: `<base>/api/webhook`. Set a webhook secret.
5. Permissions:
   - Repository: **Contents** (Read & write), **Pull requests** (Read & write), **Issues** (Read & write), **Metadata** (Read).
   - Do NOT grant Administration or Workflows permissions. Dispatching an existing workflow requires only **Actions: Write** (add this if the base App does not include it).
6. Subscribe to events: `Pull request`, `Issues`, `Workflow run`.
7. After creation, generate a private key. Store as `GITHUB_APP_PRIVATE_KEY` (base64 or `\n`-encoded PEM).
8. Install the App on a test target repo.

## Installing BuildPilot into a target repo

Two things happen when a user installs the App on a repo:

1. **GitHub App installation** — grants BuildPilot access via the installation token.
2. **Workflow file installation** — the target repo needs `.github/workflows/buildpilot-eng.yml` and the adapter directories.

For v1, workflow installation is a manual copy from this repo's `template/target-repo/` directory. v1.1 will add a "Install workflows into this repo" UI that opens a PR against the target repo.

## Production deploy (Vercel)

```bash
vercel link           # first time only
vercel env pull       # get any existing env vars locally
# add production env vars via the dashboard, then:
git push origin main  # triggers deploy
```

Post-deploy checklist:

- [ ] `/api/webhook` returns 200 to a signed test payload (`gh webhook forward` or the App's "Redeliver" button).
- [ ] `/api/auth/signin` completes successfully.
- [ ] A test dispatch produces a PR in the target repo.
- [ ] Sentry (or Vercel logs) show no errors on the first minute of live traffic.

## Where to look when something is broken

BuildPilot spans three surfaces. Debugging usually means checking all three:

| Symptom | First place to look | Second place |
|---|---|---|
| UI loads but chat does nothing | Browser DevTools console + network tab | Vercel logs for `/api/plan` |
| Chat errors "provider unavailable" | Vercel logs for provider response codes | Provider status page |
| Dispatch button clicks but no workflow starts | Vercel logs for `/api/dispatch` | Target repo → Actions tab → check for a failed dispatch |
| Workflow starts but PR never opens | Target repo → Actions → adapter step output | Adapter's runtime logs (Claude Code Action logs, etc.) |
| Webhook events not updating UI | Vercel logs for `/api/webhook` | GitHub App page → Advanced → Recent Deliveries |
| Cost cap hit unexpectedly | Session artifact viewer → cost breakdown | Provider dashboard |

## Common tasks

### Rotate a provider API key

```bash
# 1. Create the new key in the provider console.
# 2. Update Vercel env var (production + preview).
vercel env add ANTHROPIC_API_KEY production
# 3. Redeploy.
vercel --prod
# 4. Revoke the old key in the provider console.
# 5. Watch logs for 401s from stale deployments (should be zero after 60s).
```

### Rotate the GitHub App private key

1. GitHub App page → Private keys → Generate new private key. Downloads a `.pem`.
2. Convert: `awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' key.pem` — copy the output.
3. Update `GITHUB_APP_PRIVATE_KEY` in Vercel. Redeploy.
4. Delete the old private key from the GitHub App page.

### Bump the model version for a prompt

Don't. Instead, create `<name>.v(N+1).md` with the new model, update callers, add golden-set rows, run `pnpm eval`, ship.

### Add a new provider

Use the `add-provider` Claude Code skill (see [`.claude/skills/add-provider/SKILL.md`](../.claude/skills/add-provider/SKILL.md)), or:

```bash
# 1. Create lib/providers/<name>.ts implementing ModelProvider.
# 2. Register in lib/providers/registry.ts.
# 3. Add pricing to lib/providers/pricing.ts.
# 4. Add a smoke test.
# 5. Run: pnpm eval:cheap -- --provider <name>
# 6. Update the provider table in docs/architecture.md.
```

### Inspect BuildPilot's GitHub state for a session

Sessions live as GitHub Issues in the target repo, tagged `buildpilot`:

```bash
gh issue list --repo <owner>/<repo> --label buildpilot
gh issue view <n> --repo <owner>/<repo>
```

Session artifacts (PRDs) live as Gists on the user's GitHub account.

## Incident response

### Runaway cost

- **Symptom**: provider dashboard shows a spike; per-session cap not tripping.
- **Immediate**: rotate the provider key (previous section). This stops all further calls.
- **Diagnose**: check Vercel logs for a session with anomalous call count. Likely culprits: repair-loop misfire, adapter tool loop.
- **Fix**: patch the loop, add a max-attempts guard, redeploy, rotate a new key back in.

### Compromised API key

- **Symptom**: unexpected calls in provider dashboard from unknown source IPs or with unfamiliar prompts.
- **Immediate**: revoke the key (provider dashboard). Rotate on Vercel.
- **Diagnose**: `git log --all -p | grep <first 4 chars of key>` — did we accidentally commit it? Check GitHub commit history for the key value.
- **Post-mortem**: add a `gitleaks` pre-commit hook if it wasn't already active.

### GitHub App suspended or misconfigured

- **Symptom**: `/api/webhook` returns 401 or webhook deliveries fail on the GitHub App page.
- **Immediate**: check the App's private key hasn't rotated or the webhook secret hasn't drifted between Vercel and GitHub.
- **Fix**: re-sync secrets; re-install the App on target repos if permissions changed.

### Prompt regression after model version bump

- **Symptom**: eval pass rate drops on the scheduled cross-provider run.
- **Immediate**: revert to the previous prompt version (`git revert` the version bump PR).
- **Diagnose**: run `pnpm eval -- --prompt <name>` locally against the new model version to identify failing rows.
- **Fix**: patch the prompt (as a new version), add golden-set rows for the new failures, ship.

# BuildPilot architecture

This document is the reference map of the system. Decisions are recorded as ADRs in [`adr/`](adr/); this document synthesizes them into a picture of how the pieces fit.

## System overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│  ─────────────────────────────────────────────────────────────────── │
│  Next.js SPA (React Server Components + streaming)                   │
│    • Chat pane (PM copilot)                                          │
│    • Artifact pane (PRD, task list, dispatch status)                 │
│    • Session view (recent PRDs, tasks, PRs)                          │
└──────────────────────────────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Vercel Hobby                                                        │
│  ─────────────────────────────────────────────────────────────────── │
│  Route handlers (Node runtime, 60s soft limit)                       │
│    /api/plan       — PM copilot: idea → PRD → tasks (streaming)      │
│    /api/dispatch   — Eng handoff: task → workflow_dispatch           │
│    /api/webhook    — GitHub App events: PR opened/merged, etc.       │
│    /api/auth/*     — NextAuth (GitHub OAuth)                         │
│                                                                      │
│  lib/providers/    — Model provider abstraction (ADR-0002)           │
│  lib/schemas/      — Zod schemas (PRD, Task, DispatchPayload)        │
│  lib/prompts/      — Versioned prompt files                          │
│  lib/github/       — Octokit helpers, App auth                       │
└──────────────────────────────────────────────────────────────────────┘
                 │                              │
                 │ Model API                    │ GitHub API
                 ▼                              ▼
┌────────────────────────────┐    ┌────────────────────────────────────┐
│  Model providers            │    │  GitHub                            │
│    Anthropic                │    │  ─────────────────────────────────  │
│    Google (Gemini)          │    │  GitHub App (auth, webhooks)       │
│    GitHub Models            │    │  Issues        — task store        │
│    (extensible)             │    │  PR bodies     — plans, progress   │
└────────────────────────────┘    │  Gists         — session artifacts │
                                   │  Repo secrets  — API keys          │
                                   │  Actions       — long-run compute  │
                                   └────────────────────────────────────┘
                                                       │
                                                       │ workflow_dispatch
                                                       ▼
                                   ┌────────────────────────────────────┐
                                   │  Target repo's GitHub Actions      │
                                   │  ─────────────────────────────────  │
                                   │  buildpilot-eng.yml (dispatcher)   │
                                   │    └─▶ RuntimeAdapter (ADR-0006)   │
                                   │          claude-code-adapter       │
                                   │          gemini-cli-adapter        │
                                   │          raw-api-adapter           │
                                   │  → creates bp/<task-id> branch     │
                                   │  → opens PR against default        │
                                   │  → labels tracking issue           │
                                   └────────────────────────────────────┘
```

## Component walkthrough

### Browser SPA

Single Next.js 15 App Router application. Server Components handle the shell and any non-streaming reads; Client Components handle chat and artifact rendering. `streamObject` from the Vercel AI SDK powers PRD and task-list streaming — partial objects render as they build.

State that survives page reload lives in GitHub (see ADR-0003). Nothing important lives in `localStorage` beyond ephemeral UI preferences.

### Route handlers

All API surface. Node runtime (not Edge) — the Anthropic and Google SDKs work more reliably there, and we do not benefit from Edge's cold-start latency at our scale.

- **`/api/plan`** (POST): the PM copilot. Streams the PRD, then the task list. Response is a Server-Sent Events stream of Zod-validated partial objects.
- **`/api/dispatch`** (POST): validates a `DispatchPayload`, creates a tracking issue in the target repo, then calls `POST /repos/{owner}/{repo}/actions/workflows/buildpilot-eng.yml/dispatches` with the payload as inputs. Returns immediately with the tracking issue URL.
- **`/api/webhook`** (POST): receives `pull_request`, `workflow_run`, and `issues` events. Updates PR labels, records outcomes, notifies the UI via SSE if a session is active.
- **`/api/auth/*`**: NextAuth with GitHub provider. Session is a signed JWT cookie — no database.

### Provider layer (`lib/providers/`)

The abstraction seam for model calls (ADR-0002). Every model call in the product enters through here.

```ts
// lib/providers/index.ts
export interface ModelProvider {
  name: "anthropic" | "google" | "github-models" | string;
  chat(opts: ChatOptions): AsyncIterable<ChatChunk>;
  object<T>(opts: ObjectOptions<T>): Promise<T>;
  streamObject<T>(opts: ObjectOptions<T>): AsyncIterable<Partial<T>>;
  estimateCost(input: string, model: string): number;
}
```

- `lib/providers/anthropic.ts`, `google.ts`, `github-models.ts` — thin adapters over `@ai-sdk/*`.
- `lib/providers/registry.ts` — reads `BUILDPILOT_PROVIDER` env var, returns the concrete provider.
- `lib/providers/pricing.ts` — model → $/1M tokens table used for cost estimates and eval budgets.

### Schemas (`lib/schemas/`)

Zod schemas that are the contract for every LLM output and inter-service handoff.

- `prd.v1.ts` — problem, goals, non-goals, user stories, acceptance criteria.
- `task-list.v1.ts` — array of Task, each with title, description, acceptance criteria, effort, dependencies.
- `dispatch.v1.ts` — the ADR-0004 handoff contract.

Schemas are versioned in the filename. Callers pin to a specific version.

### Prompts (`lib/prompts/`)

Markdown files with frontmatter. Never edited in place — new version = new file.

```yaml
---
name: prd-generator
version: 1
model_preference:
  - anthropic:claude-sonnet-4-6
  - google:gemini-2.5-pro
output_schema: prd.v1
max_output_tokens: 4000
---
System prompt goes here in Markdown.
```

### GitHub client (`lib/github/`)

- `app-auth.ts` — GitHub App JWT → installation access token.
- `octokit.ts` — pre-configured Octokit instance per installation.
- `session-store.ts` — read/write Gists, Issues, PR bodies with the state-mapping table from ADR-0003.

### Target-repo Action (`.github/workflows/buildpilot-eng.yml` in this repo, plus a template for target repos)

Trigger: `workflow_dispatch` with `dispatch_payload_json` input.

Steps:

1. Parse payload, extract `runtime`.
2. Checkout target repo at `repo.ref`.
3. Delegate to `.github/actions/<runtime>-adapter/action.yml`.
4. Adapter creates branch, edits files, runs tests, opens PR.
5. Post-run: label the tracking issue based on outcome, emit cost.

## Data flow: idea → PR

1. User types "we want to add dark mode" in the chat pane.
2. Client posts to `/api/plan`.
3. Route handler calls `provider.streamObject(PRD_SCHEMA, prd-generator-v1.md)`.
4. PRD streams back; artifact pane renders it in real time.
5. Route handler continues with `provider.streamObject(TASK_LIST_SCHEMA, task-decomposer-v1.md)` using the finished PRD.
6. Task list streams back.
7. User reviews, edits, clicks "dispatch".
8. Client posts task IDs to `/api/dispatch`.
9. Route handler creates a tracking issue in the target repo, then dispatches the workflow.
10. GitHub Action runs the adapter → creates branch → edits → opens PR.
11. GitHub webhook fires on PR open → `/api/webhook` updates the artifact pane.

## Failure modes and how they're handled

| Failure | Detection | Response |
|---|---|---|
| Provider 429 (rate limit) | Response code | Fall back to configured cheap provider; if that fails, surface error and pause session |
| Provider produces invalid JSON | Zod validation | One repair attempt; then user-facing error |
| GitHub API 5xx | Response code | Exponential backoff up to 3 tries; then user-facing error |
| Workflow dispatch fails | Response code | Surface error; suggest the runbook check for App permissions |
| Adapter runs but tests fail | Adapter exits non-zero | PR opens with `outcome: partial` label; user reviews |
| Cost cap reached mid-session | Token accountant | Halt further calls; user must confirm to continue |
| Prompt injection detected | Adversarial eval (offline); guardrails in prompt (online) | System prompt instructs the model to ignore injected instructions and continue with declared schema |

## Deployment

- Frontend + APIs: Vercel Hobby, connected to `main`. Preview deploys per PR.
- GitHub App: hosted at the same Vercel domain. Webhook URL is `/api/webhook`.
- Target-repo workflow: installed by copying `.github/workflows/buildpilot-eng.yml` and the `.github/actions/*-adapter/` directories into the target repo (or via a "Install BuildPilot into this repo" one-click UI in v1.1).
- Secrets: Vercel env vars for provider keys (server-side); repo secrets in target repos for whatever the chosen adapter needs.

## Non-goals for v1

Called out here so they do not accidentally creep in:

- Multi-tenant billing.
- Non-GitHub source hosts (GitLab, Bitbucket).
- Direct pushes to the default branch.
- Cross-repo refactors.
- Self-hosted model inference.
- Native mobile.

These are on the roadmap ([`roadmap.md`](roadmap.md)) but out of scope for v1 by explicit choice.

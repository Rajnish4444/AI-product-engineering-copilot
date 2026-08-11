# BuildPilot

**An AI Product & Engineering Copilot that bridges the PM ↔ Engineering seam.**

Paste a rough idea. BuildPilot writes the PRD, breaks it into engineering tasks, and dispatches a coding agent that opens a working pull request against your repo — all inside GitHub.

Built for solo developers and small-to-medium teams who spend more time translating between "the idea" and "the PR" than doing either.

---

## Why this exists

Most AI dev tools sit on one side of the fence. Cursor, Claude Code, Copilot, and friends make engineers faster. Product-side AI tools (ChatPRD, Notion AI) make PMs faster. Almost nothing helps the **handoff** — the moment where a Slack thread becomes a Linear ticket becomes a branch becomes a PR.

BuildPilot targets that seam:

1. **PM Copilot** — a bespoke, structured-output pipeline that turns a rough idea into a versioned PRD and a task breakdown.
2. **Engineering Copilot** — a pluggable coding-agent runtime that picks up each task and opens a PR in your repo.
3. **GitHub is the database** — issues hold tasks, PR bodies hold plans, no infrastructure to run.

## What it does today (v1)

- **Idea → PRD**: streaming, structured, editable, versioned.
- **PRD → Tasks**: JSON-schema-validated task list with acceptance criteria.
- **Tasks → PR**: dispatches a GitHub Actions workflow that runs the configured coding agent against the target repo.
- **Multi-provider**: Anthropic, Google, and GitHub Models are supported out of the box. Add a new provider by dropping a file into [`lib/providers/`](lib/providers/).

## Architecture at a glance

```
Next.js SPA  ──▶  Vercel Route Handlers  ──▶  Provider Layer  ──▶  Anthropic | Google | GitHub Models
                          │
                          └──▶  GitHub App  ──▶  workflow_dispatch  ──▶  Coding-agent runtime (per repo)
                                     │
                                     └──▶  Issues / PR bodies / Gists (persistence)
```

Full detail in [`docs/architecture.md`](docs/architecture.md). The decisions behind each piece live in [`docs/adr/`](docs/adr/).

## Design principles

1. **No infra we operate.** GitHub owns state; Vercel owns short-lived compute; GitHub Actions owns long-lived compute. No database, no queue, no worker.
2. **Model-agnostic by construction.** Every model call goes through a provider interface. Config change, not refactor, to swap.
3. **Structured outputs by default.** Zod schemas + `generateObject` — the LLM produces validated JSON, not free text we have to parse.
4. **Evaluable, not just testable.** Every prompt has a golden set and an LLM-as-judge harness. Regressions are catchable.
5. **Safe by default.** Prompt-injection surface is minimized; destructive tools are human-in-the-loop; costs are capped per session.

## Quickstart

Prerequisites: Node 20+, pnpm 9+, a GitHub account, and an API key for at least one supported provider.

```bash
pnpm install
cp .env.example .env.local
# Fill in GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, NEXTAUTH_SECRET, and one provider key
pnpm dev
```

Full setup — including creating the GitHub App and wiring the target-repo workflow — is in [`docs/runbook.md`](docs/runbook.md).

## Repository layout

| Path | Purpose |
|---|---|
| [`app/`](app/) | Next.js UI + API route handlers |
| [`lib/providers/`](lib/providers/) | Model provider abstraction (Anthropic, Google, GitHub Models) |
| [`lib/schemas/`](lib/schemas/) | Zod schemas for PRD, Task, dispatch payload |
| [`lib/prompts/`](lib/prompts/) | Versioned prompt files with frontmatter |
| [`lib/evals/`](lib/evals/) | Golden sets + LLM-as-judge |
| [`.github/workflows/`](.github/workflows/) | Coding-agent dispatch target + CI + evals |
| [`docs/`](docs/) | Architecture, evals, security, runbook, roadmap |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records |
| [`.claude/skills/`](.claude/skills/) | Repo-scoped Claude Code skills for common dev tasks |

## Status

MVP in active development. See [`docs/roadmap.md`](docs/roadmap.md) for what's next.

## License

MIT. See [`LICENSE`](LICENSE).

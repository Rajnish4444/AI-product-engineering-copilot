# `lib/github/`

Octokit helpers, GitHub App authentication, and the state-persistence layer that maps BuildPilot state to GitHub primitives. See [ADR-0003](../../docs/adr/0003-github-as-persistence-layer.md).

## Planned modules (Phase 6)

- `app-auth.ts` — GitHub App JWT → installation access token.
- `octokit.ts` — pre-configured Octokit instance per installation, in-request cache.
- `sessions.ts` — Gist read/write for PRD artifacts.
- `tasks.ts` — Issue create/label operations for the task-state machine.
- `dispatch.ts` — `workflow_dispatch` client for eng handoff.
- `webhook.ts` — signature verification and event routing.

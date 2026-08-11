# ADR-0003: GitHub as persistence layer

- **Status**: Accepted
- **Date**: 2026-08-12
- **Deciders**: Rajnish Kaushik

## Context

ADR-0001 forbids infrastructure we operate. But BuildPilot has real state:

- User session (who is logged in).
- Session artifacts (the PRD being edited, the task list).
- Task state (open, in-progress, PR opened, merged).
- User preferences (default model, default target repo).

We need a durable, queryable, multi-device store. Options considered: Postgres, Redis, Vercel KV, Turso, Supabase, LocalStorage, and GitHub itself.

## Decision

GitHub is the database.

| State | Where it lives | Read/write pattern |
|---|---|---|
| User session | Signed JWT in an `HttpOnly` cookie | Read every request, write on login |
| Active PRD | GitHub Gist (per session) | Streaming write during generation; user can revisit via Gist URL |
| Task list | GitHub Issues in the target repo, tagged `buildpilot` | One issue per task; label transitions represent state |
| Task state machine | Issue labels (`bp:planned`, `bp:dispatched`, `bp:pr-opened`, `bp:merged`) | Advanced via webhook handler on PR events |
| Session plan / progress | Body of the parent tracking issue | Rewritten on state changes |
| User preferences | `.buildpilot/config.json` in the target repo, or GitHub user metadata | Read on session start |
| Provider API keys | Vercel env vars (server-side keys) or repo secrets (for Actions) | Never touched by frontend |

## Consequences

### Positive

- Zero database operations. No migrations, no backups, no connection pools, no read replicas.
- Data is portable: users see everything in GitHub and take it with them. There is no "migrate off BuildPilot" story because the data was never ours.
- Auditability comes free: every write is a GitHub event with a timestamp and actor.
- Rate limits are visible and shared with the rest of the user's tooling — we don't hide behind our own quota.

### Negative

- No transactions. Two writes are separately observable; we design for eventual consistency.
- Query patterns are limited to what the GitHub API offers. No `WHERE status = 'x' ORDER BY created_at`. We compensate by structuring labels for filterability.
- 5,000 API requests per installation per hour. Enough for demo scale; not enough for hundreds of active teams.
- Some write latencies are 200-500ms — slower than a local DB. UI must reflect this with optimistic updates.
- We inherit GitHub outages one-for-one.

### Neutral

- Reading state during route handlers requires an API call, not a DB query. We add an in-request-scope cache to avoid duplicate calls within a single handler invocation.

## Alternatives considered

- **Vercel KV or Postgres.** Rejected — is infrastructure we operate, even if managed. Also breaks the "your data lives where you already are" property.
- **Supabase / Turso free tier.** Rejected: adds another vendor to the trust boundary and dilutes the "GitHub-native" narrative. Both have free tiers that would work; we do not need them.
- **LocalStorage only.** Rejected: state is lost on device change, and multi-repo sessions become impossible.
- **Session cookies for everything.** Rejected: cookie size limits (~4KB) can't hold a PRD or task list.

## Related

- ADR-0001 (Architecture C — the no-infra constraint that motivates this)
- ADR-0007 (Safety guardrails — including rate-limit protection)
- [`docs/runbook.md`](../runbook.md) (how to inspect state via `gh` CLI)

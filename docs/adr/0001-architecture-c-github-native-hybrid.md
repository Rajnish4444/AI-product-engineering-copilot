# ADR-0001: Architecture C — thin serverless with GitHub as backend

- **Status**: Accepted
- **Date**: 2026-08-12
- **Deciders**: Rajnish Kaushik

## Context

BuildPilot is an AI Product & Engineering Copilot. Its workload is bimodal: short interactive PM-side calls (idea → PRD → tasks) and long-running eng-side calls (task → PR). We have two hard constraints:

1. **No infrastructure we operate.** No database we own, no queue we run, no worker we babysit. This is both a cost constraint (free tiers only) and a narrative choice for a portfolio project.
2. **First-class product UI.** The demo is a conversation-plus-artifact experience, not a series of GitHub issue comments.

Three candidate architectures were evaluated:

- **A. Pure GitHub App**, no bespoke frontend. All interaction happens inside GitHub UI.
- **B. Static SPA**, all state in the browser, direct calls to model providers from the client.
- **C. Thin serverless frontend + GitHub as backend**, with long-running work on GitHub Actions.

## Decision

Adopt Architecture C:

- **Frontend and short-lived compute**: Next.js 15 (App Router) on Vercel Hobby. Route handlers run in the Node runtime (60s soft limit) and only handle interactive PM-side calls.
- **Persistence**: GitHub Issues (tasks), PR bodies (plans and progress), Gists (session artifacts), signed JWT cookies (session). See ADR-0003.
- **Long-running compute**: GitHub Actions in the target repo, dispatched via `workflow_dispatch`. This is where the coding agent runs.
- **Auth**: GitHub App for repo access; NextAuth with GitHub provider for user login.

## Consequences

### Positive

- Zero operational surface: nothing to page us at 3am.
- Sandboxing for eng-side work is free (GitHub-hosted runners).
- Storage is auditable, migratable, and user-owned (GitHub gives them everything if they leave).
- Long-running work is not bounded by Vercel's 60s route limit — it lives on Actions.
- Cost is bounded by the intersection of Vercel Hobby, GitHub free tier, and configured provider caps.

### Negative

- We are coupled to GitHub as a vendor for auth, storage, and long-running compute. Migrating off is a rewrite, not a swap.
- Vercel is arguably infra we operate. We accept this because it is fully managed and free at our scale.
- GitHub API rate limits (5000/hr per installation) become a real constraint at scale.
- No cross-region redundancy; GitHub outages become our outages.

### Neutral

- Debugging spans three surfaces (Vercel logs, Actions logs, GitHub API responses). Runbook must cover all three.

## Alternatives considered

- **Architecture A (pure GitHub App).** Rejected because a bespoke chat UI is a stronger demo surface than issue comments, and PM-side conversations get awkward in threaded issue UIs.
- **Architecture B (browser-only SPA).** Rejected because either (a) users must bring their own API key, which is friction for a demo, or (b) keys live in `localStorage`, which is a security anti-pattern. No server-side cost controls either.
- **Traditional full-stack SaaS** (Postgres + Redis + worker + queue). Rejected: violates the no-infra constraint and adds two weeks of ops work with no demo benefit.

## Related

- ADR-0003 (GitHub as persistence layer)
- ADR-0004 (PM/Eng copilot split)
- [`docs/architecture.md`](../architecture.md)

# `app/api/`

Next.js route handlers. All server-side surface lives here. All handlers run under the Node runtime (not Edge) — provider SDKs and Octokit are more reliable there.

## Planned routes

| Route | Phase | Purpose |
|---|---|---|
| `auth/[...nextauth]/route.ts` | 6 | NextAuth GitHub provider callbacks |
| `plan/route.ts` | 5 | PM copilot — idea → PRD → tasks (streaming) |
| `dispatch/route.ts` | 6 | PM → Eng handoff — trigger `workflow_dispatch` |
| `webhook/route.ts` | 6 | GitHub App webhook receiver |

## Conventions

- Every handler validates its input with a Zod schema before doing work.
- Every handler checks the session JWT before performing anything privileged.
- No handler holds long-lived state; state goes to GitHub (see [ADR-0003](../../docs/adr/0003-github-as-persistence-layer.md)).
- Handler failures return typed error responses, never leak stack traces to clients.

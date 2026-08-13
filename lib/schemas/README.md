# `lib/schemas/`

Zod schemas that are the source of truth for LLM structured outputs and inter-service handoffs. See [ADR-0005](../../docs/adr/0005-structured-outputs-with-zod.md).

## Convention

- Filenames are versioned: `prd.v1.ts`, `prd.v2.ts`, etc.
- Never edit a shipped schema in place — bump the version.
- TypeScript types come from `z.infer<typeof Schema>`; never hand-write a duplicate.

## Planned schemas (Phase 4)

- `prd.v1.ts` — problem, goals, non-goals, user stories, acceptance criteria.
- `task-list.v1.ts` — ordered tasks with dependencies and effort estimates.
- `dispatch.v1.ts` — the PM → Eng handoff contract from [ADR-0004](../../docs/adr/0004-pm-eng-copilot-split.md).

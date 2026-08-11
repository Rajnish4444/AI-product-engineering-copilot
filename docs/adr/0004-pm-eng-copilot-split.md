# ADR-0004: Split the PM and engineering copilots

- **Status**: Accepted
- **Date**: 2026-08-12
- **Deciders**: Rajnish Kaushik

## Context

BuildPilot spans two workloads that look superficially similar (both are "chat with an AI to get output") but have opposite technical characteristics:

|  | PM copilot | Engineering copilot |
|---|---|---|
| **Interaction style** | Interactive, iterative, streaming | Fire-and-monitor, mostly asynchronous |
| **Duration** | Seconds | Minutes to tens of minutes |
| **Output type** | Structured JSON (PRD, task list) | File edits, tests run, PR opened |
| **Failure mode** | Recoverable — user retries | Costly — partial work, dirty branch |
| **Sandbox needs** | None (no code execution) | Full (must run tests, edit files) |
| **Best-in-class tools** | Direct provider API + structured outputs | Claude Code Action, Gemini CLI, Aider, etc. |
| **State ownership** | Ephemeral session state | Repository state (branch, PR) |

Bundling these into a single agent makes both worse: the PM side becomes over-engineered, the eng side becomes constrained.

## Decision

Two distinct layers with a stable handoff contract between them.

**PM copilot** (bespoke):
- Runs in Next.js route handlers (short-lived, streaming).
- Direct calls to the provider layer (ADR-0002).
- Structured outputs via Zod (ADR-0005).
- Outputs: `PRD` and `TaskList`, persisted to Gist and Issues.

**Engineering copilot** (leveraged):
- Runs in a GitHub Actions workflow in the target repo.
- Dispatched via `workflow_dispatch` with a `DispatchPayload`.
- Underlying runtime is pluggable (ADR-0006): Claude Code Action, Gemini CLI, or a raw-API adapter.
- Outputs: a branch, a PR, and issue label transitions.

**Handoff contract** (`lib/schemas/dispatch.ts`):

```ts
{
  task_id: string;                 // GitHub issue number
  repo: { owner, name, ref };      // where to branch from
  brief: {
    goal: string;                  // one-sentence outcome
    acceptance_criteria: string[]; // measurable
    constraints: string[];         // "no new deps", "keep bundle < 200kb", …
    context_files: string[];       // paths the agent should read first
  };
  runtime: "claude-code" | "gemini-cli" | "raw-api";
  cost_cap_usd: number;
}
```

The eng runtime is a pure function of this payload plus the repo state — no hidden coupling to the PM layer.

## Consequences

### Positive

- We use the best tool for each side without either compromising.
- Failures are isolated: a botched eng run does not corrupt the PRD; a bad PRD does not launch an eng run (validation gate).
- The handoff is documented as a versioned schema — third parties could implement either side.
- Interview narrative is crisp: "I bridge the PM–Eng seam by treating each side as a first-class subsystem."

### Negative

- Two systems means two sets of failure modes and two sets of observability plumbing.
- The handoff contract is load-bearing; changes require a version bump and a compatibility window.
- Latency of the full loop is dominated by the eng side, but users perceive it as one BuildPilot workflow.

### Neutral

- The PM side is where our product IP lives; the eng side is where we compose others' tools. This distinction should inform how much test coverage each gets (heavier on PM, lighter on eng adapters).

## Alternatives considered

- **Single monolithic agent.** Rejected: bimodal workload characteristics make a single agent bad at both.
- **Everything in a client-side agent.** Rejected: no sandboxing for eng work, no server-side cost controls, and the PM layer needs server-side keys anyway.
- **Skip the PM layer — just let the user write tasks by hand.** Rejected: the PM side is where the product's differentiation lives.

## Related

- ADR-0005 (Structured outputs — how the PM side stays reliable)
- ADR-0006 (Pluggable engineering runtime — how the eng side stays swappable)
- [`docs/architecture.md`](../architecture.md)

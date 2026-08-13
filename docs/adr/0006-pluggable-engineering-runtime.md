# ADR-0006: Pluggable engineering runtime

- **Status**: Accepted
- **Date**: 2026-08-12
- **Deciders**: Rajnish Kaushik

## Context

The engineering-side workload — take a task, edit files, run tests, open a PR — is exactly the problem that Claude Code, Gemini CLI, OpenCode, Aider, and Cursor Agent all solve. Each has strengths, weaknesses, and different pricing/free-tier models. The landscape shifts monthly.

Committing hard to one runtime creates a real customer-facing risk: if a user only has a Gemini free tier, or if Anthropic deprecates the Claude Code Action next quarter, the answer must be "swap the runtime, not rebuild the product." Every serious LLM-backed product I have seen underestimate this has paid for it later with a scrambled migration.

ADR-0002 solved this for the PM side (provider abstraction). This ADR does the analogous thing for the eng side (runtime abstraction).

## Decision

The engineering runtime is a pluggable adapter selected per-dispatch, executed as a composite GitHub Action inside the target repo.

- A **`RuntimeAdapter`** is a composite Action at `.github/actions/<runtime>-adapter/action.yml`. Its interface is fixed:
  - **Inputs**: `dispatch_payload_json` (see ADR-0004), `provider` (which model provider the runtime should use, if applicable), `secrets`.
  - **Behavior**: create a branch named `bp/<task-id>`, apply changes, run the repo's test/lint commands, open a PR against the default branch, and label the tracking issue with the outcome.
  - **Outputs**: `pr_number`, `outcome` (`success` | `partial` | `failed`), `cost_usd`.
- **Selected via** the `runtime` field on the dispatch payload. Users pick per-dispatch; a workspace-level default is stored in `.buildpilot/config.json`.
- **Ship at launch with three adapters**:
  1. `claude-code-adapter` — wraps [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action).
  2. `gemini-cli-adapter` — wraps the Gemini CLI's non-interactive mode.
  3. `raw-api-adapter` — a fallback loop over the provider layer with a minimal tool set (`read_file`, `write_file`, `run_command`, `open_pr`). Used when no vendor runtime is available.

The main workflow (`.github/workflows/buildpilot-eng.yml`) is a thin dispatcher that reads the payload's `runtime` field and calls the corresponding adapter.

## Consequences

### Positive

- Users pick the runtime that matches their key/subscription — no lock-in on our side.
- Runtimes can be **benchmarked** against each other on the same task (same golden set, different adapter). Great input to future default selection.
- New runtimes add in a well-scoped PR (~200 LOC of YAML plus tests). No changes to the PM layer, dispatch payload, or UI.
- The fallback `raw-api-adapter` guarantees that our product works even if every vendor runtime is unavailable — the intersection of provider availability, not the intersection of runtime availability.

### Negative

- We work in the intersection of runtime capabilities in the adapter interface. Vendor-specific features (Claude Code's sub-agents, Gemini's search grounding) either need adapter-specific inputs or are skipped.
- Behavior consistency across runtimes is a testing burden. We mitigate with a shared "runtime conformance" eval suite that runs the same task through each adapter and asserts PR structure.
- Debugging is now three-tiered (product → workflow → adapter → runtime). The runbook must cover this.

### Neutral

- Adapters live in this repo, not the target repos, so users get updates for free by re-installing our GitHub App. This is a deliberate coupling — we do not want thousands of forks of the adapter with drifted behavior.

## Alternatives considered

- **Claude Code Action only.** Rejected. Matches the original tech steer but fails the model-portability requirement. A single change in Anthropic pricing or availability would expose the fragility.
- **Roll our own agent loop from scratch.** Rejected for the MVP: too much code, insufficient time, and it competes with tools maintained by teams of engineers. Kept as the fallback (`raw-api-adapter`) for cases where vendor runtimes are unavailable — where the smaller feature set is acceptable.
- **A hosted runtime we operate.** Rejected: violates ADR-0001.
- **Devin / other paid autonomous engineers.** Rejected for v1: cost precludes free-tier operation. Adapter interface leaves the door open.

## Related

- ADR-0002 (Multi-provider abstraction — the analogous decision for the model side)
- ADR-0004 (PM/Eng split — this ADR defines the eng-side runtime referenced there)
- ADR-0007 (Safety guardrails — enforced at the adapter layer via cost caps and repo scope)

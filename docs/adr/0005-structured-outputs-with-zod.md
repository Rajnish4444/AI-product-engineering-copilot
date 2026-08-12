# ADR-0005: Structured outputs with Zod

- **Status**: Accepted
- **Date**: 2026-08-12
- **Deciders**: Rajnish Kaushik

## Context

BuildPilot's PM copilot produces two artifacts that downstream code consumes: a `PRD` (rendered in the UI, stored in a Gist) and a `TaskList` (each task becomes a GitHub Issue and later a `DispatchPayload`). We cannot afford brittle free-text parsing:

- A missing field means a task never gets dispatched.
- A malformed shape crashes the artifact viewer.
- Silent semantic drift (e.g., the model starts putting acceptance criteria inside a "notes" field) is undetectable without structure.

Three approaches were on the table:

1. Prompt for JSON, parse, hope. (Historically ~5% parse-failure rate on well-tuned prompts.)
2. Provider-native function/tool calling.
3. Schema-first structured outputs via the Vercel AI SDK's `generateObject` / `streamObject`.

## Decision

Every LLM output consumed by code is a validated Zod object.

- Schemas live in `lib/schemas/` and are the single source of truth for both TypeScript types (`z.infer<typeof PRD>`) and provider JSON-schema hints.
- Call sites use `generateObject` (for one-shot) or `streamObject` (for interactive UI) from the Vercel AI SDK.
- On validation failure: one automatic repair attempt (send the schema violation back to the model), then surface as an error the user can retry.
- Schemas are versioned in the filename (`prd.v1.ts`, `prd.v2.ts`). Existing callers keep their version until migrated.

Free-text output is only used for the chat surface the user reads directly (assistant messages in the chat pane). It is never parsed by code.

## Consequences

### Positive

- Type safety end-to-end: the frontend, route handler, and Gist-writing code all consume the same Zod-inferred type.
- Testability: schema is the contract; goldens can assert against it deterministically.
- Provider swap is safer: providers that fail schema conformance are caught by evals before reaching prod.
- Schema evolution is explicit — a new field is a schema bump, not a silent addition.

### Negative

- Some providers (especially older or smaller models) produce lower-quality outputs under JSON-mode constraints than in free text. We accept this cost; `lib/prompts/*.md` frontmatter documents which models are known-good per schema.
- Deeply nested schemas can hit provider-imposed depth or token limits. We keep schemas shallow (rarely more than three levels).
- One extra dependency (`zod`) — trivial cost.

### Neutral

- Streaming an object requires a slightly different UI pattern than streaming text (partial objects appear as they build). The artifact viewer is designed for this.

## Alternatives considered

- **Prompt for JSON + regex/JSON.parse.** Rejected: brittle, model-dependent, and provides no compile-time types.
- **Provider-native function calling only.** Rejected: `generateObject` already uses each provider's best structured-output primitive under the hood (function calling for OpenAI, tool use for Anthropic, JSON mode for Google). We get the benefit without the portability cost.
- **JSON Schema without Zod.** Rejected: we lose TypeScript inference and get worse error messages.
- **TypeChat.** Rejected: less mature; smaller community; overlapping surface with Vercel AI SDK.

## Related

- ADR-0002 (Multi-provider abstraction — `generateObject` is the abstraction seam)
- ADR-0008 (Evaluation strategy — schemas are half the eval)
- [`docs/eval-strategy.md`](../eval-strategy.md)

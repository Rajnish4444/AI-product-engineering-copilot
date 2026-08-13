# `lib/providers/`

Model provider abstraction. Every model call in BuildPilot enters through here — feature code never imports `@ai-sdk/*` or a provider SDK directly. See [ADR-0002](../../docs/adr/0002-multi-provider-model-abstraction.md).

## Files

- `index.ts` — the `ModelProvider` interface (added in Phase 4).
- `registry.ts` — env-var-driven selection.
- `anthropic.ts`, `google.ts`, `github-models.ts` — adapters.
- `pricing.ts` — `$/1M tokens` per model.
- `*.smoke.test.ts` — one live-call test per adapter.

## Adding a new provider

Use the `add-provider` Claude Code skill, or follow [`.claude/skills/add-provider/SKILL.md`](../../.claude/skills/add-provider/SKILL.md).

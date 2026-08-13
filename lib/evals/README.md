# `lib/evals/`

Evaluation harness for every prompt in `lib/prompts/`. See [ADR-0008](../../docs/adr/0008-evaluation-strategy.md) for strategy and [`docs/eval-strategy.md`](../../docs/eval-strategy.md) for the practical guide.

## Layout

```
lib/evals/
  <prompt-name>/
    golden.jsonl          # one JSON row per line
    assertions.ts         # structural + custom assertions
    judge.md              # optional: LLM-as-judge prompt for this eval
    README.md             # what this eval covers, known gaps
  judges/
    coherence.md
    ...
  run.ts                  # entry point invoked by pnpm eval
  types.ts                # shared eval types
```

## Adding an eval

Use the `write-prompt-eval` Claude Code skill, or follow [`.claude/skills/write-prompt-eval/SKILL.md`](../../.claude/skills/write-prompt-eval/SKILL.md).

## Running

```bash
pnpm eval                # full suite, configured provider
pnpm eval:cheap          # cheapest configured provider
pnpm eval -- --prompt prd-generator
```

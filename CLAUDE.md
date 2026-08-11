# Guidance for AI coding sessions on this repo

This file tells Claude Code (and other agentic coding tools) how to work in this repo. Read it first.

## What this repo is

BuildPilot — an AI Product & Engineering Copilot. Next.js + TypeScript + Vercel AI SDK, with GitHub as the persistence layer and GitHub Actions as the long-lived compute plane. See [`README.md`](README.md) and [`docs/architecture.md`](docs/architecture.md) before making non-trivial changes.

## The five principles that constrain every change

1. **No infrastructure we operate.** Do not add a database, queue, worker, or persistent server. State lives in GitHub Issues / PR bodies / Gists, session cookies, or repo secrets. If a task seems to require a DB, first check whether GitHub can hold the state.
2. **Every model call goes through the provider layer.** Never `import "@ai-sdk/anthropic"` (or any provider SDK) outside [`lib/providers/`](lib/providers/). Feature code depends only on the `ModelProvider` interface.
3. **Structured outputs by default.** LLM outputs that are consumed by code must be validated Zod objects. Use `generateObject` / `streamObject`. Free-text output is only for chat surfaces the user reads directly.
4. **Prompts are versioned artifacts.** Prompts live in [`lib/prompts/`](lib/prompts/) as `.md` files with frontmatter (name, version, model, expected schema). Never edit a shipped prompt in place — bump the version.
5. **Every prompt has an eval.** New prompt or non-trivial prompt change means a new golden-set example in [`lib/evals/`](lib/evals/). See [`docs/eval-strategy.md`](docs/eval-strategy.md).

## Where to make what kinds of changes

| Change type | Location | Notes |
|---|---|---|
| New model provider | [`lib/providers/`](lib/providers/) + register in `registry.ts` | Use the `add-provider` skill for scaffolding. |
| New prompt | [`lib/prompts/<name>.v1.md`](lib/prompts/) + eval in [`lib/evals/`](lib/evals/) | Use the `write-prompt-eval` skill. |
| New API route | [`app/api/<name>/route.ts`](app/) | Node runtime, not Edge — richer SDK support. |
| New UI surface | [`app/(chat)/`](app/) or a new route group | shadcn/ui components, Tailwind classes. |
| New GitHub interaction | [`lib/github/`](lib/github/) | Use Octokit with the GitHub App installation token. |
| New architectural decision | [`docs/adr/`](docs/adr/) | Use the `write-adr` skill. Never make a load-bearing decision without one. |

## Commands you should know

```bash
pnpm dev            # Next.js dev server
pnpm test           # Vitest unit + integration tests
pnpm eval           # Run the LLM eval suite (uses configured provider)
pnpm eval:cheap     # Same, but forces the cheapest available provider
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
```

## Testing rules that are non-obvious

- **Do not mock the provider layer in eval tests.** Evals are the thing that catches provider-swap regressions — mocking defeats the purpose. Unit tests for non-LLM code can and should mock.
- **Do not commit real API keys or installation tokens** — even in test fixtures. Use the placeholders in `.env.example`.
- **Prompt-injection test cases are required** for any prompt that ingests user-controlled text. See [`docs/security-threat-model.md`](docs/security-threat-model.md).

## Cost discipline

Model calls cost money. Before shipping a new prompt:

1. Estimate token count with the `estimate-token-cost` skill.
2. If the estimated cost per invocation is > $0.05, flag it in the PR and consider (a) cheaper model, (b) shorter context, (c) caching, (d) a bounded retry policy.

## When in doubt

- Read the ADRs in [`docs/adr/`](docs/adr/) — the *why* behind everything is there.
- Prefer editing existing files to creating new ones.
- Small PRs. One decision per PR.

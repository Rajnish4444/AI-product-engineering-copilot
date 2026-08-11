# Contributing to BuildPilot

Thanks for your interest. This document covers how to propose changes, the review bar, and the non-obvious rules that keep the codebase coherent.

## Before you start

Read (in order):

1. [`README.md`](README.md) — what BuildPilot is.
2. [`CLAUDE.md`](CLAUDE.md) — the five principles that constrain every change. These apply to human contributors too.
3. [`docs/architecture.md`](docs/architecture.md) — the system overview.
4. Any relevant [`docs/adr/`](docs/adr/) — the *why* behind the code you're touching.

## Development workflow

```bash
git checkout -b feat/<short-name>
pnpm install
pnpm dev
# make your change
pnpm typecheck && pnpm lint && pnpm test
# if you added or changed a prompt:
pnpm eval
git commit -m "feat(scope): short imperative summary"
git push -u origin feat/<short-name>
```

Open a PR against `main`. Fill in the PR template.

## Commit style

- **Imperative subject line**, ≤ 72 chars. `feat(providers): add Groq adapter`, not `Added Groq adapter`.
- **Conventional scope prefix**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`.
- **Body explains WHY.** The diff shows the what. If the reasoning is in an ADR, link it: `See ADR-0002.`

## PR review bar

A PR is ready to merge when:

- [ ] All CI checks pass (typecheck, lint, unit tests).
- [ ] If it touches a prompt: `pnpm eval` passes against the golden set.
- [ ] If it introduces a load-bearing architectural choice: there is an ADR in the same PR or referenced from it.
- [ ] If it adds a new external dependency: a one-line justification is in the PR description.
- [ ] Cost impact is estimated for anything that changes LLM call patterns.
- [ ] No `Co-Authored-By: Claude` (or any other AI) trailer on the commit. Attribution is human.

## Adding a new model provider

Use the `add-provider` Claude Code skill (see [`.claude/skills/add-provider/SKILL.md`](.claude/skills/add-provider/SKILL.md)), or follow it by hand:

1. Create [`lib/providers/<name>.ts`](lib/providers/) implementing the `ModelProvider` interface.
2. Register it in [`lib/providers/registry.ts`](lib/providers/).
3. Add a smoke test that calls `generateObject` against a trivial schema.
4. Update the provider table in [`docs/architecture.md`](docs/architecture.md).
5. If pricing is public, add the model to the cost table used by `estimate-token-cost`.

## Adding or changing a prompt

Prompts are versioned. **Never edit a shipped prompt in place** — that silently changes behavior for callers. Instead:

1. Copy [`lib/prompts/<name>.vN.md`](lib/prompts/) to `<name>.v(N+1).md`.
2. Update the frontmatter (`version`, and `schema` if changed).
3. Update the caller to reference the new version.
4. Add a golden-set example to [`lib/evals/`](lib/evals/) that covers the new behavior.
5. Run `pnpm eval` and attach the delta to the PR description.

## Questions

Open a GitHub Discussion or a draft PR. We prefer discussion in-repo so the reasoning is durable.

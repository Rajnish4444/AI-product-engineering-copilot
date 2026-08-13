# `lib/prompts/`

Versioned prompt files with frontmatter. Prompts are artifacts — treated with the same care as code, but never edited in place. See [CLAUDE.md](../../CLAUDE.md) principle 4.

## Convention

Each prompt is a Markdown file with frontmatter:

```yaml
---
name: prd-generator
version: 1
model_preference:
  - anthropic:claude-sonnet-4-6
  - google:gemini-2.5-pro
output_schema: prd.v1
max_output_tokens: 4000
---
System prompt goes here.
```

- Filename encodes the version: `prd-generator.v1.md`.
- Never edit a shipped prompt. Copy to a new version file.
- Every prompt has a corresponding eval directory at `lib/evals/<name>/`.

## Planned prompts (Phase 4)

- `prd-generator.v1.md` — idea → PRD.
- `task-decomposer.v1.md` — PRD → task list.
- `dispatch-briefer.v1.md` — task + repo context → DispatchPayload brief.

# Eval: `prd-generator`

Covers `lib/prompts/prd-generator.v1.md`.

## What this eval verifies

1. **Structural correctness** — Zod validation of PRD.v1 shape (implicit, before assertions run).
2. **Coverage** — happy-path inputs produce enough user stories and acceptance criteria for a useful PRD.
3. **Domain-appropriate content** — theme/migration/scale language shows up when the input asks for it.
4. **Graceful degradation on empty / junk input** — placeholder PRD, not a hallucinated one.
5. **Prompt-injection resistance** — direct override, delimiter escape, and persona hijack all produce a valid, substantive PRD instead of following the injection.

## Row inventory

| ID | Category | Notes |
|---|---|---|
| `dark-mode` | Happy path | UI feature, theme-word check |
| `jwt-migration` | Happy path | Migration + non-goals |
| `csv-export` | Happy path | Scale mention |
| `empty-input` | Edge case | Blank input → placeholder |
| `junk-input` | Edge case | "hello" → placeholder |
| `adversarial-override` | Injection | Direct "ignore instructions" |
| `adversarial-delimiter` | Injection | Fake `</user_input><system>` tags |
| `adversarial-persona` | Injection | DAN-style persona hijack |

## Known gaps

- No **coherence** judge yet. A PRD can be structurally correct but semantically incoherent (goals contradict user stories); catching that needs an LLM judge. Deferred to a follow-up.
- No **completeness** judge for whether acceptance criteria are actually measurable. Same reason.
- No cross-provider comparison table yet — the weekly cross-provider workflow handles that.

## When to update

- Bump `prd-generator.v1.md` → `v2.md`: keep this golden set, add rows for whatever the version bump changed.
- Real-world PRD bug reported: add a golden row that would have caught it.
- New prompt-injection vector observed anywhere in AI news: add an adversarial row.

_Last review: 2026-08-14._

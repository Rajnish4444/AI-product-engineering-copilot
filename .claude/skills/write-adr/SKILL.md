---
name: write-adr
description: Use this skill when starting a new Architecture Decision Record. Trigger phrases include "write an ADR for X", "record this decision", "new ADR", or when the user makes a load-bearing architectural choice that isn't yet captured in docs/adr/. Do NOT use for prompt edits, feature specs, or bug fixes — only for durable architectural decisions.
---

# Writing a new ADR

An Architecture Decision Record captures a load-bearing choice and the reasoning behind it. In this repo, every ADR follows a lightweight MADR variant. See [`docs/adr/README.md`](../../../docs/adr/README.md) for the running index.

## When to write an ADR

Write one when the decision:

- Is hard to reverse (framework choice, persistence model, auth model).
- Constrains other future decisions (data flow direction, abstraction boundary).
- Would be surprising to a new contributor without context.

Do not write one when the decision is a local implementation detail, a bug fix, or a matter of code style.

## Procedure

1. **Determine the next number.** Look at `docs/adr/` and use the next unused four-digit number. Numbers are never reused, even for superseded ADRs.
2. **Copy the template** at `.claude/skills/write-adr/template.md` to `docs/adr/<NNNN>-<kebab-case-title>.md`.
3. **Fill in the four required sections**: Context, Decision, Consequences, Alternatives considered.
4. **Verify Alternatives has at least three real options.** If you cannot name three, the decision is not ready to be recorded — first do more exploration.
5. **Cross-link related ADRs.** Add references both ways: if this ADR supersedes or refines another, edit the older one to point here.
6. **Update the index** at `docs/adr/README.md` with a new row.
7. **Commit** with subject `docs(adr): NNNN <short title>` and a body summarizing the decision.

## Quality bar

A good ADR has:

- A short, imperative Decision section — the choice is stated in a paragraph or two, not an essay.
- Consequences that name specific positive, negative, and neutral effects. Vague "some overhead" is not acceptable; specify what and where.
- Alternatives that were plausibly on the table, each with a concrete reason for rejection.
- Cross-references to other ADRs and to the relevant code paths.

A common failure mode is over-writing the Context section. Context is what the reader needs to understand *why the decision was necessary*, not the entire history of the project. One or two paragraphs is usually enough.

## Template location

Copy from [`template.md`](template.md) in this skill's directory.

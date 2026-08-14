# Demo script

A 5-minute walkthrough for interviews or design reviews. Structured as: pitch → live demo → architecture callouts → Q&A anchors.

---

## 1. The 30-second pitch

> BuildPilot is an AI Product & Engineering Copilot. It sits on the PM ↔ Eng seam. Paste a rough idea, and it writes a versioned PRD, decomposes it into engineering tasks, and dispatches a coding-agent runtime that opens a PR — all inside GitHub. There is no database, no queue, no worker. GitHub is the persistence layer; Vercel is the short-lived compute; long-running work runs inside the target repo's Actions.

Use this if you get 30 seconds. Every phrase is load-bearing — practice not editing it live.

## 2. The 3-minute live demo

**Setup before you start**: BuildPilot running on `localhost:3000`, one provider key in `.env.local`, one target repo you own, dev tools open in a side window with the network tab visible.

1. **Land on `/`.** Point at the four-tile grid: PM copilot, Eng copilot, provider-agnostic, no infra. Say: *"These four bets are recorded as ADRs 0002, 0004, 0006, and 0001 respectively. Any interviewer question about a choice → an ADR to reference."*

2. **Click "Open workspace".** You land on `/chat`.

3. **Type a real idea.** Recommended: *"Add dark mode to our settings page. Users can toggle it, and the preference persists per user across devices."*

4. **Click Generate plan.** Two things to point out as it runs:
   - **The PRD streams field-by-field.** That is `provider.streamObject` returning a `partialObjectStream`. The frontend re-renders on each partial. Streaming happens because the response is `application/x-ndjson` — walk them through the network tab so they can see the individual event lines.
   - **The task list starts streaming the moment the PRD closes.** The orchestrator makes the second call with the finished PRD as context (in `<prd>` delimiters, per the injection-hygiene rules in the prompt).

5. **When it lands**, point at the effort badges. Note that L is styled destructive on purpose — the prompt tells the model that L is a signal to split further. This is one of many places where design decisions live in the prompt itself, verifiable by an eval.

6. **Show the cost meter.** Total session cost is under a cent for a typical run. Explain that the cap ladder (session → user daily → dispatch USD) lives in [`docs/adr/0007-safety-guardrails-cost-controls.md`](adr/0007-safety-guardrails-cost-controls.md).

7. **Point at the "dispatch stub" callout.** In production, this would fire `/api/dispatch`, which creates a tracking Issue in the target repo and calls `workflow_dispatch` on `buildpilot-eng.yml`. The workflow routes to the configured runtime adapter — Claude Code by default. Show `template/target-repo/.github/actions/claude-code-adapter/action.yml` briefly.

## 3. The architecture walk (90 seconds if they ask)

Open [`docs/architecture.md`](architecture.md) and step through the ASCII diagram. Beat the following points in order:

- **Two runtimes on purpose.** PM side is bespoke (control the prompt, the schema, the evals). Eng side leverages `claude-code-action` and swap-friendly siblings. (ADR-0004, ADR-0006.)
- **GitHub is the database.** Issues hold tasks. PR bodies hold plans. Gists hold session artifacts. Signed JWTs hold sessions. Zero persistence we operate. (ADR-0003.)
- **Provider abstraction is real, not aspirational.** Show [`lib/providers/index.ts`](../lib/providers/index.ts) — the `ModelProvider` interface. Then [`lib/providers/registry.ts`](../lib/providers/registry.ts) — the env-driven selector. Then the three adapters in the same folder. Swapping Anthropic → Google is a `BUILDPILOT_PROVIDER=google` change and re-running evals.
- **Evals are the contract.** Show [`lib/evals/prd-generator/golden.jsonl`](../lib/evals/prd-generator/golden.jsonl) — happy paths, edge cases, and three adversarial injection rows. CI blocks on regressions.

## 4. Q&A anchors — the questions you should hope for

Have these answers ready. Each maps to an ADR.

| If they ask... | Answer |
|---|---|
| Why not Cursor / Copilot / Devin? | Different lane — BuildPilot targets the PM ↔ Eng handoff. Cursor/Copilot are IDE assistants for engineers already in code. Devin is the eng-only end of what BuildPilot's eng adapter *does* — we can plug it in as a runtime. |
| Why not multi-tenant SaaS? | Explicitly deferred — see [`docs/roadmap.md`](roadmap.md) "anti-goals". It would break the no-DB principle without adding demo value. |
| How do you handle prompt injection? | Four layers: delimiter discipline in every prompt, no tools in the PM layer, Zod validation on outputs, adversarial cases in every golden set. Full walk in [`docs/security-threat-model.md`](security-threat-model.md). |
| What if Anthropic gets rate-limited during your demo? | `BUILDPILOT_PROVIDER=google` in `.env.local`, restart, keep demoing. This is the point of ADR-0002. |
| How do you evaluate the PRD generator? | 8 golden rows including 3 adversarial. Structural assertions on schema shape. LLM-as-judge deferred (documented gap in the eval README). See [ADR-0008](adr/0008-evaluation-strategy.md). |
| What is the biggest risk you would fix if you had another sprint? | Session cost tracking is per-request only — I need to persist per-user daily totals to a Gist to enforce that cap correctly across requests. It's a well-scoped ~1 day task. Called out in [`docs/roadmap.md`](roadmap.md) as tech debt. |

## 5. Questions you should ask them

If the conversation opens up:

- *"What surprises you about the split-runtime approach?"* — probes whether they see the PM/Eng seam.
- *"Given the no-infra constraint, where would you put session state that must survive a Vercel cold-start?"* — invites them into the GitHub-as-DB reasoning.
- *"If you were reviewing my PR that adds a new provider, what would you check first?"* — surfaces whether they get the eval contract.

## 6. Timing cheat sheet

If you have… | Do this
---|---
30 seconds | Just section 1.
2 minutes | Section 1 + a short version of section 2 (skip network tab, skip badges).
5 minutes | Sections 1 + 2 + 3.
15 minutes | Sections 1–3 + open one ADR they seem interested in.

Keep your hand off the mouse when they are talking.

---
name: add-provider
description: Use this skill when adding a new model provider adapter (e.g., Groq, Mistral, Cohere, Fireworks, a self-hosted vLLM endpoint) to lib/providers/. Trigger phrases include "add provider X", "wire up model X", or when the user wants to make a new model available through the abstraction. Do NOT use for bumping an existing provider's model version — that is a config change in lib/prompts/ frontmatter.
---

# Adding a new model provider

BuildPilot's model portability comes from the provider abstraction. Every provider is a thin adapter that satisfies the `ModelProvider` interface. See [ADR-0002](../../../docs/adr/0002-multi-provider-model-abstraction.md).

## Procedure

1. **Confirm the interface.** Read [`lib/providers/index.ts`](../../../lib/providers/index.ts). If the provider cannot satisfy `object` / `streamObject` (i.e., no structured-output support), stop and discuss with the team — this is a hard requirement.

2. **Create the adapter file.** New file at `lib/providers/<name>.ts`. Use the Vercel AI SDK adapter when one exists (`@ai-sdk/<name>`), or wrap the provider's SDK directly. Keep the file thin — only what's needed to satisfy the interface.

3. **Register in the registry.** Add the case to `lib/providers/registry.ts` so `BUILDPILOT_PROVIDER=<name>` selects it.

4. **Add pricing.** Update `lib/providers/pricing.ts` with `{ model, input_per_1m_usd, output_per_1m_usd }` for each model the adapter exposes. Get numbers from the provider's official pricing page. Note the date in a comment.

5. **Add a smoke test.** Create `lib/providers/<name>.smoke.test.ts` that calls `object` with a trivial Zod schema (`z.object({ ok: z.literal(true) })`) and asserts a valid response. Uses a real API call — this is intentional. Guard with `describe.skipIf(!process.env.<PROVIDER_KEY>)` so CI without the key doesn't fail.

6. **Run evals against it.**
   ```bash
   pnpm eval:cheap -- --provider <name>
   ```
   Address failures before merging. Common issues: JSON-mode differences, tool-call format, streaming chunk shape. Fix in the adapter, not in the prompts.

7. **Update docs.**
   - Add a row to the provider table in [`docs/architecture.md`](../../../docs/architecture.md).
   - Add the required env var to [`docs/runbook.md`](../../../docs/runbook.md).
   - If the provider has unusual constraints (e.g., no streaming, no tool use), document them in the adapter file's top comment.

8. **Commit** in a single PR titled `feat(providers): add <name> adapter`. Body must reference the eval-suite outcome ("goldens pass at <rate>%").

## Common pitfalls

- **Do not add provider-specific features to the public interface.** If Provider X supports a unique feature, expose it via an optional method that other providers can throw `NotImplementedError` on. Feature code checks for support before using.
- **Do not tune prompts around the new provider's quirks.** That is what the adapter is for. Prompts should be provider-neutral text; adapter translates.
- **Do not hardcode model names in the adapter.** Model IDs are inputs to the adapter, chosen by callers or prompt frontmatter.

## What a good adapter looks like

- Under 200 lines including imports.
- No conditionals on provider-specific behavior outside the adapter file itself.
- Smoke test that runs in under 5 seconds.
- Evals that pass at the same rate as at least one existing provider.

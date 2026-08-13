# Diagnostic scripts

Standalone `tsx` scripts for validating provider connectivity and the streaming endpoint outside the browser. Not part of the shipped bundle.

## Scripts

| Script | Purpose |
|---|---|
| `smoke-gemini.ts` | Probes which Gemini model IDs are currently available on the configured `GOOGLE_GENERATIVE_AI_API_KEY`. Useful when Google retires a model. |
| `smoke-plan.ts` | Streams the local `/api/plan` endpoint and prints each event with its arrival timestamp. Confirms streaming works end-to-end without needing the browser. |

## Running

```bash
pnpm tsx scripts/smoke-gemini.ts       # requires GOOGLE_GENERATIVE_AI_API_KEY in .env.local
pnpm dev &                              # dev server must be running for smoke-plan
pnpm tsx scripts/smoke-plan.ts
```

Both scripts load `.env.local` via `dotenv` — no manual env sourcing needed.

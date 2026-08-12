---
name: estimate-token-cost
description: Use this skill when estimating the token or dollar cost of a prompt, a feature, or an entire user journey. Trigger phrases include "how much will this cost", "estimate token usage", "budget check for X", "will this blow up the free tier". Especially relevant before merging any change to lib/prompts/ or when planning a new feature that adds model calls.
---

# Estimating LLM token cost

Cost surprises kill demos and drain free tiers. This skill produces a defensible estimate before code merges, using our own pricing table so numbers stay honest.

## Procedure

1. **Identify every model call in scope.**
   For a single prompt: one call. For a feature: walk the code path and list each `provider.chat` / `provider.object` / `provider.streamObject` invocation.

2. **For each call, estimate input and output tokens.**
   - **Input**: system prompt + user input + any tool definitions + retrieved context. Use `pnpm tokens -- <file>` for a specific file, or ~4 chars/token as a rough estimate for prose.
   - **Output**: the maximum realistic size given the schema. Bound by `max_output_tokens` in frontmatter — use that as the upper bound.

3. **Look up per-token pricing.** From `lib/providers/pricing.ts`:
   ```
   $/call = (input_tokens × input_per_1m_usd + output_tokens × output_per_1m_usd) / 1_000_000
   ```

4. **Multiply by expected frequency** to get $/day, $/week, $/1000-users:
   ```
   $/day per active user = $/call × calls_per_active_user_per_day
   $/1000-users-day = $/day × 1000
   ```

5. **Compare to caps and free-tier ceilings.**
   - Per-session cap: 200k tokens (default).
   - Per-user daily cap: 2M tokens (default).
   - Free-tier ceilings: Anthropic ~$5 initial credit; Google Gemini API free tier ~1500 requests/day; GitHub Models ~150 premium-model requests/day.

## Report format

Post the estimate as a Markdown table in the PR description or as a comment on the ADR:

```
### Cost estimate — <feature or prompt name>

| Call | Model | Input tokens | Output tokens | $/call |
|---|---|---|---|---|
| /api/plan PRD | claude-sonnet-4-6 | 800 | 2000 | $0.0324 |
| /api/plan tasks | claude-sonnet-4-6 | 3000 | 1500 | $0.0315 |
| **Total per session** | | | | **$0.0639** |

Per user per day (assume 3 sessions): $0.192
Per 1000 users per day: $192
Free-tier ceiling breach: at ~26 active users/day on Anthropic starter credit.

Notes: <any assumptions, alternative models considered>
```

## When the estimate says stop

If the per-call estimate is above $0.05 or the per-session estimate is above $0.20, take action before merging:

- Can we use a cheaper model for this call? (Downgrade Sonnet → Haiku, Pro → Flash, GPT-4o → 4o-mini.)
- Can we reduce input context? (Trim retrieved files, summarize prior messages.)
- Can we cache the result? (Prompt caching for repeated system prompts is a 90% cost cut on providers that support it.)
- Can we bound output more tightly? (Tighter `max_output_tokens` if the schema allows.)
- Should this be a background job with a batched provider (Anthropic Batch API — 50% discount)?

Flag the trade-offs in the PR. Don't merge silent cost increases.

## Common estimation mistakes

- **Ignoring system-prompt tokens.** System prompts are re-sent every call unless caching is on. A 2000-token system prompt across 1000 calls/day is 2M input tokens/day — not free.
- **Assuming worst-case output.** Streaming outputs often stop early. Use median from prior evals, not `max_output_tokens`, for the expected estimate — but do use `max_output_tokens` for the ceiling estimate.
- **Forgetting the eval budget.** Each eval run costs real money. If your feature adds 20 new golden rows, that's 20x the eval cost per CI run.
- **Under-counting judge calls.** LLM-as-judge doubles model calls per eval row and typically uses a stronger (more expensive) model.

## Reference

Pricing table: [`lib/providers/pricing.ts`](../../../lib/providers/pricing.ts). Update it whenever provider pricing changes; include the effective date as a comment.

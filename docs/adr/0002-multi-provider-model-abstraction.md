# ADR-0002: Multi-provider model abstraction

- **Status**: Accepted
- **Date**: 2026-08-12
- **Deciders**: Rajnish Kaushik

## Context

BuildPilot's viability depends on model availability. Any single provider can:

- Rate-limit us out of a demo (free-tier quotas).
- Deprecate a model mid-project.
- Become geographically unavailable to a demo audience.
- Price a feature out of reach.

Additionally, the interview narrative for an AI-Native Tech Lead role requires demonstrating that we treat model choice as a **configuration decision, not a codebase decision**. Model portability is table stakes.

## Decision

Every model call in the product goes through a single `ModelProvider` interface. Feature code never imports a provider SDK directly.

Concretely:

- Use the **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/google` + `@ai-sdk/openai`) as the underlying transport. It already normalizes streaming, tool calls, and structured-output modes across providers.
- Wrap the AI SDK behind our own `lib/providers/index.ts` interface. This second wrapper is intentional: it lets us swap the AI SDK itself later if needed, and it gives us a natural home for concerns the AI SDK does not handle (cost accounting, per-tenant caps, judge selection for evals).
- A `lib/providers/registry.ts` module picks the concrete provider by environment variable. Switching providers is a config change, not a code change.
- Ship three adapters at launch: **Anthropic**, **Google (Gemini)**, **GitHub Models**. This covers the plausible free-tier permutations users will encounter.

## Consequences

### Positive

- Provider swap is a one-line env-var change plus a re-run of evals.
- Cost and latency benchmarking is a natural side effect: we can point evals at each provider.
- Adding a new provider is a bounded task (~200 LOC + a smoke test), automated via the `add-provider` skill.
- The interface enforces discipline: we cannot accidentally depend on Anthropic-only features in feature code.

### Negative

- We work in the intersection of provider capabilities, not the union. Advanced Anthropic features (extended thinking, computer use, sub-agents via the Claude Code SDK) either need to be wrapped generically or exposed only to code that runs when that provider is active.
- Two layers of indirection (AI SDK + our wrapper) add ~40ms of wall-clock overhead per call. Acceptable.
- The abstraction encourages "lowest common denominator" prompts. We counter this by tagging prompts with a preferred provider in frontmatter.

### Neutral

- Provider-specific pricing tables live in a single module (`lib/providers/pricing.ts`) and must be kept current manually. Automation deferred.

## Alternatives considered

- **Direct AI SDK usage (no second wrapper).** Rejected: leaks the AI SDK's abstractions into feature code, and we lose our own seam for cost/eval concerns.
- **LangChain / LlamaIndex.** Rejected: too heavy for our scope, opinionated in ways that fight our GitHub-first design, and their abstractions change frequently.
- **Raw provider SDKs behind our own wrapper.** Rejected: AI SDK already does the streaming and tool-use normalization well. Reinventing it adds risk with no upside.
- **Provider per environment** (Anthropic in prod, Google in dev). Rejected: hides regressions until it is too late. Same provider everywhere, chosen at deploy time.

## Related

- ADR-0005 (Structured outputs with Zod)
- ADR-0006 (Pluggable engineering runtime — same idea for the eng side)
- ADR-0008 (Evaluation strategy — how provider swaps are verified)

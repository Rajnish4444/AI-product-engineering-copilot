/**
 * Per-model pricing table used for cost estimates and eval budgets.
 *
 * Prices are USD per 1,000,000 tokens.
 * Last updated: 2026-08-13. Verify against provider pricing pages when adding
 * or bumping a model — see the `add-provider` skill for the procedure.
 */

export interface ModelPricing {
  input: number;
  output: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic
  "claude-opus-4-7": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0 },

  // Google
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini-2.5-flash": { input: 0.075, output: 0.3 },

  // OpenAI (also served by GitHub Models on the OpenAI-compatible endpoint)
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4o": { input: 2.5, output: 10.0 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  );
}

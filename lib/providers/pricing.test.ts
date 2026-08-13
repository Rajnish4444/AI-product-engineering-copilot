import { describe, it, expect } from "vitest";
import { estimateCost, MODEL_PRICING } from "./pricing";

describe("estimateCost", () => {
  it("returns 0 for an unknown model", () => {
    expect(estimateCost("does-not-exist", 1000, 500)).toBe(0);
  });

  it("returns 0 when both token counts are 0", () => {
    expect(estimateCost("claude-sonnet-4-6", 0, 0)).toBe(0);
  });

  it("matches the pricing table for a known model", () => {
    const price = MODEL_PRICING["claude-sonnet-4-6"];
    expect(price).toBeDefined();
    // 1M input + 0.5M output tokens = input_per_1m + 0.5 * output_per_1m
    const cost = estimateCost("claude-sonnet-4-6", 1_000_000, 500_000);
    expect(cost).toBeCloseTo(price.input + price.output * 0.5, 6);
  });

  it("scales linearly with token count", () => {
    const oneX = estimateCost("gemini-2.5-flash", 1_000, 500);
    const tenX = estimateCost("gemini-2.5-flash", 10_000, 5_000);
    expect(tenX).toBeCloseTo(oneX * 10, 8);
  });

  it("charges output tokens more than input tokens (per pricing invariant)", () => {
    // Anthropic and OpenAI both charge more for output — sanity-check the table
    const inputOnly = estimateCost("claude-sonnet-4-6", 1_000_000, 0);
    const outputOnly = estimateCost("claude-sonnet-4-6", 0, 1_000_000);
    expect(outputOnly).toBeGreaterThan(inputOnly);
  });
});

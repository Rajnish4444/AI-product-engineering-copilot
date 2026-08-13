import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCostCaps } from "./caps";

describe("getCostCaps", () => {
  beforeEach(() => {
    vi.stubEnv("BUILDPILOT_SESSION_TOKEN_CAP", "");
    vi.stubEnv("BUILDPILOT_USER_DAILY_TOKEN_CAP", "");
    vi.stubEnv("BUILDPILOT_DISPATCH_COST_CAP_USD", "");
    vi.stubEnv("EVAL_COST_CAP_USD", "");
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ADR-0007 defaults when no env vars are set", () => {
    const caps = getCostCaps();
    expect(caps.sessionTokens).toBe(200_000);
    expect(caps.userDailyTokens).toBe(2_000_000);
    expect(caps.dispatchCostUsd).toBe(2.0);
    expect(caps.evalCostUsd).toBe(2.0);
  });

  it("respects env overrides for integer caps", () => {
    vi.stubEnv("BUILDPILOT_SESSION_TOKEN_CAP", "50000");
    vi.stubEnv("BUILDPILOT_USER_DAILY_TOKEN_CAP", "999999");
    const caps = getCostCaps();
    expect(caps.sessionTokens).toBe(50_000);
    expect(caps.userDailyTokens).toBe(999_999);
  });

  it("respects env overrides for float caps", () => {
    vi.stubEnv("BUILDPILOT_DISPATCH_COST_CAP_USD", "0.25");
    vi.stubEnv("EVAL_COST_CAP_USD", "5.75");
    const caps = getCostCaps();
    expect(caps.dispatchCostUsd).toBe(0.25);
    expect(caps.evalCostUsd).toBe(5.75);
  });

  it("falls back to defaults on non-numeric env values", () => {
    vi.stubEnv("BUILDPILOT_SESSION_TOKEN_CAP", "not-a-number");
    vi.stubEnv("BUILDPILOT_DISPATCH_COST_CAP_USD", "junk");
    const caps = getCostCaps();
    expect(caps.sessionTokens).toBe(200_000);
    expect(caps.dispatchCostUsd).toBe(2.0);
  });

  it("falls back to defaults on zero or negative values", () => {
    vi.stubEnv("BUILDPILOT_SESSION_TOKEN_CAP", "0");
    vi.stubEnv("BUILDPILOT_DISPATCH_COST_CAP_USD", "-1.5");
    const caps = getCostCaps();
    expect(caps.sessionTokens).toBe(200_000);
    expect(caps.dispatchCostUsd).toBe(2.0);
  });
});

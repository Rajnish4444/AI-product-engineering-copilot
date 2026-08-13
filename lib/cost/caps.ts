/**
 * Cost and safety caps. Read from environment variables at call time so
 * ADR-0007 defaults can be overridden per deployment without code changes.
 *
 * All caps are advisory — enforcement lives in the callers (plan orchestrator,
 * dispatch handler, eval runner). Centralizing the source keeps them coherent.
 */

export interface CostCaps {
  /** Hard cap on total tokens for a single interactive session. */
  sessionTokens: number;
  /** Hard cap on total tokens per authenticated user per UTC day. */
  userDailyTokens: number;
  /** Dollar cap passed to the eng runtime adapter per dispatch. */
  dispatchCostUsd: number;
  /** Dollar cap on a single `pnpm eval` invocation. */
  evalCostUsd: number;
}

const DEFAULTS: CostCaps = {
  sessionTokens: 200_000,
  userDailyTokens: 2_000_000,
  dispatchCostUsd: 2.0,
  evalCostUsd: 2.0,
};

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function floatFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCostCaps(): CostCaps {
  return {
    sessionTokens: intFromEnv(
      "BUILDPILOT_SESSION_TOKEN_CAP",
      DEFAULTS.sessionTokens
    ),
    userDailyTokens: intFromEnv(
      "BUILDPILOT_USER_DAILY_TOKEN_CAP",
      DEFAULTS.userDailyTokens
    ),
    dispatchCostUsd: floatFromEnv(
      "BUILDPILOT_DISPATCH_COST_CAP_USD",
      DEFAULTS.dispatchCostUsd
    ),
    evalCostUsd: floatFromEnv("EVAL_COST_CAP_USD", DEFAULTS.evalCostUsd),
  };
}

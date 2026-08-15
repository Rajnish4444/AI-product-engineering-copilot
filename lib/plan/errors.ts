/**
 * Shared error classification for the plan and refine orchestrators.
 * Turns AI SDK error types into typed, user-facing NDJSON error events.
 */

import { APICallError, NoObjectGeneratedError } from "ai";
import { ProviderConfigError } from "@/lib/providers";

export function classifyOrchestratorError(err: unknown): {
  code: string;
  message: string;
} {
  if (err instanceof ProviderConfigError) {
    return { code: "provider_config", message: err.message };
  }
  if (NoObjectGeneratedError.isInstance(err)) {
    return {
      code: "schema_validation_failed",
      message:
        "The model produced output that did not match the expected schema. This can happen with smaller models on nested schemas. Try again, or set BUILDPILOT_PROVIDER to a stronger provider (e.g. anthropic, github-models).",
    };
  }
  if (APICallError.isInstance(err)) {
    const status = (err as unknown as { statusCode?: number }).statusCode;
    return {
      code: "provider_api_error",
      message: `Provider API error (HTTP ${status ?? "?"}): ${err.message}`,
    };
  }
  console.error("[plan] orchestrator error:", err);
  return {
    code: "orchestrator_failure",
    message: err instanceof Error ? err.message : "Unknown error",
  };
}

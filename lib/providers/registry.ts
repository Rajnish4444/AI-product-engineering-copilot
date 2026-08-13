/**
 * Provider registry — config-driven selection of the active ModelProvider.
 *
 * Reads BUILDPILOT_PROVIDER at call time (not module-init) so tests and evals
 * can override per-invocation with process.env.BUILDPILOT_PROVIDER_OVERRIDE.
 */

import type { ModelProvider } from "./index";
import { ProviderConfigError } from "./index";
import { anthropic } from "./anthropic";
import { google } from "./google";
import { githubModels } from "./github-models";

const PROVIDERS: Record<string, ModelProvider> = {
  anthropic,
  google,
  "github-models": githubModels,
};

/** Names of every provider the registry knows about. */
export const KNOWN_PROVIDERS = Object.keys(PROVIDERS) as ReadonlyArray<string>;

export function getProvider(name?: string): ModelProvider {
  const requested =
    name ??
    process.env.BUILDPILOT_PROVIDER_OVERRIDE ??
    process.env.BUILDPILOT_PROVIDER ??
    "anthropic";

  const provider = PROVIDERS[requested];
  if (!provider) {
    throw new ProviderConfigError(
      `Unknown provider "${requested}". Configured providers: ${KNOWN_PROVIDERS.join(
        ", "
      )}.`
    );
  }
  return provider;
}

/**
 * Returns the active provider's cheap-tier model. Used by evals and by the
 * cost-cap fallback path — see ADR-0007.
 */
export function getCheapModel(name?: string): { provider: ModelProvider; model: string } {
  const provider = getProvider(name);
  return { provider, model: provider.cheapModel };
}

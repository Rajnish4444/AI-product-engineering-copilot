/**
 * Octokit factories. Two kinds of client:
 *
 *   installationOctokit(id) — scoped to a specific target-repo installation.
 *                              Almost every route handler uses this.
 *   appOctokit()            — app-level metadata (list installations, etc).
 *
 * We create a fresh Octokit per call rather than caching. Installation
 * tokens expire after ~1 hour and the cost of re-minting is trivial
 * compared to the risk of stale-token errors.
 */

import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import {
  getInstallationToken,
  normalizePrivateKey,
} from "./app-auth";

export async function installationOctokit(
  installationId: number
): Promise<Octokit> {
  const token = await getInstallationToken(installationId);
  return new Octokit({
    auth: token,
    userAgent: "buildpilot/0.1",
  });
}

export function appOctokit(): Octokit {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !privateKey) {
    throw new Error(
      "GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY is not set. See docs/runbook.md."
    );
  }
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey: normalizePrivateKey(privateKey),
    },
    userAgent: "buildpilot/0.1",
  });
}

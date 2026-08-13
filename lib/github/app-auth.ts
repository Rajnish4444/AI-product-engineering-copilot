/**
 * GitHub App authentication. Turns the App's JWT into a short-lived
 * installation access token that Octokit uses for repo API calls.
 *
 * Private key is stored as a `\n`-escaped PEM string in
 * GITHUB_APP_PRIVATE_KEY — normalizePrivateKey unwraps it back to real
 * newlines before passing to @octokit/auth-app.
 */

import { createAppAuth } from "@octokit/auth-app";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. See docs/runbook.md for GitHub App setup.`
    );
  }
  return value;
}

/** Env values cannot carry raw newlines; we ship PEMs as `\n`-escaped. */
export function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n");
}

let cachedFactory: ReturnType<typeof createAppAuth> | null = null;

function factory() {
  if (cachedFactory) return cachedFactory;
  cachedFactory = createAppAuth({
    appId: requireEnv("GITHUB_APP_ID"),
    privateKey: normalizePrivateKey(requireEnv("GITHUB_APP_PRIVATE_KEY")),
  });
  return cachedFactory;
}

export async function getInstallationToken(
  installationId: number
): Promise<string> {
  const { token } = await factory()({
    type: "installation",
    installationId,
  });
  return token;
}

/** For tests that need to reset the module-level auth cache. */
export function _resetAppAuthCache() {
  cachedFactory = null;
}

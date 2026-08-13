/**
 * POST /api/webhook — GitHub App webhook receiver.
 *
 * Subscribed events (see docs/runbook.md): `pull_request`, `issues`,
 * `workflow_run`. We update tracking-issue labels to reflect PR state.
 *
 * Signature verification uses the raw request body — Next.js request.text()
 * gives us the body before any JSON coercion, which is required for HMAC.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { verifyWebhookSignature } from "@/lib/github/webhook";
import { installationOctokit } from "@/lib/github/octokit";
import { transitionIssueLabel } from "@/lib/github/tasks";

export const runtime = "nodejs";

const PullRequestEvent = z.object({
  action: z.enum([
    "opened",
    "closed",
    "reopened",
    "edited",
    "synchronize",
    "ready_for_review",
  ]),
  pull_request: z.object({
    number: z.number(),
    merged: z.boolean().optional(),
    body: z.string().nullable().optional(),
    head: z.object({ ref: z.string() }),
  }),
  repository: z.object({
    name: z.string(),
    owner: z.object({ login: z.string() }),
  }),
  installation: z.object({ id: z.number() }),
});

function extractLinkedIssue(body: string | null | undefined): number | null {
  if (!body) return null;
  const match = body.match(/Closes\s+#(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] GITHUB_APP_WEBHOOK_SECRET is not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  if (event !== "pull_request") {
    return new Response("ok", { status: 200 });
  }

  const parsed = PullRequestEvent.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return new Response("ok", { status: 200 });
  }
  const payload = parsed.data;

  const branchIsBuildPilot = payload.pull_request.head.ref.startsWith("bp/");
  if (!branchIsBuildPilot) {
    return new Response("ok", { status: 200 });
  }

  const linkedIssue = extractLinkedIssue(payload.pull_request.body);
  if (!linkedIssue) {
    return new Response("ok", { status: 200 });
  }

  try {
    const octokit = await installationOctokit(payload.installation.id);
    const repo = {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
    };

    if (payload.action === "opened" || payload.action === "reopened") {
      await transitionIssueLabel(octokit, repo, linkedIssue, "bp:pr-opened");
    } else if (payload.action === "closed") {
      const nextLabel = payload.pull_request.merged
        ? "bp:merged"
        : "bp:failed";
      await transitionIssueLabel(octokit, repo, linkedIssue, nextLabel);
    }
  } catch (err) {
    console.error("[webhook] transition error:", err);
    // Still 200 — GitHub will retry if we 5xx, and repeated failures spam
    // the developer with delivery-failure notifications. Log for humans.
  }

  return new Response("ok", { status: 200 });
}

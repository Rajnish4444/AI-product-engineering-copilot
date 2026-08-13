/**
 * POST /api/dispatch — PM → Eng handoff.
 *
 * 1. Auth check (must be a signed-in user).
 * 2. Validate the incoming task + repo + brief.
 * 3. Create a tracking Issue in the target repo (Issue number becomes task_id).
 * 4. Fire workflow_dispatch against buildpilot-eng.yml with the full payload.
 * 5. Return the Issue URL so the UI can link to it.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getCostCaps } from "@/lib/cost/caps";
import { Task } from "@/lib/schemas/task-list.v1";
import {
  DispatchBrief,
  DispatchPayload,
  RepoRef,
  RuntimeName,
} from "@/lib/schemas/dispatch.v1";
import { installationOctokit } from "@/lib/github/octokit";
import { createTrackingIssue, transitionIssueLabel } from "@/lib/github/tasks";
import { triggerEngWorkflow } from "@/lib/github/dispatch";

export const runtime = "nodejs";

const DispatchRequest = z.object({
  installation_id: z.number().int().positive(),
  task: Task,
  repo: RepoRef,
  brief: DispatchBrief,
  runtime: RuntimeName,
  cost_cap_usd: z.number().positive().optional(),
  extra_context: z.string().default(""),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  if (!raw) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = DispatchRequest.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const caps = getCostCaps();
  const costCap = body.cost_cap_usd ?? caps.dispatchCostUsd;

  try {
    const octokit = await installationOctokit(body.installation_id);

    const issue = await createTrackingIssue(
      octokit,
      { owner: body.repo.owner, name: body.repo.name },
      body.task,
      body.extra_context
    );

    const payload: DispatchPayload = {
      task_id: String(issue.number),
      repo: body.repo,
      brief: body.brief,
      runtime: body.runtime,
      cost_cap_usd: costCap,
    };

    await triggerEngWorkflow(octokit, payload);
    await transitionIssueLabel(
      octokit,
      { owner: body.repo.owner, name: body.repo.name },
      issue.number,
      "bp:dispatched"
    );

    return Response.json({
      task_id: payload.task_id,
      issue_url: issue.url,
      runtime: payload.runtime,
    });
  } catch (err) {
    console.error("[dispatch] error:", err);
    return Response.json(
      {
        error: "dispatch_failure",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

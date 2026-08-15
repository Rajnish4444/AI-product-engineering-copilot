/**
 * POST /api/refine — apply user feedback to an existing PRD or TaskList.
 *
 * Body: { target: "prd" | "tasks", feedback: string, currentPrd?, currentTasks?, provider? }
 * Response: NDJSON stream of PlanEvent (same shape as /api/plan).
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { streamRefine } from "@/lib/plan/refine-orchestrator";
import { KNOWN_PROVIDERS } from "@/lib/providers/registry";
import { PRD as PRDSchema } from "@/lib/schemas/prd.v1";
import { TaskList as TaskListSchema } from "@/lib/schemas/task-list.v1";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestBody = z
  .object({
    target: z.enum(["prd", "tasks"]),
    feedback: z.string().min(1).max(2000),
    currentPrd: PRDSchema.nullable().optional(),
    currentTasks: TaskListSchema.nullable().optional(),
    provider: z
      .string()
      .refine(
        (name) => KNOWN_PROVIDERS.includes(name),
        (name) => ({
          message: `Unknown provider "${name}". Configured: ${KNOWN_PROVIDERS.join(", ")}.`,
        })
      )
      .optional(),
  })
  .refine(
    (v) => (v.target === "prd" ? !!v.currentPrd : !!v.currentTasks),
    (v) => ({
      message: `target=${v.target} requires ${v.target === "prd" ? "currentPrd" : "currentTasks"} in the body`,
    })
  );

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestBody.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const stream = streamRefine({
    target: parsed.data.target,
    feedback: parsed.data.feedback,
    currentPrd: parsed.data.currentPrd ?? null,
    currentTasks: parsed.data.currentTasks ?? null,
    provider: parsed.data.provider,
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * POST /api/plan — PM copilot streaming endpoint.
 *
 * Body: { idea: string; provider?: string }
 * Response: NDJSON stream of PlanEvent (see lib/plan/orchestrator.ts).
 *
 * Node runtime is required — provider SDKs and the prompt loader use Node
 * built-ins (fs) and are more reliable outside Edge.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { streamPlan } from "@/lib/plan/orchestrator";
import { KNOWN_PROVIDERS } from "@/lib/providers/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestBody = z.object({
  idea: z.string().min(1).max(4000),
  provider: z
    .string()
    .refine(
      (name) => KNOWN_PROVIDERS.includes(name),
      (name) => ({
        message: `Unknown provider "${name}". Configured: ${KNOWN_PROVIDERS.join(", ")}.`,
      })
    )
    .optional(),
});

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

  const stream = streamPlan(parsed.data);

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
}

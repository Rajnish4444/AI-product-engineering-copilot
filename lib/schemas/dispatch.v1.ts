/**
 * DispatchPayload.v1 — the versioned handoff contract between the PM copilot
 * (Next.js) and the eng copilot (GitHub Actions). See ADR-0004.
 *
 * Any change to this schema is a breaking change and requires a v2 file, a
 * compatibility window, and an update to every RuntimeAdapter (ADR-0006).
 */

import { z } from "zod";

export const RepoRef = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  ref: z
    .string()
    .min(1)
    .default("main")
    .describe("Git ref to branch from (usually the default branch)"),
});
export type RepoRef = z.infer<typeof RepoRef>;

export const DispatchBrief = z.object({
  goal: z
    .string()
    .min(1)
    .describe("One-sentence outcome the agent is trying to produce"),
  acceptance_criteria: z
    .array(z.string().min(1))
    .min(1)
    .describe("Measurable done-conditions"),
  constraints: z
    .array(z.string())
    .default([])
    .describe("Hard limits, e.g. 'no new dependencies', 'keep bundle < 200kb'"),
  context_files: z
    .array(z.string())
    .default([])
    .describe("Paths in the target repo the agent should read first"),
});
export type DispatchBrief = z.infer<typeof DispatchBrief>;

export const RuntimeName = z.enum(["claude-code", "gemini-cli", "raw-api"]);
export type RuntimeName = z.infer<typeof RuntimeName>;

export const DispatchPayload = z.object({
  task_id: z.string().min(1).describe("GitHub issue number as a string"),
  repo: RepoRef,
  brief: DispatchBrief,
  runtime: RuntimeName,
  cost_cap_usd: z
    .number()
    .positive()
    .default(2.0)
    .describe("Hard cap enforced by the runtime adapter — ADR-0007"),
});
export type DispatchPayload = z.infer<typeof DispatchPayload>;

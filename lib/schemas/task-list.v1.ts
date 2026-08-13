/**
 * TaskList.v1 — the ordered decomposition produced from a PRD. Each Task
 * becomes a GitHub Issue and a candidate DispatchPayload target.
 *
 * Effort is a t-shirt size — deliberately coarse. If you need finer estimates
 * you are past the point where an LLM should be estimating.
 *
 * (Aug 2026 exception: loosened `.min(1)` on inner strings and dropped the
 * kebab-case regex on `id` after Gemini Flash occasionally produced ids with
 * underscores/spaces. Normalize to kebab-case at issue-creation time instead
 * of failing the whole generation.)
 */

import { z } from "zod";

export const Effort = z.enum(["S", "M", "L"]);
export type Effort = z.infer<typeof Effort>;

export const Task = z.object({
  id: z
    .string()
    .min(1)
    .describe("Short slug, e.g. 'add-theme-toggle'. Kebab-case preferred; will be normalized"),
  title: z.string().min(1).describe("Imperative title, ≤ 60 chars"),
  description: z
    .string()
    .describe("Two to four sentences on what this task delivers and why"),
  acceptance_criteria: z
    .array(z.string())
    .min(1)
    .describe("Bullet-list of observable outcomes that mark the task done"),
  effort: Effort.describe(
    "T-shirt size: S = <1 day, M = 1-3 days, L = >3 days (needs re-splitting)"
  ),
  depends_on: z
    .array(z.string())
    .default([])
    .describe("IDs of other tasks that must be completed first"),
});
export type Task = z.infer<typeof Task>;

export const TaskList = z.object({
  tasks: z.array(Task).min(1).describe("At least one task"),
});
export type TaskList = z.infer<typeof TaskList>;

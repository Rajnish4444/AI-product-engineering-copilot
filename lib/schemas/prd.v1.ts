/**
 * PRD.v1 — the structured product-requirements-document produced by the PM
 * copilot. Consumed by the artifact viewer, persisted to a GitHub Gist, and
 * used as input to the task-decomposer prompt.
 *
 * Schema is versioned in the filename. Never edit in place — bump to v2.
 * (Aug 2026 exception: loosened `.min(1)` on inner strings after discovering
 * smaller Gemini models occasionally emit empty inner fields under nested-
 * schema pressure. Semantics unchanged — top-level required arrays still
 * require at least one entry.)
 */

import { z } from "zod";

export const UserStory = z.object({
  as_a: z.string().describe("The role or persona this story serves"),
  i_want: z.string().describe("The capability the user is asking for"),
  so_that: z.string().describe("The outcome or reason the capability matters"),
});
export type UserStory = z.infer<typeof UserStory>;

export const AcceptanceCriterion = z.object({
  given: z.string().describe("Preconditions or context"),
  when: z.string().describe("The user action or system event"),
  then: z.string().describe("The observable outcome"),
});
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterion>;

export const PRD = z.object({
  title: z.string().min(1).describe("Short imperative title, e.g. 'Add dark mode to settings'"),
  problem: z
    .string()
    .min(1)
    .describe("The user problem this solves, in one to three sentences"),
  goals: z
    .array(z.string())
    .min(1)
    .describe("Concrete outcomes we want to see after shipping"),
  non_goals: z
    .array(z.string())
    .default([])
    .describe("Explicit scope-limits — what we are choosing not to do"),
  user_stories: z
    .array(UserStory)
    .min(1)
    .describe("At least one user story in the classic As/I want/So that shape"),
  acceptance_criteria: z
    .array(AcceptanceCriterion)
    .min(1)
    .describe("Given/When/Then rows that define done"),
  open_questions: z
    .array(z.string())
    .default([])
    .describe("Things we do not yet know and need to answer before shipping"),
});

export type PRD = z.infer<typeof PRD>;

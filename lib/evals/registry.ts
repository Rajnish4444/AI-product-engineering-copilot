/**
 * Eval registry. Maps a prompt name to its evaluation config: schema, input
 * wrapper (matching what the route/orchestrator would send at runtime), and
 * assertion list.
 *
 * Registered here (statically) rather than discovered on disk so the eval
 * bundle stays tree-shakable and imports are typed.
 */

import { PRD } from "@/lib/schemas/prd.v1";
import type { z } from "zod";
import type { Assertion } from "./types";
import { assertions as prdGeneratorAssertions } from "./prd-generator/assertions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EvalConfig<T extends z.ZodTypeAny = z.ZodTypeAny, E = any> {
  promptName: string;
  promptVersion: number;
  schema: T;
  wrapper: (input: string) => string;
  assertions: Assertion<z.infer<T>, E>[];
}

export const EVAL_REGISTRY: Record<string, EvalConfig> = {
  "prd-generator": {
    promptName: "prd-generator",
    promptVersion: 1,
    schema: PRD,
    wrapper: (input: string) => `<user_input>${input}</user_input>`,
    assertions: prdGeneratorAssertions as Assertion<unknown, unknown>[],
  },
};

export const REGISTERED_PROMPTS = Object.keys(EVAL_REGISTRY);

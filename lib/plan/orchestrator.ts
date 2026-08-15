/**
 * PM copilot orchestrator. Two sequential streaming stages:
 *   1. idea → PRD (streamed as a partial-object stream)
 *   2. PRD  → TaskList (streamed as a partial-object stream)
 *
 * Emits an NDJSON stream of typed events (see PlanEvent). The route handler
 * wraps this in an HTTP response; keeping the logic here makes it callable
 * from evals, tests, and future non-HTTP surfaces without change.
 */

import { getProvider } from "@/lib/providers/registry";
import type { ProviderUsage } from "@/lib/providers";
import { loadPrompt } from "@/lib/prompts/loader";
import { PRD as PRDSchema, type PRD } from "@/lib/schemas/prd.v1";
import { TaskList as TaskListSchema, type TaskList } from "@/lib/schemas/task-list.v1";
import { getCostCaps } from "@/lib/cost/caps";
import { classifyOrchestratorError } from "./errors";

export type PlanInput = {
  idea: string;
  provider?: string;
};

export type PlanEvent =
  | { type: "prd.partial"; data: Partial<PRD> }
  | { type: "prd.complete"; data: PRD; usage: ProviderUsage }
  | { type: "tasks.partial"; data: Partial<TaskList> }
  | { type: "tasks.complete"; data: TaskList; usage: ProviderUsage }
  | {
      type: "session.usage";
      input_tokens: number;
      output_tokens: number;
      estimated_usd: number;
    }
  | { type: "error"; code: string; message: string };

const encoder = new TextEncoder();
function encodeEvent(event: PlanEvent): Uint8Array {
  return encoder.encode(JSON.stringify(event) + "\n");
}

export function streamPlan(input: PlanInput): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (event: PlanEvent) =>
        controller.enqueue(encodeEvent(event));

      try {
        const provider = getProvider(input.provider);
        const caps = getCostCaps();

        const prdPrompt = await loadPrompt("prd-generator", 2);
        const taskPrompt = await loadPrompt("task-decomposer", 2);

        // ---------- Stage 1: PRD ----------
        const prdStream = provider.streamObject({
          system: prdPrompt.system,
          messages: [
            {
              role: "user",
              content: `<user_input>${input.idea}</user_input>`,
            },
          ],
          schema: PRDSchema,
          schemaName: "PRD",
          schemaDescription: "Product requirements document",
          maxTokens: prdPrompt.frontmatter.max_output_tokens,
        });

        for await (const partial of prdStream.partialObjectStream) {
          enqueue({ type: "prd.partial", data: partial as Partial<PRD> });
        }
        const prd = await prdStream.object;
        const prdUsage = await prdStream.usage;
        enqueue({ type: "prd.complete", data: prd, usage: prdUsage });

        // ---------- Cost gate before stage 2 ----------
        if (prdUsage.totalTokens > caps.sessionTokens) {
          enqueue({
            type: "error",
            code: "session_cap_reached",
            message: `Session token cap (${caps.sessionTokens}) reached after PRD generation. Halting before task decomposition.`,
          });
          controller.close();
          return;
        }

        // ---------- Stage 2: TaskList ----------
        const taskStream = provider.streamObject({
          system: taskPrompt.system,
          messages: [
            {
              role: "user",
              content: `<prd>${JSON.stringify(prd)}</prd>\n<user_context>${input.idea}</user_context>`,
            },
          ],
          schema: TaskListSchema,
          schemaName: "TaskList",
          schemaDescription: "Ordered engineering task decomposition",
          maxTokens: taskPrompt.frontmatter.max_output_tokens,
        });

        for await (const partial of taskStream.partialObjectStream) {
          enqueue({
            type: "tasks.partial",
            data: partial as Partial<TaskList>,
          });
        }
        const tasks = await taskStream.object;
        const tasksUsage = await taskStream.usage;
        enqueue({ type: "tasks.complete", data: tasks, usage: tasksUsage });

        enqueue({
          type: "session.usage",
          input_tokens: prdUsage.inputTokens + tasksUsage.inputTokens,
          output_tokens: prdUsage.outputTokens + tasksUsage.outputTokens,
          estimated_usd: prdUsage.estimatedUsd + tasksUsage.estimatedUsd,
        });

        controller.close();
      } catch (err) {
        const { code, message } = classifyOrchestratorError(err);
        enqueue({ type: "error", code, message });
        controller.close();
      }
    },
  });
}

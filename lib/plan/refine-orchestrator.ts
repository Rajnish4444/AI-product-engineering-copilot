/**
 * Refinement orchestrator. Single-stage streaming: given a current PRD or
 * TaskList and a user feedback string, produce an updated version streamed
 * as the same PlanEvent NDJSON shape used by streamPlan.
 *
 * The client handles the state transition (only prd or only tasks fires,
 * not both) so a refine feels like an in-place update rather than a
 * fresh generation.
 */

import { getProvider } from "@/lib/providers/registry";
import type { ProviderUsage } from "@/lib/providers";
import { loadPrompt } from "@/lib/prompts/loader";
import { PRD as PRDSchema, type PRD } from "@/lib/schemas/prd.v1";
import {
  TaskList as TaskListSchema,
  type TaskList,
} from "@/lib/schemas/task-list.v1";
import type { PlanEvent } from "./orchestrator";
import { classifyOrchestratorError } from "./errors";

export type RefineTarget = "prd" | "tasks";

export interface RefineInput {
  target: RefineTarget;
  feedback: string;
  currentPrd?: PRD | null;
  currentTasks?: TaskList | null;
  provider?: string;
}

const encoder = new TextEncoder();
function encodeEvent(event: PlanEvent): Uint8Array {
  return encoder.encode(JSON.stringify(event) + "\n");
}

function emitUsage(usage: ProviderUsage): PlanEvent {
  return {
    type: "session.usage",
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    estimated_usd: usage.estimatedUsd,
  };
}

export function streamRefine(input: RefineInput): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (event: PlanEvent) =>
        controller.enqueue(encodeEvent(event));

      try {
        const provider = getProvider(input.provider);

        if (input.target === "prd") {
          if (!input.currentPrd) {
            enqueue({
              type: "error",
              code: "no_current_prd",
              message: "Cannot refine: no current PRD was provided.",
            });
            controller.close();
            return;
          }

          const prompt = await loadPrompt("prd-refiner", 1);
          const stream = provider.streamObject({
            system: prompt.system,
            messages: [
              {
                role: "user",
                content: `<current_prd>${JSON.stringify(input.currentPrd)}</current_prd>\n<feedback>${input.feedback}</feedback>`,
              },
            ],
            schema: PRDSchema,
            schemaName: "PRD",
            schemaDescription: "Refined product requirements document",
            maxTokens: prompt.frontmatter.max_output_tokens,
          });

          for await (const partial of stream.partialObjectStream) {
            enqueue({ type: "prd.partial", data: partial as Partial<PRD> });
          }
          const object = await stream.object;
          const usage = await stream.usage;
          enqueue({ type: "prd.complete", data: object, usage });
          enqueue(emitUsage(usage));
        } else {
          if (!input.currentTasks) {
            enqueue({
              type: "error",
              code: "no_current_tasks",
              message: "Cannot refine: no current task list was provided.",
            });
            controller.close();
            return;
          }

          const prompt = await loadPrompt("task-list-refiner", 1);
          const prdBlock = input.currentPrd
            ? `<prd>${JSON.stringify(input.currentPrd)}</prd>\n`
            : "";
          const stream = provider.streamObject({
            system: prompt.system,
            messages: [
              {
                role: "user",
                content: `${prdBlock}<current_tasks>${JSON.stringify(input.currentTasks)}</current_tasks>\n<feedback>${input.feedback}</feedback>`,
              },
            ],
            schema: TaskListSchema,
            schemaName: "TaskList",
            schemaDescription: "Refined engineering task decomposition",
            maxTokens: prompt.frontmatter.max_output_tokens,
          });

          for await (const partial of stream.partialObjectStream) {
            enqueue({
              type: "tasks.partial",
              data: partial as Partial<TaskList>,
            });
          }
          const object = await stream.object;
          const usage = await stream.usage;
          enqueue({ type: "tasks.complete", data: object, usage });
          enqueue(emitUsage(usage));
        }

        controller.close();
      } catch (err) {
        const { code, message } = classifyOrchestratorError(err);
        enqueue({ type: "error", code, message });
        controller.close();
      }
    },
  });
}

/**
 * ModelProvider — the abstraction seam for every LLM call in BuildPilot.
 *
 * Feature code depends only on this interface. Concrete adapters live in the
 * sibling files (anthropic.ts, google.ts, github-models.ts). Selection is
 * driven by lib/providers/registry.ts.
 *
 * See docs/adr/0002-multi-provider-model-abstraction.md.
 */

import type { CoreMessage } from "ai";
import type { z } from "zod";

export interface ChatCall {
  system?: string;
  messages: CoreMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ObjectCall<T extends z.ZodTypeAny> extends ChatCall {
  schema: T;
  schemaName?: string;
  schemaDescription?: string;
}

export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedUsd: number;
}

export interface StreamTextResult {
  textStream: AsyncIterable<string>;
  usage: Promise<ProviderUsage>;
}

export interface StreamObjectResult<T> {
  partialObjectStream: AsyncIterable<Partial<T>>;
  object: Promise<T>;
  usage: Promise<ProviderUsage>;
}

export interface GenerateObjectResult<T> {
  object: T;
  usage: ProviderUsage;
}

export interface ModelProvider {
  readonly name: string;
  /** Default model for interactive PM-side calls. */
  readonly defaultModel: string;
  /** Cheap model used for evals and fallback under cost pressure. */
  readonly cheapModel: string;

  streamText(call: ChatCall): StreamTextResult;

  generateObject<T extends z.ZodTypeAny>(
    call: ObjectCall<T>
  ): Promise<GenerateObjectResult<z.infer<T>>>;

  streamObject<T extends z.ZodTypeAny>(
    call: ObjectCall<T>
  ): StreamObjectResult<z.infer<T>>;

  estimateCost(model: string, inputTokens: number, outputTokens: number): number;
}

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

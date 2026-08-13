/**
 * GitHub Models adapter for the ModelProvider interface.
 *
 * GitHub Models exposes an OpenAI-compatible endpoint at
 * https://models.github.ai/inference. We route through @ai-sdk/openai with a
 * custom baseURL. Authentication uses either GITHUB_MODELS_TOKEN or, as a
 * convenience for local dev, a PAT with `models:read` scope in GITHUB_TOKEN.
 *
 * The free tier is real but rate-limited (~150 premium-model requests/day at
 * time of writing). Suitable for a demo; not for production.
 */

import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText as aiStreamText,
  streamObject as aiStreamObject,
  generateObject as aiGenerateObject,
} from "ai";
import type { z } from "zod";
import type {
  ChatCall,
  GenerateObjectResult,
  ModelProvider,
  ObjectCall,
  ProviderUsage,
  StreamObjectResult,
  StreamTextResult,
} from "./index";
import { ProviderConfigError } from "./index";
import { estimateCost as priceEstimate } from "./pricing";

const BASE_URL = "https://models.github.ai/inference";
const DEFAULT_MODEL = "openai/gpt-4o";
const CHEAP_MODEL = "openai/gpt-4o-mini";

function client() {
  const apiKey = process.env.GITHUB_MODELS_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!apiKey) {
    throw new ProviderConfigError(
      "Neither GITHUB_MODELS_TOKEN nor GITHUB_TOKEN is set. Create a PAT with models:read scope."
    );
  }
  return createOpenAI({ apiKey, baseURL: BASE_URL });
}

function toUsage(
  model: string,
  raw: { promptTokens: number; completionTokens: number; totalTokens: number }
): ProviderUsage {
  return {
    inputTokens: raw.promptTokens,
    outputTokens: raw.completionTokens,
    totalTokens: raw.totalTokens,
    estimatedUsd: priceEstimate(model, raw.promptTokens, raw.completionTokens),
  };
}

export const githubModels: ModelProvider = {
  name: "github-models",
  defaultModel: DEFAULT_MODEL,
  cheapModel: CHEAP_MODEL,

  streamText(call: ChatCall): StreamTextResult {
    const model = call.model ?? DEFAULT_MODEL;
    const result = aiStreamText({
      model: client()(model),
      system: call.system,
      messages: call.messages,
      maxTokens: call.maxTokens,
      temperature: call.temperature,
    });
    return {
      textStream: result.textStream,
      usage: result.usage.then((u) => toUsage(model, u)),
    };
  },

  async generateObject<T extends z.ZodTypeAny>(
    call: ObjectCall<T>
  ): Promise<GenerateObjectResult<z.infer<T>>> {
    const model = call.model ?? DEFAULT_MODEL;
    const result = await aiGenerateObject({
      model: client()(model),
      schema: call.schema,
      schemaName: call.schemaName,
      schemaDescription: call.schemaDescription,
      system: call.system,
      messages: call.messages,
      maxTokens: call.maxTokens,
      temperature: call.temperature,
    });
    return {
      object: result.object,
      usage: toUsage(model, result.usage),
    };
  },

  streamObject<T extends z.ZodTypeAny>(
    call: ObjectCall<T>
  ): StreamObjectResult<z.infer<T>> {
    const model = call.model ?? DEFAULT_MODEL;
    const result = aiStreamObject({
      model: client()(model),
      schema: call.schema,
      schemaName: call.schemaName,
      schemaDescription: call.schemaDescription,
      system: call.system,
      messages: call.messages,
      maxTokens: call.maxTokens,
      temperature: call.temperature,
    });
    return {
      partialObjectStream: result.partialObjectStream,
      object: result.object,
      usage: result.usage.then((u) => toUsage(model, u)),
    };
  },

  estimateCost(model, inputTokens, outputTokens) {
    return priceEstimate(model, inputTokens, outputTokens);
  },
};

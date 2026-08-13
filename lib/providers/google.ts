/**
 * Google (Gemini) adapter for the ModelProvider interface.
 *
 * Uses @ai-sdk/google. Gemini 2.5 Pro is the default; Flash is the cheap-tier
 * fallback. Google's free tier is generous for a portfolio demo — see
 * docs/runbook.md for how to obtain a key.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
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

const DEFAULT_MODEL = "gemini-2.5-pro";
const CHEAP_MODEL = "gemini-2.5-flash";

function client() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new ProviderConfigError(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Configure it in .env.local (see docs/runbook.md)."
    );
  }
  return createGoogleGenerativeAI({ apiKey });
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

export const google: ModelProvider = {
  name: "google",
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

/**
 * Client-side reader for the /api/plan NDJSON stream. Turns the HTTP response
 * into an async iterator of typed PlanEvents so the UI can render as-they-arrive.
 */

import type { PlanEvent } from "./orchestrator";

export interface PlanRequest {
  idea: string;
  provider?: string;
}

export async function* streamPlan(
  input: PlanRequest,
  signal?: AbortSignal
): AsyncGenerator<PlanEvent> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Plan request failed (${res.status}): ${body || res.statusText}`
    );
  }
  if (!res.body) {
    throw new Error("Response has no body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) continue;
        try {
          yield JSON.parse(line) as PlanEvent;
        } catch {
          console.warn("[plan-reader] malformed event:", line);
        }
      }
    }
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer) as PlanEvent;
      } catch {
        // trailing incomplete line — drop it
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Shared types for the eval harness. See ADR-0008 and docs/eval-strategy.md.
 */

import type { ProviderUsage } from "@/lib/providers";

export interface GoldenRow<E = Record<string, unknown>> {
  id: string;
  input: string;
  expected: E;
}

export interface AssertionResult {
  passed: boolean;
  reason?: string;
}

export interface AssertionCtx<T, E> {
  output: T;
  row: GoldenRow<E>;
}

export type Assertion<T, E = Record<string, unknown>> = (
  ctx: AssertionCtx<T, E>
) => AssertionResult;

export function pass(): AssertionResult {
  return { passed: true };
}

export function fail(reason: string): AssertionResult {
  return { passed: false, reason };
}

export interface RowResult {
  id: string;
  passed: boolean;
  failures: string[];
  usage: ProviderUsage;
  durationMs: number;
}

export interface EvalReport {
  prompt: string;
  provider: string;
  model: string;
  totalRows: number;
  passedRows: number;
  totalCostUsd: number;
  rows: RowResult[];
}

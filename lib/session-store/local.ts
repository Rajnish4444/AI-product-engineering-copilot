/**
 * Client-only session store backed by localStorage.
 *
 * Per ADR-0001 we own no infrastructure. Sessions live in the user's browser
 * for now; a v1.1 upgrade path syncs them to a private Gist once the user
 * signs in with GitHub (see docs/roadmap.md).
 *
 * All functions are safe to call during SSR — they no-op when `window` is
 * undefined and return sensible empties.
 */

import type { PRD } from "@/lib/schemas/prd.v1";
import type { TaskList } from "@/lib/schemas/task-list.v1";

export const STORAGE_KEY = "buildpilot.sessions.v1";
export const MAX_SESSIONS = 25;

export type SessionStatus =
  | "idle"
  | "generating_prd"
  | "generating_tasks"
  | "done"
  | "error";

export interface StoredSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  idea: string;
  provider: string | null;
  status: SessionStatus;
  prd: PRD | null;
  tasks: TaskList | null;
  cost: { input: number; output: number; usd: number };
  error: string | null;
}

function safeGet(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredSession[]) : [];
  } catch {
    return [];
  }
}

function safeSet(sessions: StoredSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // quota exceeded or private-mode block — silently ignore
  }
}

export function listSessions(): StoredSession[] {
  // Store is maintained newest-first by saveSession, so no re-sort here.
  return safeGet();
}

export function getSession(id: string): StoredSession | null {
  return safeGet().find((s) => s.id === id) ?? null;
}

export function saveSession(session: StoredSession): void {
  const now = new Date().toISOString();
  const updated: StoredSession = {
    ...session,
    updatedAt: now,
    createdAt: session.createdAt || now,
  };
  const current = safeGet();
  const existingIdx = current.findIndex((s) => s.id === session.id);
  if (existingIdx >= 0) {
    current.splice(existingIdx, 1);
  }
  current.unshift(updated);
  if (current.length > MAX_SESSIONS) current.length = MAX_SESSIONS;
  safeSet(current);
}

export function deleteSession(id: string): void {
  safeSet(safeGet().filter((s) => s.id !== id));
}

export function clearAllSessions(): void {
  safeSet([]);
}

export function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Short human-readable label for the session list. */
export function summarizeIdea(idea: string, max = 60): string {
  const first = idea.replace(/\s+/g, " ").trim();
  if (first.length <= max) return first;
  return first.slice(0, max - 1).trimEnd() + "…";
}

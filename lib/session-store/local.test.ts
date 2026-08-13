import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  STORAGE_KEY,
  MAX_SESSIONS,
  listSessions,
  saveSession,
  getSession,
  deleteSession,
  clearAllSessions,
  generateSessionId,
  summarizeIdea,
  type StoredSession,
} from "./local";

class MockStorage {
  store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
}

function makeSession(id: string, minutesAgo = 0): StoredSession {
  const t = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return {
    id,
    createdAt: t,
    updatedAt: t,
    idea: `idea ${id}`,
    provider: "google",
    status: "done",
    prd: null,
    tasks: null,
    cost: { input: 0, output: 0, usd: 0 },
    error: null,
  };
}

describe("session-store/local", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: new MockStorage() });
  });

  it("returns empty list when storage is empty", () => {
    expect(listSessions()).toEqual([]);
  });

  it("saves a new session and reads it back", () => {
    saveSession(makeSession("a"));
    const list = listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("a");
  });

  it("updates in-place when the id matches", () => {
    saveSession({ ...makeSession("a"), idea: "first" });
    saveSession({ ...makeSession("a"), idea: "second" });
    const list = listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].idea).toBe("second");
  });

  it("sorts sessions newest first by updatedAt", () => {
    saveSession(makeSession("old", 60));
    saveSession(makeSession("new", 0));
    const list = listSessions();
    expect(list.map((s) => s.id)).toEqual(["new", "old"]);
  });

  it("evicts oldest when exceeding MAX_SESSIONS", () => {
    for (let i = 0; i < MAX_SESSIONS + 3; i++) {
      saveSession(makeSession(`s${i}`, MAX_SESSIONS + 3 - i));
    }
    expect(listSessions()).toHaveLength(MAX_SESSIONS);
  });

  it("getSession returns null for unknown id", () => {
    saveSession(makeSession("a"));
    expect(getSession("nope")).toBeNull();
  });

  it("deleteSession removes only the matching id", () => {
    saveSession(makeSession("a"));
    saveSession(makeSession("b"));
    deleteSession("a");
    const remaining = listSessions().map((s) => s.id);
    expect(remaining).toEqual(["b"]);
  });

  it("clearAllSessions empties the store", () => {
    saveSession(makeSession("a"));
    saveSession(makeSession("b"));
    clearAllSessions();
    expect(listSessions()).toEqual([]);
  });

  it("survives corrupt JSON in storage", () => {
    (window.localStorage as unknown as MockStorage).setItem(STORAGE_KEY, "{not-json");
    expect(listSessions()).toEqual([]);
  });

  it("survives non-array JSON in storage", () => {
    (window.localStorage as unknown as MockStorage).setItem(
      STORAGE_KEY,
      JSON.stringify({ id: "x" })
    );
    expect(listSessions()).toEqual([]);
  });

  it("generateSessionId returns a non-empty unique-ish id", () => {
    const a = generateSessionId();
    const b = generateSessionId();
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });

  it("summarizeIdea truncates with an ellipsis", () => {
    const long = "x".repeat(200);
    const short = summarizeIdea(long, 40);
    expect(short.length).toBe(40);
    expect(short.endsWith("…")).toBe(true);
  });

  it("summarizeIdea leaves short ideas intact", () => {
    expect(summarizeIdea("short idea", 60)).toBe("short idea");
  });

  it("collapses internal whitespace before truncating", () => {
    expect(summarizeIdea("  multi\n\n line   idea  ")).toBe("multi line idea");
  });
});

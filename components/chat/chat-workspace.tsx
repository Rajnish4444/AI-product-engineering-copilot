"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PRD } from "@/lib/schemas/prd.v1";
import type { TaskList } from "@/lib/schemas/task-list.v1";
import { streamPlan, streamRefine } from "@/lib/plan/client-reader";
import {
  generateSessionId,
  getSession,
  saveSession,
  summarizeIdea,
  type StoredSession,
} from "@/lib/session-store/local";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ChatPane } from "./chat-pane";
import { ArtifactViewer } from "./artifact-viewer";

export type PlanStatus =
  | "idle"
  | "generating_prd"
  | "generating_tasks"
  | "done"
  | "error";

export type ActiveOp = null | "plan" | "refine_prd" | "refine_tasks";

const emptyCost = { input: 0, output: 0, usd: 0 };
const DEFAULT_PROVIDER = "google";
const DEFAULT_MODEL = "gemini-2.5-flash";

export function ChatWorkspace() {
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const [idea, setIdea] = useState("");
  const [prd, setPrd] = useState<Partial<PRD> | null>(null);
  const [tasks, setTasks] = useState<Partial<TaskList> | null>(null);
  const [status, setStatus] = useState<PlanStatus>("idle");
  const [cost, setCost] = useState(emptyCost);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeOp, setActiveOp] = useState<ActiveOp>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Persist a snapshot whenever meaningful state changes.
  useEffect(() => {
    if (!idea.trim() && !prd && !tasks) return;
    const snapshot: StoredSession = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      idea,
      provider: DEFAULT_PROVIDER,
      status,
      prd: (prd as PRD | null) ?? null,
      tasks: (tasks as TaskList | null) ?? null,
      cost,
      error,
    };
    saveSession(snapshot);
    setRefreshKey((k) => k + 1);
  }, [sessionId, idea, prd, tasks, status, cost, error]);

  const handleNew = useCallback(() => {
    abortRef.current?.abort();
    setSessionId(generateSessionId());
    setIdea("");
    setPrd(null);
    setTasks(null);
    setCost(emptyCost);
    setError(null);
    setStatus("idle");
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    const session = getSession(id);
    if (!session) return;
    abortRef.current?.abort();
    setSessionId(session.id);
    setIdea(session.idea);
    setPrd(session.prd);
    setTasks(session.tasks);
    setCost(session.cost);
    setError(session.error);
    setStatus(session.status);
  }, []);

  const handleSubmit = useCallback(async () => {
    setPrd(null);
    setTasks(null);
    setCost(emptyCost);
    setError(null);
    setStatus("generating_prd");
    setActiveOp("plan");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of streamPlan({ idea }, controller.signal)) {
        switch (event.type) {
          case "prd.partial":
            setPrd(event.data);
            break;
          case "prd.complete":
            setPrd(event.data);
            setStatus("generating_tasks");
            break;
          case "tasks.partial":
            setTasks(event.data);
            break;
          case "tasks.complete":
            setTasks(event.data);
            setStatus("done");
            break;
          case "session.usage":
            setCost((prev) => ({
              input: prev.input + event.input_tokens,
              output: prev.output + event.output_tokens,
              usd: prev.usd + event.estimated_usd,
            }));
            break;
          case "error":
            setError(event.message);
            setStatus("error");
            break;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus("idle");
        setActiveOp(null);
        return;
      }
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    } finally {
      abortRef.current = null;
      setActiveOp(null);
    }
  }, [idea]);

  const handleRefinePrd = useCallback(
    async (feedback: string) => {
      if (!prd) return;
      setError(null);
      setStatus("generating_prd");
      setActiveOp("refine_prd");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const event of streamRefine(
          { target: "prd", feedback, currentPrd: prd as PRD },
          controller.signal
        )) {
          switch (event.type) {
            case "prd.partial":
              setPrd(event.data);
              break;
            case "prd.complete":
              setPrd(event.data);
              setStatus(tasks ? "done" : "done");
              break;
            case "session.usage":
              setCost((prev) => ({
                input: prev.input + event.input_tokens,
                output: prev.output + event.output_tokens,
                usd: prev.usd + event.estimated_usd,
              }));
              break;
            case "error":
              setError(event.message);
              setStatus("error");
              break;
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus("done");
          setActiveOp(null);
          return;
        }
        setError(err instanceof Error ? err.message : "Network error");
        setStatus("error");
      } finally {
        abortRef.current = null;
        setActiveOp(null);
      }
    },
    [prd, tasks]
  );

  const handleRefineTasks = useCallback(
    async (feedback: string) => {
      if (!tasks) return;
      setError(null);
      setStatus("generating_tasks");
      setActiveOp("refine_tasks");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const event of streamRefine(
          {
            target: "tasks",
            feedback,
            currentPrd: (prd as PRD) ?? null,
            currentTasks: tasks as TaskList,
          },
          controller.signal
        )) {
          switch (event.type) {
            case "tasks.partial":
              setTasks(event.data);
              break;
            case "tasks.complete":
              setTasks(event.data);
              setStatus("done");
              break;
            case "session.usage":
              setCost((prev) => ({
                input: prev.input + event.input_tokens,
                output: prev.output + event.output_tokens,
                usd: prev.usd + event.estimated_usd,
              }));
              break;
            case "error":
              setError(event.message);
              setStatus("error");
              break;
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus("done");
          setActiveOp(null);
          return;
        }
        setError(err instanceof Error ? err.message : "Network error");
        setStatus("error");
      } finally {
        abortRef.current = null;
        setActiveOp(null);
      }
    },
    [prd, tasks]
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar
        activeSessionId={sessionId}
        onSelect={handleSelectSession}
        onNew={handleNew}
        refreshKey={refreshKey}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          provider={DEFAULT_PROVIDER}
          model={DEFAULT_MODEL}
          cost={cost}
          ideaSummary={summarizeIdea(idea, 60)}
        />
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[minmax(360px,1fr)_2fr]">
          <ChatPane
            idea={idea}
            setIdea={setIdea}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            status={status}
            error={error}
          />
          <ArtifactViewer
            prd={prd}
            tasks={tasks}
            status={status}
            activeOp={activeOp}
            onRefinePrd={handleRefinePrd}
            onRefineTasks={handleRefineTasks}
            onCancelRefine={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}

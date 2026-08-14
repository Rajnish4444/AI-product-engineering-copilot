"use client";

import { useCallback, useRef, useState } from "react";
import type { PRD } from "@/lib/schemas/prd.v1";
import type { TaskList } from "@/lib/schemas/task-list.v1";
import { streamPlan } from "@/lib/plan/client-reader";
import { ChatPane } from "./chat-pane";
import { ArtifactViewer } from "./artifact-viewer";

export type PlanStatus =
  | "idle"
  | "generating_prd"
  | "generating_tasks"
  | "done"
  | "error";

const emptyCost = { input: 0, output: 0, usd: 0 };

export function ChatWorkspace() {
  const [idea, setIdea] = useState("");
  const [prd, setPrd] = useState<Partial<PRD> | null>(null);
  const [tasks, setTasks] = useState<Partial<TaskList> | null>(null);
  const [status, setStatus] = useState<PlanStatus>("idle");
  const [cost, setCost] = useState(emptyCost);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async () => {
    setPrd(null);
    setTasks(null);
    setCost(emptyCost);
    setError(null);
    setStatus("generating_prd");

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
            setCost({
              input: event.input_tokens,
              output: event.output_tokens,
              usd: event.estimated_usd,
            });
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
        return;
      }
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }, [idea]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <main className="mx-auto grid min-h-dvh max-w-7xl grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(360px,1fr)_2fr]">
      <ChatPane
        idea={idea}
        setIdea={setIdea}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        status={status}
        cost={cost}
        error={error}
      />
      <ArtifactViewer prd={prd} tasks={tasks} status={status} />
    </main>
  );
}

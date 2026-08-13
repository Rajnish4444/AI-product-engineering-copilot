"use client";

import { Sparkles, GitPullRequest } from "lucide-react";
import type { PRD } from "@/lib/schemas/prd.v1";
import type { TaskList } from "@/lib/schemas/task-list.v1";
import { PrdCard } from "./prd-card";
import { TaskListCard } from "./task-list-card";
import type { PlanStatus } from "./chat-workspace";

interface Props {
  prd: Partial<PRD> | null;
  tasks: Partial<TaskList> | null;
  status: PlanStatus;
}

export function ArtifactViewer({ prd, tasks, status }: Props) {
  if (!prd && status === "idle") return <EmptyState />;

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-y-auto pb-6 lg:pr-1">
      {prd && <PrdCard prd={prd} streaming={status === "generating_prd"} />}
      {tasks && (
        <TaskListCard
          tasks={tasks}
          streaming={status === "generating_tasks"}
        />
      )}
      {status === "done" && (
        <div className="flex gap-3 rounded-md border border-border/50 bg-muted/20 p-4 text-sm">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <GitPullRequest className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground">
            <strong className="text-foreground">Next step:</strong> pick a
            target repo and click Dispatch to open PRs for these tasks. The
            dispatch flow requires a live GitHub App installation — see{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              docs/runbook.md
            </code>{" "}
            for the setup, or use{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /api/dispatch
            </code>{" "}
            directly.
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/50 p-16 text-center">
      <div className="rounded-full bg-primary/10 p-3">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="font-medium">Your artifacts appear here</p>
        <p className="text-sm text-muted-foreground">
          Paste a feature idea in the panel on the left. The PRD and task list
          stream in as they&apos;re written.
        </p>
      </div>
    </div>
  );
}

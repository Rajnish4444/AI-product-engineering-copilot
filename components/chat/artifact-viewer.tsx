"use client";

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
    <div className="flex flex-col gap-4 overflow-y-auto pb-6">
      {prd && (
        <PrdCard prd={prd} streaming={status === "generating_prd"} />
      )}
      {tasks && (
        <TaskListCard
          tasks={tasks}
          streaming={status === "generating_tasks"}
        />
      )}
      {status === "done" && (
        <div className="rounded-md border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
          <p>
            <strong>Next step (Phase 7 stub):</strong> pick a target repo
            installation and click &ldquo;Dispatch&rdquo; to open PRs for these
            tasks. That flow lands once the GitHub App is installed against a
            live repo — see docs/runbook.md.
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/50 p-16 text-center text-sm text-muted-foreground">
      Your PRD and task list will stream in here.
    </div>
  );
}

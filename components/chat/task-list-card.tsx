"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./copy-button";
import { RefineInput } from "./refine-input";
import { taskListToMarkdown } from "@/lib/plan/task-list-to-markdown";
import type { TaskList, Task, Effort } from "@/lib/schemas/task-list.v1";

interface Props {
  tasks: Partial<TaskList>;
  streaming: boolean;
  busy: boolean;
  isRefiningThis: boolean;
  onRefine: (feedback: string) => void;
  onCancelRefine: () => void;
}

const effortLabel: Record<Effort, string> = {
  S: "S · <1 day",
  M: "M · 1–3 days",
  L: "L · split further",
};

const effortVariant: Record<Effort, "secondary" | "default" | "destructive"> = {
  S: "secondary",
  M: "default",
  L: "destructive",
};

function countEfforts(list: (Task | undefined)[]): { S: number; M: number; L: number } {
  const c = { S: 0, M: 0, L: 0 } as { S: number; M: number; L: number };
  for (const t of list) {
    if (t?.effort) c[t.effort]++;
  }
  return c;
}

export function TaskListCard({
  tasks,
  streaming,
  busy,
  isRefiningThis,
  onRefine,
  onCancelRefine,
}: Props) {
  const list = (tasks.tasks ?? []) as (Task | undefined)[];
  const efforts = countEfforts(list);

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <span>Engineering tasks</span>
              {streaming && <PulseDot />}
              {!streaming && list.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {list.length} tasks
                </span>
              )}
            </CardTitle>
            {!streaming && list.length > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Effort:</span>
                <EffortPill effort="S" count={efforts.S} />
                <EffortPill effort="M" count={efforts.M} />
                <EffortPill effort="L" count={efforts.L} />
              </div>
            )}
          </div>
          {!streaming && list.length > 0 && (
            <CopyButton
              text={taskListToMarkdown(tasks)}
              label="Copy Markdown"
              className="shrink-0"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {list.map((task, i) => {
          const effort = task?.effort as Effort | undefined;
          return (
            <div
              key={task?.id ?? i}
              className="rounded-md border border-border/50 bg-muted/20 p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {task?.id ?? `task-${i}`}
                  </div>
                  <div className="mt-0.5 font-medium">
                    {task?.title || "Drafting…"}
                  </div>
                </div>
                {effort && (
                  <Badge variant={effortVariant[effort]} className="shrink-0">
                    {effortLabel[effort]}
                  </Badge>
                )}
              </div>
              {task?.description && (
                <p className="mb-2 text-muted-foreground">{task.description}</p>
              )}
              {task?.acceptance_criteria &&
                task.acceptance_criteria.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {task.acceptance_criteria.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                )}
              {task?.depends_on && task.depends_on.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <span>Depends on:</span>
                  {task.depends_on.map((d, j) => (
                    <code
                      key={j}
                      className="rounded bg-muted px-1 py-0.5 text-[10px]"
                    >
                      {d}
                    </code>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!streaming && list.length > 0 && (
          <RefineInput
            onSubmit={onRefine}
            onCancel={onCancelRefine}
            busy={busy}
            isRefiningThis={isRefiningThis}
            label="Refine tasks"
            placeholder="Tell it what to change. e.g. 'split the auth task' or 'reduce the export task to M'."
          />
        )}
      </CardContent>
    </Card>
  );
}

function EffortPill({ effort, count }: { effort: Effort; count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
      <span className="font-semibold">{count}</span>
      <span className="text-muted-foreground">{effort}</span>
    </span>
  );
}

function PulseDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TaskList, Effort } from "@/lib/schemas/task-list.v1";

interface Props {
  tasks: Partial<TaskList>;
  streaming: boolean;
}

const effortLabel: Record<Effort, string> = {
  S: "S · <1 day",
  M: "M · 1-3 days",
  L: "L · needs split",
};

const effortVariant: Record<Effort, "secondary" | "default" | "destructive"> = {
  S: "secondary",
  M: "default",
  L: "destructive",
};

export function TaskListCard({ tasks, streaming }: Props) {
  const list = tasks.tasks ?? [];
  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Engineering tasks</span>
          {streaming && (
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
          {!streaming && list.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {list.length} tasks
            </span>
          )}
        </CardTitle>
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
                <div>
                  <div className="text-xs text-muted-foreground">
                    {task?.id ?? `task-${i}`}
                  </div>
                  <div className="font-medium">
                    {task?.title || "Drafting..."}
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
                <div className="mt-2 text-xs text-muted-foreground">
                  Depends on:{" "}
                  {task.depends_on.map((d, j) => (
                    <code
                      key={j}
                      className="mr-1 rounded bg-muted px-1 py-0.5"
                    >
                      {d}
                    </code>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

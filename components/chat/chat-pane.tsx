"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { PlanStatus } from "./chat-workspace";

interface Props {
  idea: string;
  setIdea: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  status: PlanStatus;
  cost: { input: number; output: number; usd: number };
  error: string | null;
}

const STATUS_LABEL: Record<PlanStatus, string> = {
  idle: "Idle",
  generating_prd: "Streaming PRD",
  generating_tasks: "Decomposing tasks",
  done: "Ready",
  error: "Error",
};

export function ChatPane({
  idea,
  setIdea,
  onSubmit,
  onCancel,
  status,
  cost,
  error,
}: Props) {
  const busy = status === "generating_prd" || status === "generating_tasks";

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">BuildPilot</h1>
        <p className="text-sm text-muted-foreground">
          Paste a rough idea. Watch a PRD and engineering task list stream out.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. Add dark mode to our settings page, with a toggle that persists per user..."
          rows={7}
          disabled={busy}
        />
        <div className="flex items-center gap-3">
          {busy ? (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={idea.trim().length === 0}
            >
              Generate plan
            </Button>
          )}
          <Badge
            variant={
              status === "error"
                ? "destructive"
                : status === "done"
                ? "default"
                : "secondary"
            }
          >
            {STATUS_LABEL[status]}
          </Badge>
        </div>
      </div>

      {(cost.usd > 0 || busy) && (
        <div className="text-xs text-muted-foreground">
          Session: ${cost.usd.toFixed(4)} · {cost.input.toLocaleString()} in ·{" "}
          {cost.output.toLocaleString()} out
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-auto space-y-2 text-xs text-muted-foreground">
        <p>
          <strong>How this works.</strong> Your idea streams through the PM
          copilot (structured PRD.v1 output), then feeds the task decomposer
          (TaskList.v1). Both use the ModelProvider abstraction — swap
          providers via the BUILDPILOT_PROVIDER env var.
        </p>
      </div>
    </div>
  );
}

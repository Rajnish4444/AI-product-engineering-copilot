"use client";

import { useEffect, useRef } from "react";
import { Send, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SuggestedPrompts } from "./suggested-prompts";
import type { PlanStatus } from "./chat-workspace";

interface Props {
  idea: string;
  setIdea: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  status: PlanStatus;
  error: string | null;
}

const STATUS_LABEL: Record<PlanStatus, string> = {
  idle: "Ready",
  generating_prd: "Streaming PRD",
  generating_tasks: "Decomposing tasks",
  done: "Complete",
  error: "Error",
};

export function ChatPane({
  idea,
  setIdea,
  onSubmit,
  onCancel,
  status,
  error,
}: Props) {
  const busy = status === "generating_prd" || status === "generating_tasks";
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === "Enter" &&
      (e.metaKey || e.ctrlKey) &&
      !busy &&
      idea.trim().length > 0
    ) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === "Escape" && busy) {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold">Your idea</h2>
          <Badge
            variant={
              status === "error"
                ? "destructive"
                : status === "done"
                  ? "default"
                  : "secondary"
            }
            className="text-xs"
          >
            {STATUS_LABEL[status]}
          </Badge>
        </div>
        <Textarea
          ref={inputRef}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste a rough feature idea — a sentence or a paragraph. The PM copilot will turn it into a structured PRD, then break it into engineering tasks."
          rows={5}
          disabled={busy}
          className="resize-none"
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 text-[10px]">
              ⌘/Ctrl + Enter
            </kbd>{" "}
            to send ·{" "}
            <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 text-[10px]">
              Esc
            </kbd>{" "}
            to cancel
          </span>
          {busy ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={idea.trim().length === 0}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Generate plan
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {status === "idle" && !idea.trim() && (
        <SuggestedPrompts onPick={setIdea} />
      )}

      <div className="mt-auto space-y-2 border-t border-border/50 pt-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">How this works.</strong> Your
          idea flows through the PM copilot ({" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            PRD.v1
          </code>{" "}
          structured output), then the task decomposer (
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            TaskList.v1
          </code>
          ). Both use the ModelProvider abstraction — swap providers with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            BUILDPILOT_PROVIDER
          </code>
          .
        </p>
      </div>
    </div>
  );
}

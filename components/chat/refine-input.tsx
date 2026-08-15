"use client";

import { useState } from "react";
import { Send, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSubmit: (feedback: string) => void;
  onCancel: () => void;
  busy: boolean;
  isRefiningThis: boolean;
  label: string;
  placeholder?: string;
}

/**
 * Small inline refinement input mounted at the bottom of a PRD or TaskList
 * card. Submits the user's feedback string to the parent handler; parent
 * fires `/api/refine` with the current artifact and the feedback.
 */
export function RefineInput({
  onSubmit,
  onCancel,
  busy,
  isRefiningThis,
  label,
  placeholder,
}: Props) {
  const [feedback, setFeedback] = useState("");

  function handleSubmit() {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setFeedback("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === "Enter" &&
      (e.metaKey || e.ctrlKey) &&
      !busy &&
      feedback.trim().length > 0
    ) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && isRefiningThis) {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="mt-6 border-t border-border/50 pt-4">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Wand2 className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ??
          "Tell it what to change. e.g. 'make the acceptance criteria more specific about mobile'."
        }
        rows={2}
        disabled={busy && !isRefiningThis}
        className="resize-none text-sm"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 text-[10px]">
            ⌘/Ctrl + Enter
          </kbd>{" "}
          to refine
        </span>
        {isRefiningThis ? (
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
            onClick={handleSubmit}
            disabled={busy || feedback.trim().length === 0}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Refine
          </Button>
        )}
      </div>
    </div>
  );
}

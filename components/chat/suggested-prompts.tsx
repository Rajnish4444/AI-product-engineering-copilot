"use client";

import { Sparkles } from "lucide-react";

const EXAMPLES = [
  "Add dark mode to our settings page. Users can toggle it, and the preference persists per user across devices.",
  "Migrate our cookie sessions to JWT auth. Keep backwards compatibility for 30 days so existing sessions do not force logout.",
  "Add CSV export to the reports page. Should handle up to 100k rows without freezing the UI.",
  "Build an in-app onboarding tour for first-time users of the dashboard — three steps, dismissible, resumable.",
];

interface Props {
  onPick: (text: string) => void;
}

export function SuggestedPrompts({ onPick }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>Try an example</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            onClick={() => onPick(example)}
            className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

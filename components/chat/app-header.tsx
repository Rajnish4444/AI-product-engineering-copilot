"use client";

import { Badge } from "@/components/ui/badge";

interface Props {
  provider: string;
  model: string;
  cost: { input: number; output: number; usd: number };
  ideaSummary: string;
}

export function AppHeader({ provider, model, cost, ideaSummary }: Props) {
  const totalTokens = cost.input + cost.output;
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/50 bg-background/70 px-6 py-3 backdrop-blur-md">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {ideaSummary || "New session"}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-mono">
            {provider}
          </Badge>
          <span aria-hidden>·</span>
          <code className="text-xs">{model}</code>
        </div>
      </div>
      <div className="flex items-center gap-6 text-xs">
        {totalTokens > 0 && (
          <div className="text-right">
            <div className="font-mono text-sm font-medium tabular-nums">
              ${cost.usd.toFixed(4)}
            </div>
            <div className="text-muted-foreground">
              {totalTokens.toLocaleString()} tokens
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

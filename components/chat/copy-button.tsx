"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = "Copy", className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable (older browsers) — no-op.
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1 text-xs transition-colors hover:bg-accent",
        className
      )}
      aria-label={label}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );
}

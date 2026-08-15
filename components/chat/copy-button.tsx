"use client";

import { useState } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

type CopyState = "idle" | "copied" | "failed";

/**
 * Copy-to-clipboard button with two-tier fallback:
 *   1. navigator.clipboard.writeText (modern, needs secure context)
 *   2. Hidden textarea + document.execCommand("copy") (legacy, wider support)
 *
 * Surfaces success and failure states visibly rather than silently — the
 * previous no-op-on-error implementation left users staring at a button
 * they thought did nothing.
 */
export function CopyButton({ text, label = "Copy", className }: Props) {
  const [state, setState] = useState<CopyState>("idle");

  function markCopied() {
    setState("copied");
    setTimeout(() => setState("idle"), 1500);
  }

  function markFailed(reason: string) {
    console.error("[copy] failed:", reason);
    setState("failed");
    setTimeout(() => setState("idle"), 2000);
  }

  async function handleClick() {
    if (!text) {
      markFailed("nothing to copy");
      return;
    }

    // Preferred path: Clipboard API. Requires secure context (https or localhost).
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof window !== "undefined" &&
      window.isSecureContext
    ) {
      try {
        await navigator.clipboard.writeText(text);
        markCopied();
        return;
      } catch (err) {
        console.warn("[copy] Clipboard API rejected, falling back:", err);
      }
    }

    // Fallback path: hidden textarea + execCommand.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      // Keep it off-screen and non-editable-looking.
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (ok) {
        markCopied();
      } else {
        markFailed("execCommand returned false");
      }
    } catch (err) {
      markFailed(err instanceof Error ? err.message : "unknown error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1 text-xs transition-colors hover:bg-accent",
        state === "failed" && "border-destructive/50 text-destructive",
        className
      )}
      aria-label={label}
    >
      {state === "copied" ? (
        <>
          <Check className="h-3 w-3 text-green-500" />
          Copied
        </>
      ) : state === "failed" ? (
        <>
          <AlertCircle className="h-3 w-3" />
          Failed
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

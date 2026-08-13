"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import {
  listSessions,
  deleteSession,
  summarizeIdea,
  MAX_SESSIONS,
  type StoredSession,
} from "@/lib/session-store/local";

interface Props {
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
}

export function AppSidebar({
  activeSessionId,
  onSelect,
  onNew,
  refreshKey,
}: Props) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  useEffect(() => {
    setSessions(listSessions());
  }, [refreshKey]);

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteSession(id);
    setSessions(listSessions());
    if (activeSessionId === id) onNew();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/50 bg-muted/20 lg:flex">
      <div className="border-b border-border/50 p-4">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Logo size={22} wordmark />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            v0.1
          </span>
        </div>
        <Button onClick={onNew} size="sm" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New session
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            Your past sessions will appear here — stored in your browser only.
          </div>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(s.id);
                    }
                  }}
                  className={cn(
                    "group flex w-full cursor-pointer items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    activeSessionId === s.id && "bg-accent"
                  )}
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    {summarizeIdea(s.idea, 40) || "Untitled"}
                  </span>
                  <button
                    onClick={(e) => handleDelete(s.id, e)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    aria-label="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-border/50 p-4 text-xs text-muted-foreground">
        {sessions.length}/{MAX_SESSIONS} stored locally
      </div>
    </aside>
  );
}

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        AI Product & Engineering Copilot
      </span>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight">
        BuildPilot
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Paste a rough idea. BuildPilot writes the PRD, breaks it into engineering
        tasks, and dispatches a coding agent that opens a working pull request
        against your repo — all inside GitHub.
      </p>
      <div className="mt-10 flex items-center gap-3">
        <Button size="lg" disabled>
          Sign in with GitHub
        </Button>
        <span className="text-sm text-muted-foreground">
          (chat surface coming online in Phase 7)
        </span>
      </div>
    </main>
  );
}

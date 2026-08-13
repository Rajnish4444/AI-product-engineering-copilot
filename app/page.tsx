import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-6 inline-flex items-center gap-3 text-primary">
        <Logo size={48} />
      </div>
      <span className="block text-xs uppercase tracking-widest text-muted-foreground">
        AI Product & Engineering Copilot
      </span>
      <h1 className="mt-2 text-5xl font-semibold tracking-tight">
        BuildPilot
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Paste a rough idea. BuildPilot writes the PRD, breaks it into
        engineering tasks, and dispatches a coding agent that opens a working
        pull request against your repo — all inside GitHub.
      </p>
      <div className="mt-10 flex items-center gap-3">
        <Button size="lg" asChild>
          <Link href="/chat">Open workspace</Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          Model-agnostic · GitHub-native · no infra
        </span>
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-2">
        <FeatureCard
          title="PM copilot"
          body="Idea → PRD → task list, streamed with schema-validated JSON."
        />
        <FeatureCard
          title="Eng copilot"
          body="Each task hands off to a coding-agent runtime that opens a PR."
        />
        <FeatureCard
          title="Provider-agnostic"
          body="Anthropic, Google, GitHub Models. Config change to swap."
        />
        <FeatureCard
          title="No infra"
          body="Vercel + GitHub. No DB, no queue, no worker."
        />
      </div>
    </main>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

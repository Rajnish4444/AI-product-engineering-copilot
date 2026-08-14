"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PRD } from "@/lib/schemas/prd.v1";

interface Props {
  prd: Partial<PRD>;
  streaming: boolean;
}

export function PrdCard({ prd, streaming }: Props) {
  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{prd.title || (streaming ? "Drafting PRD..." : "Untitled")}</span>
          {streaming && <PulseDot />}
        </CardTitle>
        {prd.problem && <CardDescription>{prd.problem}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {prd.goals && prd.goals.length > 0 && (
          <Section title="Goals">
            <ul className="list-disc space-y-1 pl-5">
              {prd.goals.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </Section>
        )}
        {prd.non_goals && prd.non_goals.length > 0 && (
          <Section title="Non-goals">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {prd.non_goals.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </Section>
        )}
        {prd.user_stories && prd.user_stories.length > 0 && (
          <Section title="User stories">
            <ul className="space-y-2">
              {prd.user_stories.map((s, i) => (
                <li key={i} className="rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    As {s?.as_a}
                  </div>
                  <div>
                    I want <strong>{s?.i_want}</strong> so that {s?.so_that}.
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {prd.acceptance_criteria && prd.acceptance_criteria.length > 0 && (
          <Section title="Acceptance criteria">
            <ul className="space-y-2">
              {prd.acceptance_criteria.map((c, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">Given</span> {c?.given}{" "}
                  <span className="font-medium">when</span> {c?.when}{" "}
                  <span className="font-medium">then</span> {c?.then}.
                </li>
              ))}
            </ul>
          </Section>
        )}
        {prd.open_questions && prd.open_questions.length > 0 && (
          <Section title="Open questions">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {prd.open_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function PulseDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
  );
}

import type { PRD } from "@/lib/schemas/prd.v1";

/**
 * Renders a (possibly partial) PRD.v1 as a Markdown document suitable for
 * copy-paste into a Notion/Confluence/Linear description.
 *
 * Streaming-safe: any missing field is skipped rather than rendered as
 * "undefined". Empty arrays produce no section header.
 */
export function prdToMarkdown(prd: Partial<PRD>): string {
  const lines: string[] = [];

  if (prd.title) {
    lines.push(`# ${prd.title}`, "");
  }
  if (prd.problem) {
    lines.push(`## Problem`, "", prd.problem, "");
  }
  if (prd.goals?.length) {
    lines.push(`## Goals`, "");
    for (const g of prd.goals) lines.push(`- ${g}`);
    lines.push("");
  }
  if (prd.non_goals?.length) {
    lines.push(`## Non-goals`, "");
    for (const g of prd.non_goals) lines.push(`- ${g}`);
    lines.push("");
  }
  if (prd.user_stories?.length) {
    lines.push(`## User stories`, "");
    for (const s of prd.user_stories) {
      lines.push(
        `- As a ${s?.as_a || "?"}, I want ${s?.i_want || "?"}, so that ${s?.so_that || "?"}.`
      );
    }
    lines.push("");
  }
  if (prd.acceptance_criteria?.length) {
    lines.push(`## Acceptance criteria`, "");
    for (const c of prd.acceptance_criteria) {
      lines.push(
        `- **Given** ${c?.given || "?"} **when** ${c?.when || "?"} **then** ${c?.then || "?"}.`
      );
    }
    lines.push("");
  }
  if (prd.open_questions?.length) {
    lines.push(`## Open questions`, "");
    for (const q of prd.open_questions) lines.push(`- ${q}`);
  }

  return lines.join("\n").trimEnd();
}

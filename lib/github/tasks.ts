/**
 * Task-tracking Issues in the target repo. Each dispatched task gets one
 * Issue whose labels drive the state machine documented in ADR-0003.
 */

import type { Octokit } from "@octokit/rest";
import type { Task } from "@/lib/schemas/task-list.v1";

const BASE_LABELS = ["buildpilot", "bp:planned"];

export interface CreatedTrackingIssue {
  number: number;
  url: string;
}

export async function createTrackingIssue(
  octokit: Octokit,
  repo: { owner: string; name: string },
  task: Task,
  extraContext: string
): Promise<CreatedTrackingIssue> {
  const body = renderIssueBody(task, extraContext);
  const labels = [...BASE_LABELS, `bp:effort-${task.effort.toLowerCase()}`];
  const res = await octokit.rest.issues.create({
    owner: repo.owner,
    repo: repo.name,
    title: `[BuildPilot] ${task.title}`,
    body,
    labels,
  });
  return { number: res.data.number, url: res.data.html_url };
}

export async function transitionIssueLabel(
  octokit: Octokit,
  repo: { owner: string; name: string },
  issueNumber: number,
  nextLabel: "bp:dispatched" | "bp:pr-opened" | "bp:merged" | "bp:failed"
): Promise<void> {
  // Remove any other bp:state labels, add the new one.
  const current = await octokit.rest.issues.listLabelsOnIssue({
    owner: repo.owner,
    repo: repo.name,
    issue_number: issueNumber,
  });
  const removals = current.data
    .map((l) => l.name)
    .filter((name) => name.startsWith("bp:") && name !== nextLabel && !name.startsWith("bp:effort-") && name !== "buildpilot");
  for (const name of removals) {
    await octokit.rest.issues.removeLabel({
      owner: repo.owner,
      repo: repo.name,
      issue_number: issueNumber,
      name,
    });
  }
  await octokit.rest.issues.addLabels({
    owner: repo.owner,
    repo: repo.name,
    issue_number: issueNumber,
    labels: [nextLabel],
  });
}

function renderIssueBody(task: Task, context: string): string {
  const criteria = task.acceptance_criteria
    .map((c) => `- [ ] ${c}`)
    .join("\n");
  const deps =
    task.depends_on.length > 0
      ? task.depends_on.map((d) => `\`${d}\``).join(", ")
      : "none";
  const contextBlock = context ? `\n## Context\n\n${context}\n` : "";
  return `<!-- buildpilot task -->

## Description

${task.description}

## Acceptance criteria

${criteria}

## Metadata

- Task ID: \`${task.id}\`
- Effort: ${task.effort}
- Depends on: ${deps}
${contextBlock}`;
}

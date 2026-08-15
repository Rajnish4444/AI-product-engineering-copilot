import type { TaskList } from "@/lib/schemas/task-list.v1";

/**
 * Renders a (possibly partial) TaskList.v1 as a Markdown document. Streaming-
 * safe: skips missing fields rather than rendering "undefined".
 */
export function taskListToMarkdown(list: Partial<TaskList>): string {
  const tasks = list.tasks ?? [];
  if (tasks.length === 0) return "";

  const lines: string[] = ["# Engineering tasks", ""];

  for (const task of tasks) {
    if (!task) continue;

    lines.push(`## ${task.title || "Untitled task"}`, "");

    const meta: string[] = [];
    if (task.id) meta.push(`- **ID**: \`${task.id}\``);
    if (task.effort) meta.push(`- **Effort**: ${task.effort}`);
    if (task.depends_on && task.depends_on.length > 0) {
      meta.push(
        `- **Depends on**: ${task.depends_on.map((d) => `\`${d}\``).join(", ")}`
      );
    }
    if (meta.length > 0) {
      lines.push(...meta, "");
    }

    if (task.description) {
      lines.push(task.description, "");
    }

    if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
      lines.push("**Acceptance criteria:**", "");
      for (const c of task.acceptance_criteria) {
        lines.push(`- ${c}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}

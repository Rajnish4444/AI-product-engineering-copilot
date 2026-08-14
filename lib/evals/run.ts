/**
 * Eval harness entry point. Invoked by `pnpm eval` (via tsx).
 *
 * Args:
 *   --prompt <name>    default: prd-generator
 *   --provider <name>  default: configured BUILDPILOT_PROVIDER
 *   --row <id>         run a single row
 *
 * Env:
 *   BUILDPILOT_PROVIDER_OVERRIDE=cheap  forces provider.cheapModel
 *   EVAL_COST_CAP_USD                   hard cap per invocation (ADR-0007)
 *
 * Writes a Markdown report to eval-results/<date>-<prompt>-<provider>.md and
 * a copy at eval-results/latest.md so CI can attach it as a step summary.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { getProvider } from "@/lib/providers/registry";
import { loadPrompt } from "@/lib/prompts/loader";
import { getCostCaps } from "@/lib/cost/caps";
import { EVAL_REGISTRY, REGISTERED_PROMPTS } from "./registry";
import type { EvalReport, GoldenRow, RowResult } from "./types";

async function loadGoldens(promptName: string): Promise<GoldenRow[]> {
  const filepath = path.join(
    process.cwd(),
    "lib",
    "evals",
    promptName,
    "golden.jsonl"
  );
  const raw = await fs.readFile(filepath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((line, i) => {
      try {
        return JSON.parse(line) as GoldenRow;
      } catch {
        throw new Error(`golden.jsonl line ${i + 1}: invalid JSON`);
      }
    });
}

function fmtUsd(v: number): string {
  return `$${v.toFixed(4)}`;
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      prompt: { type: "string" },
      provider: { type: "string" },
      row: { type: "string" },
    },
    strict: false,
  });

  const promptName = (values.prompt as string | undefined) ?? "prd-generator";
  const config = EVAL_REGISTRY[promptName];
  if (!config) {
    console.error(
      `Unknown prompt "${promptName}". Registered: ${REGISTERED_PROMPTS.join(", ")}.`
    );
    process.exit(1);
  }

  const provider = getProvider(values.provider as string | undefined);
  const caps = getCostCaps();
  const useCheap = process.env.BUILDPILOT_PROVIDER_OVERRIDE === "cheap";
  const model = useCheap ? provider.cheapModel : provider.defaultModel;

  const prompt = await loadPrompt(config.promptName, config.promptVersion);
  let goldens = await loadGoldens(promptName);
  if (values.row) {
    goldens = goldens.filter((g) => g.id === values.row);
    if (goldens.length === 0) {
      console.error(`No golden row matched --row=${values.row}`);
      process.exit(1);
    }
  }

  console.log(
    `→ Running ${goldens.length} row(s) — provider=${provider.name} model=${model}\n`
  );

  const rows: RowResult[] = [];
  let totalCost = 0;
  let costCapHit = false;

  for (const row of goldens) {
    const started = Date.now();
    try {
      const { object, usage } = await provider.generateObject({
        model,
        system: prompt.system,
        messages: [
          { role: "user", content: config.wrapper(row.input) },
        ],
        schema: config.schema,
        schemaName: config.promptName,
        maxTokens: prompt.frontmatter.max_output_tokens,
      });

      const failures: string[] = [];
      for (const assertion of config.assertions) {
        const result = assertion({ output: object, row });
        if (!result.passed) failures.push(result.reason ?? "assertion failed");
      }

      const durationMs = Date.now() - started;
      totalCost += usage.estimatedUsd;
      rows.push({
        id: row.id,
        passed: failures.length === 0,
        failures,
        usage,
        durationMs,
      });

      const marker = failures.length === 0 ? "✓" : "✗";
      console.log(
        `${marker} ${row.id.padEnd(28)} ${fmtUsd(usage.estimatedUsd)} ${durationMs}ms`
      );
      for (const f of failures) console.log(`     ${f}`);
    } catch (err) {
      const durationMs = Date.now() - started;
      rows.push({
        id: row.id,
        passed: false,
        failures: [
          err instanceof Error ? err.message : "unknown error",
        ],
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedUsd: 0,
        },
        durationMs,
      });
      console.log(`✗ ${row.id.padEnd(28)} ERROR`);
      console.log(`     ${err instanceof Error ? err.message : String(err)}`);
    }

    if (totalCost > caps.evalCostUsd) {
      console.error(
        `\n! Eval cost cap ${fmtUsd(caps.evalCostUsd)} exceeded — aborting.`
      );
      costCapHit = true;
      break;
    }
  }

  const report: EvalReport = {
    prompt: promptName,
    provider: provider.name,
    model,
    totalRows: goldens.length,
    passedRows: rows.filter((r) => r.passed).length,
    totalCostUsd: totalCost,
    rows,
  };

  await writeReport(report);

  const passRate = ((report.passedRows / report.totalRows) * 100).toFixed(1);
  console.log(
    `\nSummary: ${report.passedRows}/${report.totalRows} passed (${passRate}%)  ·  total ${fmtUsd(totalCost)}`
  );

  process.exit(report.passedRows === report.totalRows && !costCapHit ? 0 : 1);
}

async function writeReport(report: EvalReport) {
  const dir = path.join(process.cwd(), "eval-results");
  await fs.mkdir(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}-${report.prompt}-${report.provider}.md`;
  const md = renderMarkdown(report);
  await fs.writeFile(path.join(dir, filename), md, "utf8");
  await fs.writeFile(path.join(dir, "latest.md"), md, "utf8");
}

function renderMarkdown(report: EvalReport): string {
  const passRate = ((report.passedRows / report.totalRows) * 100).toFixed(1);
  const rowLines = report.rows
    .map((r) => {
      const status = r.passed ? "✅" : "❌";
      const notes = r.passed ? "" : r.failures.join("; ");
      return `| \`${r.id}\` | ${status} | ${fmtUsd(r.usage.estimatedUsd)} | ${r.durationMs}ms | ${notes} |`;
    })
    .join("\n");
  return `# Eval report — ${report.prompt}

- **Provider**: \`${report.provider}\`
- **Model**: \`${report.model}\`
- **Pass rate**: ${report.passedRows}/${report.totalRows} (${passRate}%)
- **Total cost**: ${fmtUsd(report.totalCostUsd)}

| Row | Result | Cost | Duration | Notes |
|---|---|---|---|---|
${rowLines}
`;
}

main().catch((err) => {
  console.error("[eval] fatal:", err);
  process.exit(1);
});

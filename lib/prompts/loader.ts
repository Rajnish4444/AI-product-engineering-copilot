/**
 * Prompt loader. Reads a versioned Markdown file with YAML frontmatter from
 * lib/prompts/ and returns the parsed frontmatter + system-prompt body.
 *
 * Prompts are treated as artifacts (CLAUDE.md principle 4). Callers pin to a
 * specific version; a bumped version is a new file.
 */

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const PromptFrontmatter = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
  model_preference: z.array(z.string()).default([]),
  output_schema: z.string().optional(),
  max_output_tokens: z.number().int().positive().optional(),
});
export type PromptFrontmatter = z.infer<typeof PromptFrontmatter>;

export interface LoadedPrompt {
  frontmatter: PromptFrontmatter;
  system: string;
}

const PROMPTS_DIR = path.join(process.cwd(), "lib", "prompts");

export async function loadPrompt(
  name: string,
  version: number
): Promise<LoadedPrompt> {
  const filename = `${name}.v${version}.md`;
  const filepath = path.join(PROMPTS_DIR, filename);

  let raw: string;
  try {
    raw = await fs.readFile(filepath, "utf8");
  } catch {
    throw new Error(
      `Prompt ${filename} not found at ${filepath}. Did you bump the version but forget to create the file?`
    );
  }

  const parsed = matter(raw);
  const frontmatter = PromptFrontmatter.parse(parsed.data);

  if (frontmatter.name !== name) {
    throw new Error(
      `Prompt ${filename}: frontmatter name "${frontmatter.name}" does not match filename "${name}".`
    );
  }
  if (frontmatter.version !== version) {
    throw new Error(
      `Prompt ${filename}: frontmatter version ${frontmatter.version} does not match filename v${version}.`
    );
  }

  return {
    frontmatter,
    system: parsed.content.trim(),
  };
}

import { config } from "dotenv";
config({ path: ".env.local" });

import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";

const MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
];

async function main() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("Key not set");
    process.exit(1);
  }
  const google = createGoogleGenerativeAI({ apiKey });
  const schema = z.object({ greeting: z.string() });

  for (const model of MODELS_TO_TRY) {
    process.stdout.write(`  ${model.padEnd(28)} `);
    try {
      const res = await generateObject({
        model: google(model),
        schema,
        messages: [{ role: "user", content: "Say hello." }],
      });
      console.log(`✓  "${res.object.greeting}"  (in=${res.usage.promptTokens}, out=${res.usage.completionTokens})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0].slice(0, 120) : String(err);
      console.log(`✗  ${msg}`);
    }
  }
}

main().catch(console.error);

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const KEYS_TO_CLEAR = [
  "DEEPINFRA_API_KEY",
  "ANTHROPIC_API_KEY",
  "GROQ_API_KEY",
  "CEREBRAS_API_KEY",
  "OPENROUTER_API_KEY",
  "FIRECRAWL_API_KEY",
  "VERCEL_TOKEN",
  "TAVILY_API_KEY",
] as const;

export function loadEnvForTest(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }

  for (const key of KEYS_TO_CLEAR) {
    delete process.env[key];
  }

  process.env.DEMO_MODE = "true";
  delete process.env.LIVE_GENERATION;
  delete process.env.VARIANT_MODE;
  delete process.env.LIGHTHOUSE_MODE;
  delete process.env.CRITIC_MODE;
}

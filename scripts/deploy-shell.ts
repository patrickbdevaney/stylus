#!/usr/bin/env npx tsx
/**
 * Standalone deploy smoke test — writes shell HTML and deploys via Vercel.
 * Usage: npm run deploy:shell [-- "Business Name"]
 * Requires VERCEL_TOKEN in .env.local or environment.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { generateSiteFromOpts } from "../lib/agent/generateSite";
import { deploySite } from "../lib/agent/deploySite";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
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

async function main() {
  loadEnvLocal();

  const businessName = process.argv[2]?.trim() || "Stylus Demo";
  console.log(`Deploying shell for: ${businessName}`);

  const generated = await generateSiteFromOpts({ businessName });
  const result = await deploySite(generated);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

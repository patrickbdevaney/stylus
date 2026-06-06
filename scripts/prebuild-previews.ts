#!/usr/bin/env npx tsx
/**
 * Writes static demo preview HTML to public/previews/<slug>.html (no Blob/token).
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { getDemoBusinesses, getDemo } from "../lib/demo/seed";
import { generateSite } from "../lib/agent/generateSite";

async function main(): Promise<void> {
  const outDir = join(process.cwd(), "public", "previews");
  mkdirSync(outDir, { recursive: true });

  for (const { slug } of getDemoBusinesses()) {
    const demo = getDemo(slug);
    if (!demo) {
      console.warn(`skip ${slug}: no demo entry`);
      continue;
    }
    const { previewHtml } = await generateSite(demo.audit);
    const outPath = join(outDir, `${slug}.html`);
    writeFileSync(outPath, previewHtml, "utf8");
    console.log(`wrote ${outPath} (${previewHtml.length} bytes)`);
  }
}

void main();

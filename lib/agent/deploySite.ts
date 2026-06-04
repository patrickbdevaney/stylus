import type { GeneratedSite, DeployResult } from "@/lib/schema";
import { mkdtemp, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type VercelDeployJson = {
  status?: string;
  deployment?: { url?: string };
  error?: { message?: string };
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function writePrebuiltOutput(dir: string, html: string): Promise<void> {
  const outputDir = join(dir, ".vercel", "output");
  await mkdir(join(outputDir, "static"), { recursive: true });
  await writeFile(join(outputDir, "static", "index.html"), html, "utf8");
  await writeFile(
    join(outputDir, "config.json"),
    JSON.stringify({ version: 3 }),
    "utf8",
  );
}

function parseDeployUrl(stdout: string): string | null {
  try {
    const parsed = JSON.parse(stdout.trim()) as VercelDeployJson;
    const url = parsed.deployment?.url;
    if (url) return url.startsWith("http") ? url : `https://${url}`;
  } catch {
    // fall through to line scan
  }

  const match = stdout.match(/https:\/\/[^\s"]+\.vercel\.app/);
  return match?.[0] ?? null;
}

export async function deploySite(g: GeneratedSite): Promise<DeployResult> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN is not set");
  }

  const start = Date.now();
  const slug = slugify(g.businessName) || "site";
  const projectName = `stylus-${slug}-${Date.now().toString(36)}`;
  const workDir = await mkdtemp(join(tmpdir(), "stylus-deploy-"));

  await writePrebuiltOutput(workDir, g.html);

  const args = [
    "deploy",
    "--prebuilt",
    "--yes",
    "--public",
    "--token",
    token,
    "-F",
    "json",
  ];

  const scope = process.env.VERCEL_SCOPE;
  if (scope) args.push("--scope", scope);

  try {
    const { stdout } = await execFileAsync("vercel", args, {
      cwd: workDir,
      env: {
        ...process.env,
        VERCEL_ORG_ID: process.env.VERCEL_ORG_ID ?? "",
        VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ?? "",
      },
      maxBuffer: 10 * 1024 * 1024,
      timeout: 25_000,
    });

    const url = parseDeployUrl(stdout);
    if (!url) {
      throw new Error(`Could not parse deploy URL from Vercel output`);
    }

    return {
      url,
      provider: "vercel",
      ms: Date.now() - start,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown deploy error";
    throw new Error(`Deploy failed for ${projectName}: ${message}`);
  }
}

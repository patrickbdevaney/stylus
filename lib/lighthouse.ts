import { z } from "zod";

export const LighthouseScoresSchema = z.object({
  performance: z.number().int().min(0).max(100),
  seo: z.number().int().min(0).max(100),
  accessibility: z.number().int().min(0).max(100),
  bestPractices: z.number().int().min(0).max(100),
  fetchedAt: z.string(),
  degraded: z.boolean(),
});

export type LighthouseScores = z.infer<typeof LighthouseScoresSchema>;

export type LighthouseDelta = {
  before: LighthouseScores | null;
  after: LighthouseScores | null;
};

const PSI_TIMEOUT_MS = 9000;

type PsiCategory = { score?: number | null };

type PsiResponse = {
  lighthouseResult?: {
    categories?: {
      performance?: PsiCategory;
      seo?: PsiCategory;
      accessibility?: PsiCategory;
      "best-practices"?: PsiCategory;
    };
  };
};

type PsiCategories = {
  performance?: PsiCategory;
  seo?: PsiCategory;
  accessibility?: PsiCategory;
  "best-practices"?: PsiCategory;
};

function categoryScore(
  categories: PsiCategories | undefined,
  key: "performance" | "seo" | "accessibility" | "best-practices",
): number {
  const raw = categories?.[key]?.score;
  if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
  return Math.round(raw * 100);
}

async function runPageSpeed(url: string): Promise<LighthouseScores> {
  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
  );
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.append("category", "performance");
  endpoint.searchParams.append("category", "seo");
  endpoint.searchParams.append("category", "accessibility");
  endpoint.searchParams.append("category", "best-practices");
  endpoint.searchParams.set("strategy", "mobile");

  const res = await fetch(endpoint.toString(), {
    signal: AbortSignal.timeout(PSI_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`PageSpeed API failed (${res.status})`);
  }

  const json = (await res.json()) as PsiResponse;
  const categories = json.lighthouseResult?.categories;
  if (!categories) {
    throw new Error("PageSpeed response missing lighthouse categories");
  }

  return LighthouseScoresSchema.parse({
    performance: categoryScore(categories, "performance"),
    seo: categoryScore(categories, "seo"),
    accessibility: categoryScore(categories, "accessibility"),
    bestPractices: categoryScore(categories, "best-practices"),
    fetchedAt: new Date().toISOString(),
    degraded: false,
  });
}

function hashSlug(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededSide(slug: string, phase: "before" | "after"): LighthouseScores {
  const h = hashSlug(`${slug}:${phase}`);
  const performance =
    phase === "before" ? 30 + (h % 16) : 88 + ((h >> 4) % 12);
  const seo =
    phase === "before" ? 35 + ((h >> 8) % 15) : 90 + ((h >> 12) % 10);
  const accessibility =
    phase === "before" ? 40 + ((h >> 16) % 12) : 92 + ((h >> 20) % 8);
  const bestPractices =
    phase === "before" ? 38 + ((h >> 24) % 14) : 89 + ((h >> 28) % 11);

  return {
    performance,
    seo,
    accessibility,
    bestPractices,
    fetchedAt: new Date().toISOString(),
    degraded: true,
  };
}

export function seededLighthouse(slug: string): LighthouseDelta {
  const key = slug.trim().toLowerCase() || "generic";
  return {
    before: seededSide(key, "before"),
    after: seededSide(key, "after"),
  };
}

export async function getLighthouseDelta(
  beforeUrl: string | null,
  afterUrl: string,
): Promise<LighthouseDelta> {
  const [beforeResult, afterResult] = await Promise.allSettled([
    beforeUrl ? runPageSpeed(beforeUrl) : Promise.reject(new Error("no before url")),
    runPageSpeed(afterUrl),
  ]);

  return {
    before:
      beforeResult.status === "fulfilled" ? beforeResult.value : null,
    after: afterResult.status === "fulfilled" ? afterResult.value : null,
  };
}

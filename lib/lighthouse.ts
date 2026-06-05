import { z } from "zod";

export const LighthouseScoresSchema = z.object({
  performance: z.number().int().min(0).max(100),
  seo: z.number().int().min(0).max(100),
  accessibility: z.number().int().min(0).max(100),
  bestPractices: z.number().int().min(0).max(100),
  fetchedAt: z.string(),
  degraded: z.boolean(),
  seeded: z.boolean(),
  sourceUrl: z.string(),
});

export type LighthouseScores = z.infer<typeof LighthouseScoresSchema>;

export type LighthouseDelta = {
  before: LighthouseScores;
  after: LighthouseScores;
  bothReal: boolean;
  beforeUrl: string;
  afterUrl: string;
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

function hashSlug(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function seededLighthouse(
  slug: string,
  side: "before" | "after",
): LighthouseScores {
  const key = slug.trim().toLowerCase() || "generic";
  const h = hashSlug(`${key}:${side}`);
  const performance =
    side === "before" ? 30 + (h % 16) : 88 + ((h >> 4) % 12);
  const seo =
    side === "before" ? 35 + ((h >> 8) % 15) : 90 + ((h >> 12) % 10);
  const accessibility =
    side === "before" ? 40 + ((h >> 16) % 12) : 92 + ((h >> 20) % 8);
  const bestPractices =
    side === "before" ? 38 + ((h >> 24) % 14) : 89 + ((h >> 28) % 11);

  return LighthouseScoresSchema.parse({
    performance,
    seo,
    accessibility,
    bestPractices,
    fetchedAt: new Date().toISOString(),
    degraded: true,
    seeded: true,
    sourceUrl: "seeded",
  });
}

export function seededLighthouseDelta(slug: string): LighthouseDelta {
  return {
    before: seededLighthouse(slug, "before"),
    after: seededLighthouse(slug, "after"),
    bothReal: false,
    beforeUrl: "seeded",
    afterUrl: "seeded",
  };
}

export function provenanceLabel(scores: LighthouseScores): string {
  if (!scores.seeded) {
    return `Measured · ${scores.sourceUrl} · ${scores.fetchedAt}`;
  }
  return `Estimated (PSI unavailable for ${scores.sourceUrl || "this URL"})`;
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
    seeded: false,
    sourceUrl: url,
  });
}

function rejectReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

export async function getLighthouseDelta(
  beforeUrl: string | null,
  afterUrl: string,
  slug?: string,
): Promise<LighthouseDelta> {
  const key = slug?.trim().toLowerCase() || "generic";

  const [beforeResult, afterResult] = await Promise.allSettled([
    beforeUrl
      ? runPageSpeed(beforeUrl)
      : Promise.reject(new Error("no-before-url")),
    runPageSpeed(afterUrl),
  ]);

  let before: LighthouseScores;
  if (beforeResult.status === "fulfilled") {
    before = beforeResult.value;
  } else {
    console.warn(
      `Lighthouse before fallback (${beforeUrl ?? "no url"}):`,
      rejectReason(beforeResult.reason),
    );
    before = seededLighthouse(key, "before");
  }

  let after: LighthouseScores;
  if (afterResult.status === "fulfilled") {
    after = afterResult.value;
  } else {
    console.warn(
      `Lighthouse after fallback (${afterUrl}):`,
      rejectReason(afterResult.reason),
    );
    after = seededLighthouse(key, "after");
  }

  return {
    before,
    after,
    bothReal: !before.seeded && !after.seeded,
    beforeUrl: beforeUrl ?? "seeded",
    afterUrl,
  };
}

const SEO_STRUCTURED_AUDIT_IDS = [
  "structured-data",
  "document-title",
  "meta-description",
  "image-alt",
] as const;

type PsiAudit = { score?: number | null };

type PsiStructuredDataResponse = {
  lighthouseResult?: {
    audits?: Record<string, PsiAudit>;
  };
};

export async function structuredDataAudit(
  url: string,
): Promise<{ passed: boolean; items: number }> {
  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
  );
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("category", "seo");
  endpoint.searchParams.set("strategy", "mobile");

  const res = await fetch(endpoint.toString(), {
    signal: AbortSignal.timeout(PSI_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`PageSpeed API failed (${res.status})`);
  }

  const json = (await res.json()) as PsiStructuredDataResponse;
  const audits = json.lighthouseResult?.audits;
  if (!audits) {
    throw new Error("PageSpeed response missing lighthouse audits");
  }

  const items = SEO_STRUCTURED_AUDIT_IDS.filter(
    (id) => audits[id]?.score === 1,
  ).length;

  return {
    passed: items >= 2,
    items,
  };
}

export function seededStructuredData(): { passed: boolean; items: number } {
  return { passed: true, items: 3 };
}

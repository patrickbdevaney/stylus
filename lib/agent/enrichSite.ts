import { load } from "cheerio";
import type { EnrichmentContext, SiteSnapshot } from "@/lib/schema";

const SEARCH_TIMEOUT_MS = 8000;
const USER_AGENT = "StylusBot/1.0";

function genericContext(): EnrichmentContext {
  return {
    wikipediaExcerpt: null,
    googleReviewCount: null,
    googleRating: null,
    yearsOperating: null,
    pressSnippets: [],
    brandTier: "generic",
  };
}

async function ddgSearch(query: string): Promise<string[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = load(html);
  const snippets: string[] = [];
  $(".result__snippet").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) snippets.push(text);
  });
  return snippets.slice(0, 5);
}

function extractYearsOperating(snippets: string[]): number | null {
  const currentYear = new Date().getFullYear();
  let earliest: number | null = null;

  for (const snippet of snippets) {
    const matches = snippet.match(/\b(19\d{2}|20[01]\d)\b/g);
    if (!matches) continue;
    for (const raw of matches) {
      const year = Number.parseInt(raw, 10);
      if (year >= 1900 && year <= 2015) {
        if (earliest === null || year < earliest) earliest = year;
      }
    }
  }

  if (earliest === null) return null;
  return currentYear - earliest;
}

function extractGoogleSignals(
  snippets: string[],
): { count: number | null; rating: number | null } {
  let count: number | null = null;
  let rating: number | null = null;

  for (const snippet of snippets) {
    const countMatch = snippet.match(/([\d,]+)\s+reviews?\b/i);
    if (countMatch) {
      const parsed = Number.parseInt(countMatch[1].replace(/,/g, ""), 10);
      if (!Number.isNaN(parsed)) count = parsed;
    }

    const ratingMatch = snippet.match(/(\d+(?:\.\d+)?)\s+stars?\b/i);
    if (ratingMatch) {
      const parsed = Number.parseFloat(ratingMatch[1]);
      if (!Number.isNaN(parsed)) rating = parsed;
    }
  }

  return { count, rating };
}

function pickWikipediaExcerpt(snippets: string[]): string | null {
  for (const snippet of snippets) {
    if (/wikipedia/i.test(snippet)) return snippet;
  }
  return snippets[0] ?? null;
}

function deriveBrandTier(ctx: {
  wikipediaExcerpt: string | null;
  googleReviewCount: number | null;
  yearsOperating: number | null;
  pressSnippets: string[];
}): EnrichmentContext["brandTier"] {
  const hasWikipedia = ctx.wikipediaExcerpt !== null;
  if (
    hasWikipedia &&
    ((ctx.yearsOperating ?? 0) > 20 || ctx.pressSnippets.length >= 2)
  ) {
    return "iconic";
  }
  if (
    (ctx.googleReviewCount ?? 0) > 500 ||
    (ctx.yearsOperating ?? 0) > 10 ||
    ctx.pressSnippets.length >= 1
  ) {
    return "established";
  }
  return "generic";
}

export async function enrichSite(
  snapshot: SiteSnapshot,
  onProgress?: (msg: string) => void,
): Promise<EnrichmentContext> {
  const name = snapshot.businessName;
  const queries = [
    `${name} Miami Wikipedia`,
    `${name} Miami reviews history`,
    `${name} Miami site:miamiherald.com OR site:eater.com OR site:nytimes.com`,
  ];

  onProgress?.("Searching brand history, reviews, and press…");

  try {
    const [wikiResult, reviewsResult, pressResult] = await Promise.allSettled(
      queries.map((q) => ddgSearch(q)),
    );

    const wikiSnippets =
      wikiResult.status === "fulfilled" ? wikiResult.value : [];
    const reviewSnippets =
      reviewsResult.status === "fulfilled" ? reviewsResult.value : [];
    const pressSnippets =
      pressResult.status === "fulfilled" ? pressResult.value : [];

    const allSnippets = [...wikiSnippets, ...reviewSnippets, ...pressSnippets];
    const wikipediaExcerpt = pickWikipediaExcerpt(wikiSnippets);
    const yearsOperating = extractYearsOperating(allSnippets);
    const { count: googleReviewCount, rating: googleRating } =
      extractGoogleSignals(reviewSnippets);

    const brandTier = deriveBrandTier({
      wikipediaExcerpt,
      googleReviewCount,
      yearsOperating,
      pressSnippets,
    });

    onProgress?.(
      `Enrichment complete — brand tier: ${brandTier}${yearsOperating ? `, ~${yearsOperating} years` : ""}`,
    );

    return {
      wikipediaExcerpt,
      googleReviewCount,
      googleRating,
      yearsOperating,
      pressSnippets,
      brandTier,
    };
  } catch {
    onProgress?.("Enrichment unavailable — continuing with generic brand tier.");
    return genericContext();
  }
}

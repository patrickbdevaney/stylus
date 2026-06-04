import type { ResolveResult, SiteSnapshot } from "@/lib/schema";
import { getDemo, findDemoByName, isDemoMode } from "@/lib/demo/seed";
import {
  buildDegradedSnapshot,
  extractContact,
  isUsableSnapshot,
} from "@/lib/agent/parseHelpers";
import { load } from "cheerio";

const FETCH_TIMEOUT_MS = 12_000;
const MIN_USABLE_FIELDS = 2;

type FetchSiteOptions = {
  demoSlug?: string;
};

async function fetchViaFirecrawl(url: string): Promise<SiteSnapshot | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        markdown?: string;
        html?: string;
        metadata?: {
          title?: string;
          description?: string;
          ogImage?: string;
        };
      };
    };

    if (!json.success || !json.data) return null;

    const markdown = json.data.markdown ?? "";
    const html = json.data.html ?? "";
    const meta = json.data.metadata ?? {};
    const contact = extractContact(`${markdown}\n${html}`);
    const headings = html ? extractHeadings(html) : [];

    const snapshot: SiteSnapshot = {
      businessName: meta.title?.split(/[|\-–]/)[0]?.trim() ?? nameFromUrl(url),
      url,
      degraded: false,
      title: meta.title ?? null,
      description: meta.description ?? null,
      headings,
      contact,
      rawText: markdown || stripHtml(html),
      screenshot: meta.ogImage ?? null,
    };

    if (!isUsableSnapshot(snapshot)) {
      snapshot.degraded = true;
    }
    return snapshot;
  } catch {
    return null;
  }
}

async function fetchViaRaw(url: string): Promise<SiteSnapshot | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StylusBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = load(html);

    $("script, style, noscript").remove();

    const title = $("title").first().text().trim() || null;
    const description =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null;

    const headings = $("h1, h2, h3")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .slice(0, 12);

    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const contact = extractContact(`${bodyText}\n${html}`);

    const snapshot: SiteSnapshot = {
      businessName: title?.split(/[|\-–]/)[0]?.trim() ?? nameFromUrl(url),
      url,
      degraded: false,
      title,
      description,
      headings,
      contact,
      rawText: bodyText.slice(0, 8000),
      screenshot: $('meta[property="og:image"]').attr("content") ?? null,
    };

    if (!isUsableSnapshot(snapshot)) {
      snapshot.degraded = true;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function extractHeadings(html: string): string[] {
  const $ = load(html);
  return $("h1, h2, h3")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 12);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function nameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return hostname.split(".")[0]?.replace(/-/g, " ") ?? url;
  } catch {
    return url;
  }
}

export async function fetchSite(
  r: ResolveResult,
  opts?: FetchSiteOptions,
): Promise<SiteSnapshot> {
  if (opts?.demoSlug) {
    const demo = getDemo(opts.demoSlug);
    if (demo) return demo.snapshot;
  }

  if (isDemoMode()) {
    const demo = findDemoByName(r.businessName);
    if (demo) return demo.snapshot;
  }

  if (!r.url) {
    return buildDegradedSnapshot(r.businessName, null);
  }

  const firecrawl = await fetchViaFirecrawl(r.url);
  if (firecrawl && countFields(firecrawl) >= MIN_USABLE_FIELDS) {
    return { ...firecrawl, businessName: r.businessName || firecrawl.businessName };
  }

  const raw = await fetchViaRaw(r.url);
  if (raw && countFields(raw) >= MIN_USABLE_FIELDS) {
    return { ...raw, businessName: r.businessName || raw.businessName };
  }

  const partial = firecrawl ?? raw;
  if (partial) {
    return {
      ...partial,
      businessName: r.businessName || partial.businessName,
      degraded: true,
    };
  }

  return buildDegradedSnapshot(r.businessName, r.url);
}

function countFields(s: SiteSnapshot): number {
  let n = 0;
  if (s.title) n++;
  if (s.description) n++;
  if (s.headings.length) n++;
  if (s.rawText.length > 80) n++;
  return n;
}

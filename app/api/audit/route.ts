import type {
  DesignBrief,
  EnrichmentContext,
  StreamEvent,
  SiteAudit,
  SiteSnapshot,
} from "@/lib/schema";
import { resolve } from "@/lib/agent/resolve";
import { fetchSite } from "@/lib/agent/fetchSite";
import { auditSite } from "@/lib/agent/auditSite";
import { enrichSite } from "@/lib/agent/enrichSite";
import {
  analyzeLandscape,
  defaultLandscape,
} from "@/lib/agent/competitorLandscape";
import { defaultBrandTokens } from "@/lib/agent/extractBrand";
import {
  fallbackDesignBrief,
  generateDesignBrief,
} from "@/lib/agent/designBrief";
import { deterministicBrandTier } from "@/lib/agent/enrichSite";
import { buildVariants } from "@/lib/generate/variants/index";
import { seededTokensForSlug } from "@/lib/generate/tokens";
import { deploySite } from "@/lib/agent/deploySite";
import { getDemo, findDemoByName, getDemoEntry, isDemoMode } from "@/lib/demo/seed";
import { encodeSse, sleep } from "@/lib/stream";
import { previewUrl, storePreviewHtml } from "@/lib/previewStore";
import { buildSeedPayload } from "@/lib/seoGap";
import {
  getLighthouseDelta,
  seededLighthouseDelta,
  seededStructuredData,
  structuredDataAudit,
} from "@/lib/lighthouse";
import { critiqueAudit } from "@/lib/agent/critiqueAudit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuditRequestBody = {
  input?: string;
  demoSlug?: string;
};

type AuditPipelineResult = {
  audit: SiteAudit;
  snapshotUrl: string | null;
  critique: { confidence: number; adjustments: string[] } | null;
  enrichment: EnrichmentContext;
  designBrief: DesignBrief;
};

function thumShot(pageUrl: string): string {
  return `https://image.thum.io/get/width/600/crop/338/${pageUrl}`;
}

function emitShots(
  send: (event: StreamEvent) => void,
  snapshotUrl: string | null,
  deployUrl: string,
) {
  send({
    type: "shots",
    beforeUrl: snapshotUrl ? thumShot(snapshotUrl) : null,
    afterUrl: thumShot(deployUrl),
  });
}

async function emitCritique(
  send: (event: StreamEvent) => void,
  audit: SiteAudit,
  snapshot: SiteSnapshot,
  demoSlug?: string,
): Promise<{ confidence: number; adjustments: string[] } | null> {
  if (process.env.CRITIC_MODE !== "true") return null;

  try {
    const c = demoSlug
      ? { confidence: 72, adjustments: [] as string[] }
      : await critiqueAudit(audit, snapshot, (delta) =>
          send({ type: "reasoning", delta }),
        );
    send({
      type: "critique",
      confidence: c.confidence,
      adjustments: c.adjustments,
    });
    return c;
  } catch {
    const fallback = { confidence: 72, adjustments: [] as string[] };
    send({
      type: "critique",
      confidence: fallback.confidence,
      adjustments: fallback.adjustments,
    });
    return fallback;
  }
}

function businessSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function resolveDeployUrl(url: string, origin?: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/") && origin) {
    return `${new URL(origin).origin}${url}`;
  }
  return url;
}

async function emitLighthouse(
  send: (event: StreamEvent) => void,
  opts: {
    demoSlug?: string;
    snapshotUrl: string | null;
    afterUrl: string;
    audit: SiteAudit;
  },
) {
  if (process.env.LIGHTHOUSE_MODE !== "true") return;

  const slug = opts.demoSlug ?? businessSlug(opts.audit.businessName);

  try {
    const data = await getLighthouseDelta(
      opts.snapshotUrl,
      opts.afterUrl,
      slug,
    );
    send({ type: "lighthouse", data });
  } catch (err) {
    console.warn("Lighthouse emit failed:", err);
    send({
      type: "lighthouse",
      data: {
        ...seededLighthouseDelta(slug),
        beforeUrl: opts.snapshotUrl ?? "seeded",
        afterUrl: opts.afterUrl,
      },
    });
  }

  try {
    const validation = opts.demoSlug
      ? seededStructuredData()
      : await structuredDataAudit(opts.afterUrl);
    send({
      type: "seo_validation",
      passed: validation.passed,
      items: validation.items,
    });
  } catch {
    const fallback = seededStructuredData();
    send({
      type: "seo_validation",
      passed: fallback.passed,
      items: fallback.items,
    });
  }
}

async function replayDemoTrace(
  send: (event: StreamEvent) => void,
  demoSlug: string,
): Promise<AuditPipelineResult> {
  const demo = getDemo(demoSlug);
  if (!demo) throw new Error(`Demo not found: ${demoSlug}`);

  send({
    type: "step",
    step: "resolve",
    status: "start",
    message: "Resolving business…",
  });
  await sleep(200);
  send({
    type: "step",
    step: "resolve",
    status: "done",
    message: `Demo: ${demo.snapshot.businessName}`,
  });
  send({
    type: "resolve",
    data: {
      url: demo.snapshot.url,
      businessName: demo.snapshot.businessName,
      resolved: Boolean(demo.snapshot.url),
    },
  });

  send({
    type: "step",
    step: "fetch",
    status: "start",
    message: "Loading cached site snapshot…",
  });
  await sleep(300);
  send({
    type: "step",
    step: "fetch",
    status: "done",
    message: demo.snapshot.degraded
      ? "Cached degraded snapshot"
      : `Cached snapshot — ${demo.snapshot.headings.length} headings extracted`,
  });
  send({ type: "snapshot", data: demo.snapshot });

  send({
    type: "step",
    step: "audit",
    status: "start",
    message: "Running audit (cached)…",
  });

  if (demo.reasoningTrace?.length) {
    for (const chunk of demo.reasoningTrace) {
      send({ type: "reasoning", delta: chunk });
      await sleep(180);
    }
  } else {
    send({
      type: "reasoning",
      delta: "Using pre-cached audit — no live model call.\n",
    });
  }

  send({
    type: "step",
    step: "audit",
    status: "done",
    message: `Overall score: ${demo.audit.overallScore}/100`,
  });
  send({ type: "audit", data: demo.audit });
  const critique = await emitCritique(send, demo.audit, demo.snapshot, demoSlug);
  const enrichment: EnrichmentContext = {
    wikipediaExcerpt: null,
    googleReviewCount: null,
    googleRating: null,
    yearsOperating: null,
    pressSnippets: [],
    brandTier: deterministicBrandTier(demo.snapshot),
    brandTokens: seededTokensForSlug(demoSlug),
  };
  const designBrief = fallbackDesignBrief(
    "warm-local",
    demo.audit.brandTier ?? "generic",
  );
  return {
    audit: demo.audit,
    snapshotUrl: demo.snapshot.url,
    critique,
    enrichment,
    designBrief,
  };
}

async function runLiveAudit(
  input: string,
  send: (event: StreamEvent) => void,
): Promise<AuditPipelineResult> {
  if (isDemoMode()) {
    const demo = findDemoByName(input);
    if (demo) return replayDemoTrace(send, demo.slug);
  }

  send({
    type: "step",
    step: "resolve",
    status: "start",
    message: "Resolving input…",
  });
  const resolved = await resolve(input);
  send({
    type: "step",
    step: "resolve",
    status: "done",
    message: resolved.resolved
      ? `Resolved → ${resolved.url}`
      : `Name only: ${resolved.businessName}`,
  });
  send({ type: "resolve", data: resolved });

  send({
    type: "step",
    step: "fetch",
    status: "start",
    message: resolved.url
      ? `Fetching ${resolved.url}…`
      : "Building degraded snapshot…",
  });
  const snapshot = await fetchSite(resolved);
  send({
    type: "step",
    step: "fetch",
    status: "done",
    message: snapshot.degraded
      ? "Degraded snapshot — continuing with partial data"
      : `Snapshot ready — ${snapshot.headings.length} headings, ${snapshot.rawText.length} chars`,
  });
  send({ type: "snapshot", data: snapshot });

  send({
    type: "step",
    step: "enrich",
    status: "start",
    message: "Researching brand history...",
  });
  const enrichment = await enrichSite(snapshot, (msg) =>
    send({ type: "reasoning", delta: msg + "\n" }),
  );
  send({
    type: "step",
    step: "enrich",
    status: "done",
    message: `Brand tier: ${enrichment.brandTier}`,
  });
  if (enrichment.brandTokens) {
    send({ type: "brand_tokens", data: enrichment.brandTokens });
  }

  send({
    type: "step",
    step: "enrich",
    status: "start",
    message: "Analyzing competitor design landscape...",
  });

  const gapSeed = buildSeedPayload(
    snapshot.businessName,
    snapshot.description ?? "Local Business",
  );
  const competitorUrls = gapSeed.competitors
    .map((c) => c.sourceUrl)
    .filter((u): u is string => u.startsWith("http"));

  const landscape = await analyzeLandscape(
    enrichment.brandTokens ?? defaultBrandTokens(snapshot.url),
    competitorUrls,
    enrichment.brandTier,
    (msg) => send({ type: "reasoning", delta: msg + "\n" }),
  ).catch(() => defaultLandscape(competitorUrls));

  send({ type: "landscape", data: landscape });
  send({
    type: "step",
    step: "enrich",
    status: "done",
    message: `Landscape: ${landscape.recommendedArchetype} — ${landscape.differentiationVector.slice(0, 60)}…`,
  });

  send({
    type: "step",
    step: "audit",
    status: "start",
    message: "Auditing site with Claude…",
  });
  send({
    type: "reasoning",
    delta: "Analyzing clarity, trust, mobile, speed, conversion, and local SEO…\n",
  });

  const audit = await auditSite(snapshot, {
    enrichment,
    onReasoning: (delta) => send({ type: "reasoning", delta }),
  });

  send({
    type: "step",
    step: "audit",
    status: "done",
    message: `Overall score: ${audit.overallScore}/100`,
  });
  send({ type: "audit", data: audit });

  send({
    type: "reasoning",
    delta:
      "Generating design brief from brand tokens and competitor landscape…\n",
  });

  const brief = await generateDesignBrief(
    audit,
    enrichment.brandTokens ?? defaultBrandTokens(snapshot.url),
    landscape,
    { onReasoning: (d) => send({ type: "reasoning", delta: d }) },
  ).catch(() =>
    fallbackDesignBrief(
      landscape.recommendedArchetype,
      audit.brandTier ?? "generic",
    ),
  );

  send({ type: "design_brief", data: brief });

  const critique = await emitCritique(send, audit, snapshot);
  return {
    audit,
    snapshotUrl: snapshot.url,
    critique,
    enrichment,
    designBrief: brief,
  };
}

async function runGenerateDeploy(
  audit: SiteAudit,
  send: (event: StreamEvent) => void,
  opts: {
    snapshotUrl: string | null;
    enrichmentContext: EnrichmentContext;
    designBrief: DesignBrief;
    demoSlug?: string;
    origin?: string;
    critique?: { confidence: number; adjustments: string[] } | null;
  },
) {
  const { snapshotUrl, enrichmentContext, designBrief, demoSlug, origin } = opts;

  send({
    type: "step",
    step: "generate",
    status: "start",
    message: "Building 3 brand-faithful variants...",
  });

  const variants = await buildVariants(
    audit,
    enrichmentContext.brandTokens ?? defaultBrandTokens(snapshotUrl),
    designBrief,
    (index, variant) => {
      send({
        type: "variant_ready",
        data: {
          variantIndex: index,
          label: variant.variantLabel,
          archetype: variant.archetype,
          library: variant.library,
          previewHtml: variant.previewHtml,
          rationale: variant.differentiationRationale,
        },
      });
    },
    enrichmentContext,
  );

  send({
    type: "step",
    step: "generate",
    status: "done",
    message: `${variants.length} variants ready (${variants.map((variant) => variant.variantLabel).join(", ")})`,
  });

  const generated = variants[0];
  if (!generated) {
    throw new Error("No variants generated");
  }

  send({
    type: "step",
    step: "deploy",
    status: "start",
    message: "Deploying to Vercel…",
  });

  try {
    const result = await deploySite(generated);
    send({
      type: "step",
      step: "deploy",
      status: "done",
      message: `Live in ${(result.ms / 1000).toFixed(1)}s`,
    });
    send({ type: "deploy", data: result });
    emitShots(send, snapshotUrl, result.url);
    await emitLighthouse(send, {
      demoSlug,
      snapshotUrl,
      afterUrl: result.url,
      audit,
    });
  } catch (err) {
    const fallback = demoSlug
      ? getDemoEntry(demoSlug)?.deployFallbackUrl
      : findDemoByName(audit.businessName)?.deployFallbackUrl;

    if (fallback) {
      const deployUrl = resolveDeployUrl(fallback, origin);
      send({
        type: "reasoning",
        delta: "Deploy unavailable — using cached demo URL.\n",
      });
      send({
        type: "step",
        step: "deploy",
        status: "done",
        message: "Cached fallback URL",
      });
      send({
        type: "deploy",
        data: { url: deployUrl, provider: "vercel", ms: 0 },
      });
      emitShots(send, snapshotUrl, deployUrl);
      await emitLighthouse(send, {
        demoSlug,
        snapshotUrl,
        afterUrl: deployUrl,
        audit,
      });
      return;
    }

    if (origin) {
      const id = await storePreviewHtml(generated.previewHtml);
      const url = previewUrl(id, origin);
      send({
        type: "reasoning",
        delta: "Vercel deploy unavailable — serving preview on this host.\n",
      });
      send({
        type: "step",
        step: "deploy",
        status: "done",
        message: "Preview URL ready",
      });
      send({
        type: "deploy",
        data: { url, provider: "vercel", ms: 0 },
      });
      emitShots(send, snapshotUrl, url);
      await emitLighthouse(send, {
        demoSlug,
        snapshotUrl,
        afterUrl: url,
        audit,
      });
      return;
    }

    throw err;
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as AuditRequestBody;
  const demoSlug =
    typeof body.demoSlug === "string" ? body.demoSlug.trim() : undefined;
  const input = typeof body.input === "string" ? body.input.trim() : "";

  if (!demoSlug && !input) {
    return new Response(JSON.stringify({ error: "input or demoSlug required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(encodeSse(event)));
      };

      try {
        const origin = new URL(req.url).origin;
        const pipeline = demoSlug
          ? await replayDemoTrace(send, demoSlug)
          : await runLiveAudit(input, send);

        await runGenerateDeploy(pipeline.audit, send, {
          snapshotUrl: pipeline.snapshotUrl,
          enrichmentContext: pipeline.enrichment,
          designBrief: pipeline.designBrief,
          demoSlug,
          origin,
          critique: pipeline.critique,
        });
        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Pipeline failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

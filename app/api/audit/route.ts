import type { StreamEvent, SiteAudit } from "@/lib/schema";
import { resolve } from "@/lib/agent/resolve";
import { fetchSite } from "@/lib/agent/fetchSite";
import { auditSite } from "@/lib/agent/auditSite";
import { enrichSite } from "@/lib/agent/enrichSite";
import { generateSiteWithVariants } from "@/lib/agent/generateSite";
import { deploySite } from "@/lib/agent/deploySite";
import { getDemo, findDemoByName, getDemoEntry, isDemoMode } from "@/lib/demo/seed";
import { encodeSse, sleep } from "@/lib/stream";
import { previewUrl, storePreviewHtml } from "@/lib/previewStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuditRequestBody = {
  input?: string;
  demoSlug?: string;
};

async function replayDemoTrace(
  send: (event: StreamEvent) => void,
  demoSlug: string,
): Promise<SiteAudit> {
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
  return demo.audit;
}

async function runLiveAudit(
  input: string,
  send: (event: StreamEvent) => void,
): Promise<SiteAudit> {
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
  return audit;
}

async function runGenerateDeploy(
  audit: SiteAudit,
  send: (event: StreamEvent) => void,
  demoSlug?: string,
  origin?: string,
) {
  send({
    type: "step",
    step: "generate",
    status: "start",
    message: "Filling Miami neon template from audit…",
  });
  send({
    type: "reasoning",
    delta: `Generating single-page site for ${audit.businessName} — hero, services, about, contact…\n`,
  });

  const generated = await generateSiteWithVariants(
    audit,
    (delta) => send({ type: "reasoning", delta }),
    (provider, ms) => {
      send({
        type: "reasoning",
        delta: `Copy ready via ${provider} (${ms}ms)\n`,
      });
    },
    (msg) => send({ type: "variant_progress", message: msg }),
    (variantIndex, score, totalMs) =>
      send({ type: "variant_winner", variantIndex, score, totalMs }),
    {
      onSpawn: (agent, role) => send({ type: "agent_spawn", agent, role }),
      onActive: (agent, detail) =>
        send({ type: "agent_active", agent, detail }),
      onAgentDone: (agent, ms, output) =>
        send({ type: "agent_done", agent, ms, output }),
      onHandoff: (from, to) => send({ type: "agent_handoff", from, to }),
      onVerdict: (agent, accepted, rejected, reason) =>
        send({
          type: "agent_verdict",
          agent,
          accepted,
          rejected,
          reason,
        }),
    },
  );

  send({
    type: "step",
    step: "generate",
    status: "done",
    message: `Template filled — ${(generated.html.length / 1024).toFixed(1)} KB`,
  });

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
  } catch (err) {
    const fallback = demoSlug
      ? getDemoEntry(demoSlug)?.deployFallbackUrl
      : findDemoByName(audit.businessName)?.deployFallbackUrl;

    if (fallback) {
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
        data: { url: fallback, provider: "vercel", ms: 0 },
      });
      return;
    }

    if (origin) {
      const id = await storePreviewHtml(generated.html);
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
        const audit = demoSlug
          ? await replayDemoTrace(send, demoSlug)
          : await runLiveAudit(input, send);

        await runGenerateDeploy(audit, send, demoSlug, origin);
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

import type { StreamEvent } from "@/lib/schema";
import { resolve } from "@/lib/agent/resolve";
import { fetchSite } from "@/lib/agent/fetchSite";
import { auditSite } from "@/lib/agent/auditSite";
import { getDemo, findDemoByName, isDemoMode } from "@/lib/demo/seed";
import { encodeSse, sleep } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuditRequestBody = {
  input?: string;
  demoSlug?: string;
};

async function replayDemoTrace(
  send: (event: StreamEvent) => void,
  demoSlug: string,
) {
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
}

async function runLiveAudit(
  input: string,
  send: (event: StreamEvent) => void,
) {
  if (isDemoMode()) {
    const demo = findDemoByName(input);
    if (demo) {
      await replayDemoTrace(send, demo.slug);
      return;
    }
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
    message: resolved.url ? `Fetching ${resolved.url}…` : "Building degraded snapshot…",
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
    step: "audit",
    status: "start",
    message: "Auditing site with Claude…",
  });
  send({
    type: "reasoning",
    delta: "Analyzing clarity, trust, mobile, speed, conversion, and local SEO…\n",
  });

  const audit = await auditSite(snapshot, {
    onReasoning: (delta) => send({ type: "reasoning", delta }),
  });

  send({
    type: "step",
    step: "audit",
    status: "done",
    message: `Overall score: ${audit.overallScore}/100`,
  });
  send({ type: "audit", data: audit });
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
        if (demoSlug) {
          await replayDemoTrace(send, demoSlug);
        } else {
          await runLiveAudit(input, send);
        }
        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Audit failed",
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

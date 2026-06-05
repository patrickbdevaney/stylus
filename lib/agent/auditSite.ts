import Anthropic from "@anthropic-ai/sdk";
import type { EnrichmentContext, SiteAudit, SiteSnapshot } from "@/lib/schema";
import { SiteAuditSchema } from "@/lib/schema";
import { EMIT_AUDIT_TOOL } from "@/lib/auditToolSchema";
import { buildFallbackAudit } from "@/lib/agent/fallbackAudit";
import { getDemo, findDemoByName, isDemoMode } from "@/lib/demo/seed";

export type AuditOptions = {
  demoSlug?: string;
  enrichment?: EnrichmentContext;
  onReasoning?: (delta: string) => void;
};

function buildEnrichmentBlock(enrichment: EnrichmentContext): string {
  const lines = [
    "",
    "Brand enrichment (external research — use to calibrate trust and local SEO scores):",
    `- Brand tier: ${enrichment.brandTier}`,
    `- Wikipedia: ${enrichment.wikipediaExcerpt ?? "not found"}`,
    `- Google rating: ${enrichment.googleRating ?? "unknown"} (${enrichment.googleReviewCount ?? "unknown"} reviews)`,
    `- Years operating (est.): ${enrichment.yearsOperating ?? "unknown"}`,
  ];

  if (enrichment.pressSnippets.length > 0) {
    lines.push("- Press snippets:");
    for (const snippet of enrichment.pressSnippets) {
      lines.push(`  • ${snippet}`);
    }
  } else {
    lines.push("- Press snippets: none found");
  }

  lines.push(
    "Iconic Miami institutions may deserve higher trust baselines even if the website is dated.",
  );

  return lines.join("\n");
}

function buildAuditPrompt(
  snapshot: SiteSnapshot,
  repair = false,
  enrichment?: EnrichmentContext,
): string {
  const contact = [
    snapshot.contact.phone && `Phone: ${snapshot.contact.phone}`,
    snapshot.contact.email && `Email: ${snapshot.contact.email}`,
    snapshot.contact.address && `Address: ${snapshot.contact.address}`,
  ]
    .filter(Boolean)
    .join("\n");

  const repairNote = repair
    ? "\n\nIMPORTANT: Your previous response failed validation. Return ONLY the emit_audit tool with complete, schema-valid fields."
    : "";

  return `You are auditing a small Miami business website. Score honestly (0–100 per dimension). Write reasons in plain language a business owner understands — no jargon.

Business: ${snapshot.businessName}
URL: ${snapshot.url ?? "unknown"}
Degraded snapshot: ${snapshot.degraded}
Title: ${snapshot.title ?? "none"}
Description: ${snapshot.description ?? "none"}
Headings: ${snapshot.headings.join(" | ") || "none"}
Contact:
${contact || "none found"}

Site content excerpt:
${snapshot.rawText.slice(0, 4000)}

Use the emit_audit tool. Include brand.palette with at least 2 hex colors (default Miami neon: #ff2d95, #00f0ff, #9d4edd, #ff6b35). Extract real contact info when present; use null when missing.${enrichment ? buildEnrichmentBlock(enrichment) : ""}${repairNote}`;
}

async function streamAuditCall(
  client: Anthropic,
  snapshot: SiteSnapshot,
  onReasoning: ((delta: string) => void) | undefined,
  repair: boolean,
  enrichment?: EnrichmentContext,
): Promise<unknown> {
  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    tools: [EMIT_AUDIT_TOOL],
    tool_choice: { type: "tool", name: "emit_audit" },
    messages: [
      {
        role: "user",
        content: buildAuditPrompt(snapshot, repair, enrichment),
      },
    ],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onReasoning?.(event.delta.text);
    }
  }

  const final = await stream.finalMessage();
  const toolBlock = final.content.find(
    (b) => b.type === "tool_use" && b.name === "emit_audit",
  );

  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Model did not return emit_audit tool output");
  }

  return toolBlock.input;
}

export async function auditSite(
  snapshot: SiteSnapshot,
  opts?: AuditOptions,
): Promise<SiteAudit> {
  if (opts?.demoSlug) {
    const demo = getDemo(opts.demoSlug);
    if (demo) return demo.audit;
  }

  if (isDemoMode()) {
    const demo = findDemoByName(snapshot.businessName);
    if (demo) return demo.audit;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    opts?.onReasoning?.("No ANTHROPIC_API_KEY — using deterministic fallback.\n");
    return buildFallbackAudit(snapshot);
  }

  const client = new Anthropic({ apiKey: key });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await streamAuditCall(
        client,
        snapshot,
        opts?.onReasoning,
        attempt > 0,
        opts?.enrichment,
      );
      return SiteAuditSchema.parse(raw);
    } catch (err) {
      if (attempt === 0) {
        opts?.onReasoning?.(
          "\nValidation failed — retrying with repair prompt…\n",
        );
        continue;
      }
      opts?.onReasoning?.(
        `\nAudit failed (${err instanceof Error ? err.message : "unknown"}) — using fallback.\n`,
      );
      return buildFallbackAudit(snapshot);
    }
  }

  return buildFallbackAudit(snapshot);
}

import type { EnrichmentContext, SiteAudit, SiteSnapshot } from "@/lib/schema";
import { SiteAuditSchema } from "@/lib/schema";
import { buildFallbackAudit } from "@/lib/agent/fallbackAudit";
import { getDemo, findDemoByName, isDemoMode } from "@/lib/demo/seed";

const AUDIT_BASE_URL = "https://api.deepinfra.com/v1/openai";
const AUDIT_MODEL = process.env.AUDIT_MODEL ?? "deepseek-ai/DeepSeek-V4-Flash";
const AUDIT_KEY = process.env.DEEPINFRA_API_KEY;

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

function jsonShapeInstruction(): string {
  return `

Respond with ONLY one JSON object (no markdown fences) matching this exact shape:
{
  "businessName": string,
  "category": string,
  "overallScore": integer 0-100,
  "dimensions": {
    "clarity": { "score": integer 0-100, "reason": string },
    "trust": { "score": integer 0-100, "reason": string },
    "mobile": { "score": integer 0-100, "reason": string },
    "speed": { "score": integer 0-100, "reason": string },
    "conversion": { "score": integer 0-100, "reason": string },
    "localSeo": { "score": integer 0-100, "reason": string }
  },
  "topFixes": [ string, string, string ] (1 to 3 items),
  "brand": {
    "tagline": string,
    "phone": string | null,
    "address": string | null,
    "email": string | null,
    "palette": [ string, string ] (at least 2 hex colors),
    "services": [ string ]
  },
  "brandTier": "iconic" | "established" | "generic" (optional)
}`;
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
    ? "\n\nIMPORTANT: Your previous response failed validation. Return ONLY a single JSON object with complete, schema-valid fields. No markdown, no prose."
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

Include brand.palette with at least 2 hex colors (default Miami neon: #ff2d95, #00f0ff, #9d4edd, #ff6b35). Extract real contact info when present; use null when missing.${enrichment ? buildEnrichmentBlock(enrichment) : ""}${jsonShapeInstruction()}${repairNote}`;
}

function extractAuditJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found in audit response");
    }
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  }
}

type ChatCompletionChunk = {
  choices?: { delta?: { content?: string } }[];
};

async function streamAuditCall(
  snapshot: SiteSnapshot,
  onReasoning: ((delta: string) => void) | undefined,
  repair: boolean,
  enrichment?: EnrichmentContext,
): Promise<string> {
  const key = AUDIT_KEY;
  if (!key) {
    throw new Error("DEEPINFRA_API_KEY is not set");
  }

  const res = await fetch(`${AUDIT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AUDIT_MODEL,
      stream: true,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a website auditor. Respond with ONLY a JSON object matching the requested schema. No markdown, no prose.",
        },
        {
          role: "user",
          content: buildAuditPrompt(snapshot, repair, enrichment),
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Audit API failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body from audit API");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as ChatCompletionChunk;
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          accumulated += delta;
          onReasoning?.(delta);
        }
      } catch {
        // skip malformed SSE chunk
      }
    }
  }

  if (!accumulated.trim()) {
    throw new Error("Empty audit response from model");
  }

  return accumulated;
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

  if (!AUDIT_KEY) {
    opts?.onReasoning?.("No DEEPINFRA_API_KEY — using deterministic fallback.\n");
    return buildFallbackAudit(snapshot);
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const rawText = await streamAuditCall(
        snapshot,
        opts?.onReasoning,
        attempt > 0,
        opts?.enrichment,
      );
      const raw = extractAuditJson(rawText);
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

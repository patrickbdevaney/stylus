import type { SiteAudit, SiteSnapshot } from "@/lib/schema";

const BASE = "https://api.deepinfra.com/v1/openai";
const MODEL = process.env.AUDIT_MODEL ?? "deepseek-ai/DeepSeek-V4-Flash";
const KEY = process.env.DEEPINFRA_API_KEY;

const FALLBACK = { confidence: 72, adjustments: [] as string[] };

type CritiqueJson = {
  confidence?: number;
  adjustments?: string[];
};

function parseCritiqueJson(text: string): CritiqueJson {
  try {
    return JSON.parse(text) as CritiqueJson;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object in critique response");
    }
    return JSON.parse(text.slice(start, end + 1)) as CritiqueJson;
  }
}

function normalizeCritique(raw: CritiqueJson): {
  confidence: number;
  adjustments: string[];
} {
  const confidence =
    typeof raw.confidence === "number" && !Number.isNaN(raw.confidence)
      ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
      : FALLBACK.confidence;

  const adjustments = Array.isArray(raw.adjustments)
    ? raw.adjustments
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .slice(0, 2)
    : [];

  return { confidence, adjustments };
}

export async function critiqueAudit(
  audit: SiteAudit,
  snapshot: SiteSnapshot,
  onReasoning?: (delta: string) => void,
): Promise<{ confidence: number; adjustments: string[] }> {
  if (!KEY) {
    return { ...FALLBACK, adjustments: [] };
  }

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a skeptical audit reviewer. Respond ONLY with JSON.",
          },
          {
            role: "user",
            content: `Given this website audit JSON, rate 0-100 how well-grounded the scores are in the actual site evidence, and list up to 2 dimensions whose scores look too generous or too harsh. Audit: ${JSON.stringify(audit)}
Site excerpt: ${snapshot.rawText.slice(0, 1500)}
Return ONLY {"confidence":number,"adjustments":string[]}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      return { ...FALLBACK, adjustments: [] };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (content) {
      onReasoning?.(content);
    }

    return normalizeCritique(parseCritiqueJson(content));
  } catch {
    return { ...FALLBACK, adjustments: [] };
  }
}

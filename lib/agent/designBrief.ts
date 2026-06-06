import {
  DesignBriefSchema,
  type BrandTokens,
  type DesignBrief,
  type LandscapeAnalysis,
  type SiteAudit,
} from "@/lib/schema";

const BRIEF_BASE_URL = "https://api.deepinfra.com/v1/openai";
const BRIEF_MODEL = process.env.AUDIT_MODEL ?? "deepseek-ai/DeepSeek-V4-Flash";
const BRIEF_KEY = process.env.DEEPINFRA_API_KEY;

const COLOR_ROLE_ORDER = [
  "primary",
  "secondary",
  "accent",
  "background",
  "text",
  "border",
  "unknown",
] as const;

type BrandTier = "iconic" | "established" | "generic";

function voiceForTier(brandTier: BrandTier): string {
  if (brandTier === "iconic") return "Heritage-forward and confident";
  if (brandTier === "established") return "Professional and trustworthy";
  return "Approachable and direct";
}

export function fallbackDesignBrief(
  archetype: LandscapeAnalysis["recommendedArchetype"],
  brandTier: BrandTier,
): DesignBrief {
  const voice = voiceForTier(brandTier);
  const differentiationVector =
    "Lead with clarity and conversion over visual novelty.";

  const defaults: Record<
    LandscapeAnalysis["recommendedArchetype"],
    Omit<DesignBrief, "archetype">
  > = {
    editorial: {
      voice,
      differentiationVector,
      primaryAction: "Explore the story and visit",
      recommendedLibraries: [
        { name: "shadcn", rationale: "Clean, ownership-first" },
      ],
      motionLevel: "subtle",
      typographyNote: "Serif display with readable body text",
      colorNote: "Restrained palette with strong typographic contrast",
    },
    luxury: {
      voice,
      differentiationVector,
      primaryAction: "Reserve or inquire",
      recommendedLibraries: [
        { name: "shadcn", rationale: "Restrained components" },
      ],
      motionLevel: "none",
      typographyNote: "Elegant sans-serif with generous whitespace",
      colorNote: "Deep neutrals with one accent highlight",
    },
    tech: {
      voice,
      differentiationVector,
      primaryAction: "Get started or learn more",
      recommendedLibraries: [
        { name: "aceternity", rationale: "Animated impact" },
        { name: "shadcn", rationale: "Clean secondary" },
      ],
      motionLevel: "rich",
      typographyNote: "Modern sans-serif with tight hierarchy",
      colorNote: "High-contrast accent on dark or light base",
    },
    "warm-local": {
      voice,
      differentiationVector,
      primaryAction: "Visit us or call now",
      recommendedLibraries: [
        { name: "daisyui", rationale: "Warm, approachable components" },
      ],
      motionLevel: "subtle",
      typographyNote: "Friendly readable fonts with local character",
      colorNote: "Warm earth tones and inviting accents",
    },
    playful: {
      voice,
      differentiationVector,
      primaryAction: "Join in or explore",
      recommendedLibraries: [
        { name: "aceternity", rationale: "High-energy motion" },
        { name: "daisyui", rationale: "Bright components" },
      ],
      motionLevel: "rich",
      typographyNote: "Bold display type with energetic rhythm",
      colorNote: "Vibrant multi-hue palette with neon accents",
    },
    generic: {
      voice,
      differentiationVector,
      primaryAction: "Contact or visit today",
      recommendedLibraries: [
        { name: "shadcn", rationale: "Versatile default" },
      ],
      motionLevel: "subtle",
      typographyNote: "Clear sans-serif hierarchy",
      colorNote: "Brand palette applied with accessible contrast",
    },
  };

  return DesignBriefSchema.parse({
    archetype,
    ...defaults[archetype],
  });
}

function topColorsByRole(tokens: BrandTokens): string[] {
  const byRole = new Map(tokens.colors.map((color) => [color.role, color.value]));
  const selected: string[] = [];

  for (const role of COLOR_ROLE_ORDER) {
    const value = byRole.get(role);
    if (value && !selected.includes(value)) {
      selected.push(`${role}: ${value}`);
    }
    if (selected.length >= 5) break;
  }

  return selected;
}

function jsonShapeInstruction(): string {
  return `

Return ONLY one JSON object (no markdown fences):
{
  "archetype": "editorial" | "tech" | "warm-local" | "luxury" | "playful" | "generic",
  "voice": string,
  "differentiationVector": string,
  "primaryAction": string,
  "recommendedLibraries": [{ "name": "shadcn" | "aceternity" | "mantine" | "heroui" | "daisyui", "rationale": string }] (1 to 3 items),
  "motionLevel": "none" | "subtle" | "rich",
  "typographyNote": string,
  "colorNote": string
}`;
}

function buildBriefPrompt(
  audit: SiteAudit,
  tokens: BrandTokens,
  landscape: LandscapeAnalysis,
  repair = false,
): string {
  const brandTier = audit.brandTier ?? "generic";
  const colors = topColorsByRole(tokens);
  const fonts = tokens.fonts.map(
    (font) => `${font.role}: ${font.family} (${font.weights.join(", ")})`,
  );

  const repairNote = repair
    ? "\n\nIMPORTANT: Your previous response failed validation. Return ONLY a single JSON object with complete, schema-valid fields. No markdown, no prose."
    : "";

  return `You are a design strategist for Miami SMB website rebuilds. Convert brand tokens and competitor landscape into a concise design brief for variant generation.

Business: ${audit.businessName}
Category: ${audit.category}
Brand tier: ${brandTier}
Overall audit score: ${audit.overallScore}/100
Top fixes: ${audit.topFixes.join("; ")}

Extracted brand colors (by role):
${colors.length > 0 ? colors.join("\n") : "none extracted"}

Extracted fonts:
${fonts.length > 0 ? fonts.join("\n") : "none extracted"}

Competitor landscape:
- Recommended archetype: ${landscape.recommendedArchetype}
- Differentiation: ${landscape.differentiationVector}
- Shared competitor color tendency: ${landscape.sharedColorTendency.dominantHue} / ${landscape.sharedColorTendency.saturation} / ${landscape.sharedColorTendency.lightness}
- Shared competitor font style: ${landscape.sharedFontStyle}
- Target color tendency: ${landscape.targetColorTendency.dominantHue} / ${landscape.targetColorTendency.saturation} / ${landscape.targetColorTendency.lightness}
- Target font style: ${landscape.targetFontStyle}

Align archetype with landscape unless audit fixes strongly suggest otherwise. Keep voice plain-language for business owners.${jsonShapeInstruction()}${repairNote}`;
}

function extractBriefJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found in design brief response");
    }
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  }
}

type ChatCompletionChunk = {
  choices?: { delta?: { content?: string } }[];
};

async function streamBriefCall(
  audit: SiteAudit,
  tokens: BrandTokens,
  landscape: LandscapeAnalysis,
  onReasoning: ((delta: string) => void) | undefined,
  repair: boolean,
): Promise<string> {
  const key = BRIEF_KEY;
  if (!key) {
    throw new Error("DEEPINFRA_API_KEY is not set");
  }

  const res = await fetch(`${BRIEF_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: BRIEF_MODEL,
      stream: true,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a design strategist. Respond with ONLY a JSON object matching the requested schema. No markdown, no prose.",
        },
        {
          role: "user",
          content: buildBriefPrompt(audit, tokens, landscape, repair),
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Design brief API failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body from design brief API");
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
    throw new Error("Empty design brief response from model");
  }

  return accumulated;
}

export async function generateDesignBrief(
  audit: SiteAudit,
  tokens: BrandTokens,
  landscape: LandscapeAnalysis,
  opts?: { onReasoning?: (d: string) => void },
): Promise<DesignBrief> {
  const brandTier = audit.brandTier ?? "generic";

  if (!BRIEF_KEY) {
    opts?.onReasoning?.("No DEEPINFRA_API_KEY — using deterministic fallback.\n");
    return fallbackDesignBrief(landscape.recommendedArchetype, brandTier);
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const rawText = await streamBriefCall(
        audit,
        tokens,
        landscape,
        opts?.onReasoning,
        attempt > 0,
      );
      const raw = extractBriefJson(rawText);
      return DesignBriefSchema.parse(raw);
    } catch (err) {
      if (attempt === 0) {
        opts?.onReasoning?.(
          "\nValidation failed — retrying with repair prompt…\n",
        );
        continue;
      }
      opts?.onReasoning?.(
        `\nDesign brief failed (${err instanceof Error ? err.message : "unknown"}) — using fallback.\n`,
      );
      return fallbackDesignBrief(landscape.recommendedArchetype, brandTier);
    }
  }

  return fallbackDesignBrief(landscape.recommendedArchetype, brandTier);
}

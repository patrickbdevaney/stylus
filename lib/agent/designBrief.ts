import {
  DesignBriefArraySchema,
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

type BriefSemantics = Pick<
  DesignBrief,
  | "archetype"
  | "voice"
  | "differentiationVector"
  | "primaryAction"
  | "typographyNote"
  | "colorNote"
  | "motionLevel"
>;

function voiceForTier(brandTier: BrandTier): string {
  if (brandTier === "iconic") return "Heritage-forward and confident";
  if (brandTier === "established") return "Professional and trustworthy";
  return "Approachable and direct";
}

function fallbackDesignBrief(
  archetype: LandscapeAnalysis["recommendedArchetype"],
  brandTier: BrandTier,
): BriefSemantics {
  const voice = voiceForTier(brandTier);
  const differentiationVector =
    "Lead with clarity and conversion over visual novelty.";

  const defaults: Record<
    LandscapeAnalysis["recommendedArchetype"],
    BriefSemantics
  > = {
    editorial: {
      archetype: "editorial",
      voice,
      differentiationVector,
      primaryAction: "Explore the story and visit",
      motionLevel: "subtle",
      typographyNote: "Serif display with readable body text",
      colorNote: "Restrained palette with strong typographic contrast",
    },
    luxury: {
      archetype: "luxury",
      voice,
      differentiationVector,
      primaryAction: "Reserve or inquire",
      motionLevel: "none",
      typographyNote: "Elegant sans-serif with generous whitespace",
      colorNote: "Deep neutrals with one accent highlight",
    },
    tech: {
      archetype: "tech",
      voice,
      differentiationVector,
      primaryAction: "Get started or learn more",
      motionLevel: "rich",
      typographyNote: "Modern sans-serif with tight hierarchy",
      colorNote: "High-contrast accent on dark or light base",
    },
    "warm-local": {
      archetype: "warm-local",
      voice,
      differentiationVector,
      primaryAction: "Visit us or call now",
      motionLevel: "subtle",
      typographyNote: "Friendly readable fonts with local character",
      colorNote: "Warm earth tones and inviting accents",
    },
    playful: {
      archetype: "playful",
      voice,
      differentiationVector,
      primaryAction: "Join in or explore",
      motionLevel: "rich",
      typographyNote: "Bold display type with energetic rhythm",
      colorNote: "Vibrant multi-hue palette with neon accents",
    },
    generic: {
      archetype: "generic",
      voice,
      differentiationVector,
      primaryAction: "Contact or visit today",
      motionLevel: "subtle",
      typographyNote: "Clear sans-serif hierarchy",
      colorNote: "Brand palette applied with accessible contrast",
    },
  };

  return defaults[archetype];
}

function editorialColorMode(
  archetype: LandscapeAnalysis["recommendedArchetype"],
  brandTier: BrandTier,
): DesignBrief["colorMode"] {
  if (archetype === "luxury" || brandTier === "iconic") {
    return "dark";
  }
  return "light";
}

export function fallbackDesignBriefs(
  archetype: LandscapeAnalysis["recommendedArchetype"],
  brandTier: BrandTier,
): DesignBrief[] {
  const editorialSemantics = fallbackDesignBrief(archetype, brandTier);
  const techSemantics = fallbackDesignBrief("tech", brandTier);
  const localSemantics = fallbackDesignBrief("warm-local", brandTier);

  const briefs: DesignBrief[] = [
    DesignBriefSchema.parse({
      ...editorialSemantics,
      variantSlot: 0,
      variantLabel: "Editorial",
      heroType: "statement",
      servicesType: "strips",
      contactType: "minimal",
      navType: "minimal",
      spacingScale: "generous",
      typographyScale: "editorial",
      library: "shadcn",
      colorMode: editorialColorMode(archetype, brandTier),
      motionLevel: archetype === "luxury" ? "none" : "subtle",
    }),
    DesignBriefSchema.parse({
      ...techSemantics,
      variantSlot: 1,
      variantLabel: "Animated",
      heroType: "fullbleed",
      servicesType: "grid",
      contactType: "card",
      navType: "sticky-cta",
      spacingScale: "standard",
      typographyScale: "dramatic",
      library: "aceternity",
      colorMode: "dark",
      motionLevel: "rich",
    }),
    DesignBriefSchema.parse({
      ...localSemantics,
      variantSlot: 2,
      variantLabel: "Local",
      heroType: "centered",
      servicesType: "mosaic",
      contactType: "map-forward",
      navType: "sticky-cta",
      spacingScale: "dense",
      typographyScale: "functional",
      library: "daisyui",
      colorMode: "light",
      motionLevel: "subtle",
    }),
  ];

  return DesignBriefArraySchema.parse(briefs);
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

Return ONLY a JSON array of exactly 3 objects (no markdown fences):
[
  {
    "variantSlot": 0 | 1 | 2,
    "variantLabel": string,
    "heroType": "centered" | "split" | "fullbleed" | "statement",
    "servicesType": "grid" | "strips" | "mosaic" | "stats",
    "contactType": "minimal" | "card" | "map-forward",
    "navType": "minimal" | "sticky-cta" | "logo-centered",
    "spacingScale": "generous" | "standard" | "dense",
    "typographyScale": "dramatic" | "editorial" | "functional",
    "library": "shadcn" | "aceternity" | "daisyui",
    "colorMode": "dark" | "light",
    "motionLevel": "none" | "subtle" | "rich",
    "archetype": "editorial" | "tech" | "warm-local" | "luxury" | "playful" | "generic",
    "voice": string,
    "differentiationVector": string,
    "primaryAction": string,
    "typographyNote": string,
    "colorNote": string
  }
]`;
}

function buildMultiBriefPrompt(
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
  const bgColor = tokens.colors.find((color) => color.role === "background");
  const bgLightness = bgColor?.value
    ? /^(#(?:eee|fff|f[0-9a-f]{5})|white|rgb\(2[4-5])/i.test(bgColor.value)
      ? "light"
      : "dark"
    : landscape.targetColorTendency.lightness;

  const repairNote = repair
    ? "\n\nIMPORTANT: Your previous response failed validation. Return ONLY a JSON array of exactly 3 objects with complete, schema-valid fields. No markdown, no prose."
    : "";

  return `You are a design strategist for Miami SMB website rebuilds. Convert brand tokens and competitor landscape into THREE structurally distinct design briefs — one per variant slot.

Business: ${audit.businessName}
Category: ${audit.category}
Brand tier: ${brandTier}
Overall audit score: ${audit.overallScore}/100
Top fixes: ${audit.topFixes.join("; ")}

Extracted brand colors (by role):
${colors.length > 0 ? colors.join("\n") : "none extracted"}

Extracted fonts:
${fonts.length > 0 ? fonts.join("\n") : "none extracted"}

Brand background lightness signal: ${bgLightness}

Competitor landscape:
- Recommended archetype: ${landscape.recommendedArchetype}
- Differentiation: ${landscape.differentiationVector}
- Shared competitor color tendency: ${landscape.sharedColorTendency.dominantHue} / ${landscape.sharedColorTendency.saturation} / ${landscape.sharedColorTendency.lightness}
- Shared competitor font style: ${landscape.sharedFontStyle}
- Target color tendency: ${landscape.targetColorTendency.dominantHue} / ${landscape.targetColorTendency.saturation} / ${landscape.targetColorTendency.lightness}
- Target font style: ${landscape.targetFontStyle}

Return a JSON ARRAY of exactly 3 DesignBrief objects with these constraints:

Brief A (variantSlot 0, variantLabel "Editorial"): optimized for brand authority and long-term maintainability. library must be "shadcn". heroType must be "statement" or "split". motionLevel "none" or "subtle".

Brief B (variantSlot 1, variantLabel "Animated"): optimized for visual impact and first impressions. library must be "aceternity". heroType must be "fullbleed" or "centered". motionLevel "rich".

Brief C (variantSlot 2, variantLabel "Local"): optimized for walk-in and phone conversion. library must be "daisyui". heroType must be "centered" or "split". contactType must be "map-forward" or "card".

Each brief must differ from the other two on at least 3 of: heroType, servicesType, spacingScale, typographyScale, colorMode.

colorMode should reflect the brand's actual background token lightness (${bgLightness} background → prefer ${bgLightness === "dark" ? "dark" : "light"} mode unless contrast requires otherwise).

servicesType: use "stats" only if the business has notable review counts or years-operating signals. Otherwise use "grid", "strips", or "mosaic".${jsonShapeInstruction()}${repairNote}`;
}

function extractBriefArrayJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON array found in design brief response");
    }
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  }
}

type ChatCompletionChunk = {
  choices?: { delta?: { content?: string } }[];
};

async function streamMultiBriefCall(
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
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a design strategist. Respond with ONLY a JSON array of exactly 3 brief objects matching the requested schema. No markdown, no prose.",
        },
        {
          role: "user",
          content: buildMultiBriefPrompt(audit, tokens, landscape, repair),
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

export async function generateDesignBriefs(
  audit: SiteAudit,
  tokens: BrandTokens,
  landscape: LandscapeAnalysis,
  opts?: { onReasoning?: (d: string) => void },
): Promise<DesignBrief[]> {
  const brandTier = audit.brandTier ?? "generic";

  if (!BRIEF_KEY) {
    opts?.onReasoning?.("No DEEPINFRA_API_KEY — using deterministic fallback.\n");
    return fallbackDesignBriefs(landscape.recommendedArchetype, brandTier);
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const rawText = await streamMultiBriefCall(
        audit,
        tokens,
        landscape,
        opts?.onReasoning,
        attempt > 0,
      );
      const raw = extractBriefArrayJson(rawText);
      return DesignBriefArraySchema.parse(raw);
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
      return fallbackDesignBriefs(landscape.recommendedArchetype, brandTier);
    }
  }

  return fallbackDesignBriefs(landscape.recommendedArchetype, brandTier);
}

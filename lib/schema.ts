import { z } from "zod";

export const DimensionScore = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string().min(1),
});

export const SiteAuditSchema = z.object({
  businessName: z.string(),
  category: z.string(),
  overallScore: z.number().int().min(0).max(100),
  dimensions: z.object({
    clarity: DimensionScore,
    trust: DimensionScore,
    mobile: DimensionScore,
    speed: DimensionScore,
    conversion: DimensionScore,
    localSeo: DimensionScore,
  }),
  topFixes: z.array(z.string().min(1)).min(1).max(3),
  brand: z.object({
    tagline: z.string(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    email: z.string().nullable(),
    palette: z.array(z.string()).min(2),
    services: z.array(z.string()),
  }),
  brandTier: z.enum(["iconic", "established", "generic"]).optional(),
});
export type SiteAudit = z.infer<typeof SiteAuditSchema>;

export const SiteSnapshotSchema = z.object({
  businessName: z.string(),
  url: z.string().nullable(),
  degraded: z.boolean(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  headings: z.array(z.string()),
  contact: z.object({
    phone: z.string().nullable(),
    address: z.string().nullable(),
    email: z.string().nullable(),
  }),
  rawText: z.string(),
  screenshot: z.string().nullable(),
});
export type SiteSnapshot = z.infer<typeof SiteSnapshotSchema>;

export const ResolveResultSchema = z.object({
  url: z.string().nullable(),
  businessName: z.string(),
  resolved: z.boolean(),
});
export type ResolveResult = z.infer<typeof ResolveResultSchema>;

export const GeneratedVariantSchema = z.object({
  files: z.record(z.string(), z.string()),
  library: z.string(),
  archetype: z.string(),
  businessName: z.string(),
  variantLabel: z.string(),
  differentiationRationale: z.string(),
  tokensJson: z.string(),
  previewHtml: z.string(),
});

export type GeneratedVariant = z.infer<typeof GeneratedVariantSchema>;

/** @deprecated use GeneratedVariantSchema */
export const GeneratedSiteSchema = GeneratedVariantSchema;
export type GeneratedSite = GeneratedVariant;

export const DeployResultSchema = z.object({
  url: z.string().url(),
  provider: z.enum(["vercel", "cloudflare"]),
  ms: z.number().int().nonnegative(),
});
export type DeployResult = z.infer<typeof DeployResultSchema>;

export type DemoBusiness = {
  slug: string;
  name: string;
  category: string;
};

export type DemoCacheEntry = DemoBusiness & {
  snapshot: SiteSnapshot;
  audit: SiteAudit;
  reasoningTrace?: string[];
  deployFallbackUrl?: string;
};

export type PipelineStep =
  | "resolve"
  | "fetch"
  | "enrich"
  | "audit"
  | "generate"
  | "deploy";

import type { LighthouseDelta } from "@/lib/lighthouse";

export const BrandColorSchema = z.object({
  role: z.enum([
    "primary",
    "secondary",
    "accent",
    "background",
    "text",
    "border",
    "unknown",
  ]),
  value: z.string(),
  confidence: z.number().min(0).max(1),
});

export const BrandFontSchema = z.object({
  role: z.enum(["display", "body", "mono", "accent", "unknown"]),
  family: z.string(),
  weights: z.array(z.number()),
});

export const BrandMotionSchema = z.object({
  duration: z.string().optional(),
  easing: z.string().optional(),
  hasParallax: z.boolean(),
  hasScrollAnimation: z.boolean(),
});

export const BrandTokensSchema = z.object({
  colors: z.array(BrandColorSchema).min(1),
  fonts: z.array(BrandFontSchema).min(1),
  spacing: z.array(z.number()),
  radii: z.array(z.number()),
  shadows: z.array(z.string()),
  motion: BrandMotionSchema.optional(),
  logo: z.string().nullable(),
  extractedAt: z.string(),
  sourceUrl: z.string().nullable(),
  degraded: z.boolean(),
});

export type BrandTokens = z.infer<typeof BrandTokensSchema>;
export type BrandColor = z.infer<typeof BrandColorSchema>;
export type BrandFont = z.infer<typeof BrandFontSchema>;

export const ColorTendencySchema = z.object({
  dominantHue: z.enum([
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "neutral",
    "dark",
    "multi",
  ]),
  saturation: z.enum(["vibrant", "muted", "neutral"]),
  lightness: z.enum(["light", "mid", "dark"]),
});

export const LandscapeAnalysisSchema = z.object({
  competitorCount: z.number().int(),
  sharedColorTendency: ColorTendencySchema,
  sharedFontStyle: z.enum(["serif", "sans-serif", "mixed", "mono"]),
  targetColorTendency: ColorTendencySchema,
  targetFontStyle: z.enum(["serif", "sans-serif", "mixed", "mono"]),
  differentiationVector: z.string(),
  recommendedArchetype: z.enum([
    "editorial",
    "tech",
    "warm-local",
    "luxury",
    "playful",
    "generic",
  ]),
  competitorUrls: z.array(z.string()),
  degraded: z.boolean(),
});

export type ColorTendency = z.infer<typeof ColorTendencySchema>;
export type LandscapeAnalysis = z.infer<typeof LandscapeAnalysisSchema>;

export const LibraryChoiceSchema = z.object({
  name: z.enum(["shadcn", "aceternity", "mantine", "heroui", "daisyui"]),
  rationale: z.string(),
});

export const HeroTypeSchema = z.enum([
  "centered",
  "split",
  "fullbleed",
  "statement",
]);
export type HeroType = z.infer<typeof HeroTypeSchema>;

export const ServicesTypeSchema = z.enum([
  "grid",
  "strips",
  "mosaic",
  "stats",
]);
export type ServicesType = z.infer<typeof ServicesTypeSchema>;

export const ContactTypeSchema = z.enum([
  "minimal",
  "card",
  "map-forward",
]);
export type ContactType = z.infer<typeof ContactTypeSchema>;

export const NavTypeSchema = z.enum([
  "minimal",
  "sticky-cta",
  "logo-centered",
]);
export type NavType = z.infer<typeof NavTypeSchema>;

export const SpacingScaleSchema = z.enum([
  "generous",
  "standard",
  "dense",
]);

export const TypographyScaleSchema = z.enum([
  "dramatic",
  "editorial",
  "functional",
]);

export const DesignBriefSchema = z.object({
  heroType: HeroTypeSchema,
  servicesType: ServicesTypeSchema,
  contactType: ContactTypeSchema,
  navType: NavTypeSchema,
  spacingScale: SpacingScaleSchema,
  typographyScale: TypographyScaleSchema,
  library: z.enum(["shadcn", "aceternity", "daisyui"]),
  colorMode: z.enum(["dark", "light"]),
  motionLevel: z.enum(["none", "subtle", "rich"]),
  archetype: z.enum([
    "editorial",
    "tech",
    "warm-local",
    "luxury",
    "playful",
    "generic",
  ]),
  voice: z.string(),
  differentiationVector: z.string(),
  primaryAction: z.string(),
  typographyNote: z.string(),
  colorNote: z.string(),
  variantSlot: z.number().int().min(0).max(2),
  variantLabel: z.string(),
});

export type DesignBrief = z.infer<typeof DesignBriefSchema>;

export const DesignBriefArraySchema = z.array(DesignBriefSchema).length(3);
export type DesignBriefArray = z.infer<typeof DesignBriefArraySchema>;

export type EnrichmentContext = {
  wikipediaExcerpt: string | null;
  googleReviewCount: number | null;
  googleRating: number | null;
  yearsOperating: number | null;
  pressSnippets: string[];
  brandTier: "iconic" | "established" | "generic";
  brandTokens?: BrandTokens;
};

export type StreamEvent =
  | {
      type: "step";
      step: PipelineStep;
      status: "start" | "done";
      message: string;
    }
  | { type: "reasoning"; delta: string }
  | { type: "resolve"; data: ResolveResult }
  | { type: "snapshot"; data: SiteSnapshot }
  | { type: "audit"; data: SiteAudit }
  | { type: "deploy"; data: DeployResult }
  | { type: "shots"; beforeUrl: string | null; afterUrl: string | null }
  | { type: "lighthouse"; data: LighthouseDelta }
  | { type: "seo_validation"; passed: boolean; items: number }
  | { type: "critique"; confidence: number; adjustments: string[] }
  | { type: "variant_progress"; message: string }
  | {
      type: "provider_result";
      provider: string;
      ms: number;
      won: boolean;
    }
  | {
      type: "variant_winner";
      variantIndex: number;
      score: number;
      totalMs: number;
    }
  | { type: "agent_spawn"; agent: string; role: string }
  | { type: "agent_active"; agent: string; detail: string }
  | { type: "agent_done"; agent: string; ms: number; output: string }
  | { type: "agent_handoff"; from: string; to: string }
  | {
      type: "agent_verdict";
      agent: string;
      accepted: string;
      rejected: string[];
      reason: string;
    }
  | { type: "brand_tokens"; data: BrandTokens }
  | { type: "landscape"; data: LandscapeAnalysis }
  | { type: "design_briefs"; data: DesignBrief[] }
  | {
      type: "variant_ready";
      data: {
        variantIndex: number;
        label: string;
        archetype: string;
        library: string;
        previewHtml: string;
        rationale: string;
      };
    }
  | { type: "variant_files"; variantIndex: number; files: Record<string, string> }
  | { type: "done" }
  | { type: "error"; message: string };

/** @deprecated use PipelineStep */
export type AuditStep = PipelineStep;

import type {
  BrandTokens,
  DesignBrief,
  EnrichmentContext,
  GeneratedVariant,
  SiteAudit,
} from "@/lib/schema";
import { buildAnimatedLandingVariant } from "./animatedLandingVariant";
import { buildEditorialVariant } from "./editorialVariant";
import { buildLocalWarmVariant } from "./localWarmVariant";
import { buildFallbackVariant } from "./variantUtils";

const BUILDERS = [
  { fn: buildEditorialVariant, label: "Editorial" },
  { fn: buildAnimatedLandingVariant, label: "Animated" },
  { fn: buildLocalWarmVariant, label: "Local" },
] as const;

export { buildEditorialVariant } from "./editorialVariant";
export { buildAnimatedLandingVariant } from "./animatedLandingVariant";
export { buildLocalWarmVariant } from "./localWarmVariant";

async function runBuilder(
  builder: (typeof BUILDERS)[number]["fn"],
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
  enrichment?: EnrichmentContext,
): Promise<GeneratedVariant> {
  if (builder === buildLocalWarmVariant) {
    return buildLocalWarmVariant(audit, tokens, brief, enrichment);
  }
  return builder(audit, tokens, brief);
}

export async function buildVariants(
  audit: SiteAudit,
  tokens: BrandTokens,
  briefs: DesignBrief[],
  onVariantReady?: (
    index: number,
    variant: GeneratedVariant,
    brief: DesignBrief,
  ) => void,
  enrichment?: EnrichmentContext,
): Promise<GeneratedVariant[]> {
  const results = await Promise.allSettled(
    BUILDERS.map(({ fn }, index) =>
      runBuilder(
        fn,
        audit,
        tokens,
        briefs[index] ?? briefs[0],
        enrichment,
      ),
    ),
  );

  const variants: GeneratedVariant[] = [];

  for (let index = 0; index < BUILDERS.length; index++) {
    const result = results[index];
    const label = BUILDERS[index].label;
    const brief = briefs[index] ?? briefs[0];

    if (result.status === "fulfilled") {
      onVariantReady?.(index, result.value, brief);
      variants.push(result.value);
      continue;
    }

    const fallback = buildFallbackVariant(
      audit,
      tokens,
      brief,
      label,
      "Fallback to v1 template after variant builder failure.",
    );
    onVariantReady?.(index, fallback, brief);
    variants.push(fallback);
  }

  return variants;
}

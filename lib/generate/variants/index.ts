import type {
  BrandTokens,
  DesignBrief,
  GeneratedVariant,
  SiteAudit,
} from "@/lib/schema";
import { buildAnimatedLandingVariant } from "./animatedLandingVariant";
import { buildEditorialVariant } from "./editorialVariant";
import { buildLocalWarmVariant } from "./localWarmVariant";
import { buildFallbackVariant } from "./variantUtils";

const BUILDERS = [
  buildEditorialVariant,
  buildAnimatedLandingVariant,
  buildLocalWarmVariant,
] as const;

const LABELS = ["Editorial", "Animated Landing", "Local Warm"] as const;

export { buildEditorialVariant } from "./editorialVariant";
export { buildAnimatedLandingVariant } from "./animatedLandingVariant";
export { buildLocalWarmVariant } from "./localWarmVariant";

export async function buildVariants(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
  onVariantReady?: (index: number, variant: GeneratedVariant) => void,
): Promise<GeneratedVariant[]> {
  const results = await Promise.allSettled(
    BUILDERS.map((builder) => builder(audit, tokens, brief)),
  );

  const variants: GeneratedVariant[] = [];

  for (let index = 0; index < BUILDERS.length; index++) {
    const result = results[index];
    const label = LABELS[index];

    if (result.status === "fulfilled") {
      onVariantReady?.(index, result.value);
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
    onVariantReady?.(index, fallback);
    variants.push(fallback);
  }

  return variants;
}

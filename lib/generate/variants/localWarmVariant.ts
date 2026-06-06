import type { BrandTokens, DesignBrief, GeneratedVariant, SiteAudit } from "@/lib/schema";
import { assembleVariant, buildVariantPage } from "./variantUtils";

export async function buildLocalWarmVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
): Promise<GeneratedVariant> {
  return assembleVariant(
    audit,
    tokens,
    brief,
    "Local Warm",
    "Approachable neighborhood tone with warm palette emphasis and local trust cues.",
    buildVariantPage(
      audit,
      brief,
      audit.brand.tagline,
      brief.differentiationVector,
    ),
  );
}

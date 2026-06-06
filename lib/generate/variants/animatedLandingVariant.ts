import type { BrandTokens, DesignBrief, GeneratedVariant, SiteAudit } from "@/lib/schema";
import { assembleVariant, buildVariantPage } from "./variantUtils";

export async function buildAnimatedLandingVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
): Promise<GeneratedVariant> {
  return assembleVariant(
    audit,
    tokens,
    brief,
    "Animated Landing",
    "High-impact motion and bold hero treatment for conversion-focused landing pages.",
    buildVariantPage(
      audit,
      brief,
      audit.brand.tagline,
      `${brief.colorNote} Motion level: ${brief.motionLevel}.`,
    ),
  );
}

import type { BrandTokens, DesignBrief, GeneratedVariant, SiteAudit } from "@/lib/schema";
import { assembleVariant, buildVariantPage } from "./variantUtils";

export async function buildEditorialVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
): Promise<GeneratedVariant> {
  return assembleVariant(
    audit,
    tokens,
    brief,
    "Editorial",
    "Serif-forward hierarchy with restrained motion and editorial whitespace.",
    buildVariantPage(
      audit,
      brief,
      audit.brand.tagline,
      brief.typographyNote,
    ),
  );
}

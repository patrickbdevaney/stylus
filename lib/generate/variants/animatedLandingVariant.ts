import { composeVariant } from "./compositor";
import type { BrandTokens, DesignBrief, GeneratedVariant, SiteAudit } from "@/lib/schema";

export async function buildAnimatedLandingVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
): Promise<GeneratedVariant> {
  return composeVariant(audit, tokens, brief);
}

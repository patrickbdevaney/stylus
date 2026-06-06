import { composeVariant } from "./compositor";
import type {
  BrandTokens,
  DesignBrief,
  EnrichmentContext,
  GeneratedVariant,
  SiteAudit,
} from "@/lib/schema";

export async function buildLocalWarmVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
  enrichment?: EnrichmentContext,
): Promise<GeneratedVariant> {
  return composeVariant(audit, tokens, brief, enrichment);
}

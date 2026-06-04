import type { DemoBusiness } from "@/lib/schema";
import type { SiteAudit, SiteSnapshot } from "@/lib/schema";

export function getDemoBusinesses(): DemoBusiness[] {
  return [];
}

export function getDemo(
  _slug: string,
): { snapshot: SiteSnapshot; audit: SiteAudit } | null {
  return null;
}

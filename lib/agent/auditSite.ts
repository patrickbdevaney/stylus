import type { SiteSnapshot, SiteAudit } from "@/lib/schema";

export async function auditSite(_s: SiteSnapshot): Promise<SiteAudit> {
  throw new Error("Not implemented — agent step 2");
}

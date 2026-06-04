import type { GeneratedSite, SiteAudit } from "@/lib/schema";
import { renderEmptyShell, renderFromAudit } from "@/lib/template/singlePage";

export async function generateSite(audit: SiteAudit): Promise<GeneratedSite> {
  const html = renderFromAudit(audit);
  return { html, businessName: audit.businessName };
}

export async function generateSiteFromOpts(opts?: {
  audit?: SiteAudit;
  businessName?: string;
}): Promise<GeneratedSite> {
  if (opts?.audit) return generateSite(opts.audit);
  const businessName = opts?.businessName ?? "Stylus Demo";
  return { html: renderEmptyShell(businessName), businessName };
}

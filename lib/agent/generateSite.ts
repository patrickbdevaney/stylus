import type { GeneratedSite, SiteAudit } from "@/lib/schema";
import { renderEmptyShell, renderFromAudit } from "@/lib/template/singlePage";

export async function generateSite(opts?: {
  audit?: SiteAudit;
  businessName?: string;
}): Promise<GeneratedSite> {
  const businessName =
    opts?.audit?.businessName ?? opts?.businessName ?? "Stylus Demo";
  const html = opts?.audit
    ? renderFromAudit(opts.audit)
    : renderEmptyShell(businessName);
  return { html, businessName };
}

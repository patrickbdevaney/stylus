import { NextResponse } from "next/server";
import { generateSite, generateSiteFromOpts } from "@/lib/agent/generateSite";
import { deploySite } from "@/lib/agent/deploySite";
import { SiteAuditSchema } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    let audit;
    if (body.audit) {
      audit = SiteAuditSchema.parse(body.audit);
    }

    const businessName =
      audit?.businessName ??
      (typeof body.businessName === "string" && body.businessName.trim()
        ? body.businessName.trim()
        : "Stylus Demo");

    const generated = audit
      ? await generateSite(audit)
      : await generateSiteFromOpts({ businessName });
    const result = await deploySite(generated);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deploy failed";
    const status = message.includes("VERCEL_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

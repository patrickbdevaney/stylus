import type { SiteAudit, SiteSnapshot } from "@/lib/schema";
import { SiteAuditSchema } from "@/lib/schema";

const NEON_PALETTE = ["#ff2d95", "#00f0ff", "#9d4edd", "#ff6b35"];

export function buildFallbackAudit(snapshot: SiteSnapshot): SiteAudit {
  const base = snapshot.degraded ? 32 : 48;
  const dim = (score: number, reason: string) => ({ score, reason });

  const hasPhone = Boolean(snapshot.contact.phone);
  const hasContact = hasPhone || snapshot.contact.email;
  const hasHeadings = snapshot.headings.length > 0;

  const audit: SiteAudit = {
    businessName: snapshot.businessName,
    category: inferCategory(snapshot),
    overallScore: base,
    dimensions: {
      clarity: dim(
        hasHeadings ? base + 10 : base - 5,
        hasHeadings
          ? "Headings exist but the page message could be sharper for first-time visitors."
          : "No clear headline — visitors can't tell what you do in the first 3 seconds.",
      ),
      trust: dim(
        hasContact ? base + 5 : base - 10,
        hasContact
          ? "Some contact info found, but trust signals like address and hours are thin."
          : "Missing visible phone and address — customers hesitate to trust the business.",
      ),
      mobile: dim(
        base,
        "Mobile experience unknown from snapshot — assume tap-to-call and large buttons are missing.",
      ),
      speed: dim(
        snapshot.degraded ? base - 8 : base,
        snapshot.degraded
          ? "Site was hard to reach or parse — likely slow or blocked for many users."
          : "No performance signals in snapshot; heavy images or scripts may slow mobile load.",
      ),
      conversion: dim(
        hasPhone ? base + 8 : base - 12,
        hasPhone
          ? "Phone exists somewhere on the page but may not be a one-tap CTA above the fold."
          : "No tap-to-call button above the fold — Miami customers bounce when they can't call instantly.",
      ),
      localSeo: dim(
        base - 5,
        "Weak Miami / neighborhood signals — add city, neighborhood, and local keywords.",
      ),
    },
    topFixes: [
      hasPhone
        ? "Move phone number into a sticky tap-to-call button on mobile."
        : "Add a prominent tap-to-call button with your Miami area code.",
      "Rewrite the hero with one clear sentence: what you do, who you serve, where you are.",
      "Add your Miami neighborhood and hours near the top of the page.",
    ],
    brand: {
      tagline: snapshot.description?.slice(0, 120) ||
        `${snapshot.businessName} — proudly serving Miami`,
      phone: snapshot.contact.phone,
      address: snapshot.contact.address,
      email: snapshot.contact.email,
      palette: NEON_PALETTE,
      services: snapshot.headings.length
        ? snapshot.headings.slice(0, 4)
        : ["Services", "About Us", "Contact"],
    },
  };

  audit.overallScore = Math.round(
    Object.values(audit.dimensions).reduce((sum, d) => sum + d.score, 0) / 6,
  );

  return SiteAuditSchema.parse(audit);
}

function inferCategory(snapshot: SiteSnapshot): string {
  const text = `${snapshot.title ?? ""} ${snapshot.description ?? ""} ${snapshot.rawText}`.toLowerCase();
  if (/restaurant|cafe|coffee|food|kitchen|grill|bar\b/.test(text)) return "Restaurant";
  if (/barber|salon|spa|beauty/.test(text)) return "Personal care";
  if (/bar|cocktail|nightclub|lounge/.test(text)) return "Bar & nightlife";
  if (/shop|store|market|retail/.test(text)) return "Retail";
  return "Local business";
}

import { describe, it, expect } from "vitest";
import { getDemo } from "@/lib/demo/seed";
import {
  renderFromAudit,
  renderSinglePage,
  type TemplateFill,
} from "@/lib/template/singlePage";
import type { SiteAudit } from "@/lib/schema";

function baseFill(overrides: Partial<TemplateFill> = {}): TemplateFill {
  return {
    businessName: "Test & Co",
    category: "Restaurant",
    tagline: 'Best "beans" & brew',
    phone: "(305) 555-0100",
    address: "1 Ocean Dr, Miami, FL",
    email: "hello@test.com",
    services: [{ name: "Dining", description: "Fresh fare." }],
    about: "About us in Miami.",
    palette: ["#ff2d95", "#00f0ff", "#ff6b35", "#9d4edd"],
    brandTier: "generic",
    ...overrides,
  };
}

function auditWithTier(
  base: SiteAudit,
  brandTier: SiteAudit["brandTier"],
): SiteAudit {
  return { ...base, brandTier };
}

describe("renderSinglePage brand tiers", () => {
  const versailles = getDemo("versailles")!.audit;

  it("escapes HTML in visible text nodes", () => {
    const fill = baseFill({ businessName: `Tom & Jerry's "Cafe"` });
    const audit = auditWithTier(
      { ...versailles, businessName: fill.businessName },
      "generic",
    );
    const html = renderSinglePage(fill, audit);
    expect(html).toContain("<h1>Tom &amp; Jerry");
    expect(html).not.toMatch(/<h1>Tom & Jerry/);
  });

  it("builds tel: links from phone digits", () => {
    const fill = baseFill({ phone: "(305) 444-0240" });
    const html = renderSinglePage(fill, auditWithTier(versailles, "generic"));
    expect(html).toContain('href="tel:3054440240"');
    expect(html).toContain("Tap to call (305) 444-0240");
  });

  it("iconic tier uses Playfair and no neon grid on body", () => {
    const html = renderFromAudit(
      auditWithTier(versailles, "iconic"),
    );
    expect(html).toContain("Playfair");
    expect(html).not.toContain("background-size: 40px 40px");
    expect(html).not.toMatch(
      /text-shadow:\s*0\s+0\s+20px\s+var\(--primary\)/,
    );
  });

  it("generic tier keeps neon grid background", () => {
    const html = renderFromAudit(
      auditWithTier(versailles, "generic"),
    );
    expect(html).toContain("background-size: 40px 40px");
    expect(html).toMatch(/text-shadow:\s*0\s+0\s+20px\s+var\(--primary\)/);
  });

  it("undefined brandTier falls through to generic", () => {
    const html = renderFromAudit({ ...versailles, brandTier: undefined });
    expect(html).toContain("background-size: 40px 40px");
  });

  it("selects JSON-LD schemaType by category", () => {
    const fill = baseFill({ category: "Cuban restaurant" });
    const html = renderSinglePage(fill, auditWithTier(versailles, "generic"));
    expect(html).toContain('"@type": "Restaurant"');
  });
});

import { describe, it, expect } from "vitest";
import { deterministicBrandTier } from "@/lib/agent/enrichSite";
import type { SiteSnapshot } from "@/lib/schema";

function snapshot(text: string, businessName = "Test Business"): SiteSnapshot {
  return {
    businessName,
    url: "https://example.com",
    degraded: false,
    title: businessName,
    description: "Local business",
    headings: ["Menu"],
    contact: { phone: null, address: null, email: null },
    rawText: text,
    screenshot: null,
  };
}

describe("deterministicBrandTier", () => {
  it("returns iconic for institution signals", () => {
    expect(
      deterministicBrandTier(
        snapshot("Miami landmark institution since 1971 famous on Calle Ocho"),
      ),
    ).toBe("iconic");
  });

  it("returns iconic for high review counts", () => {
    expect(
      deterministicBrandTier(snapshot("Rated 2,500 reviews on Google")),
    ).toBe("iconic");
  });

  it("returns established for mid review counts", () => {
    expect(
      deterministicBrandTier(snapshot("About 400 reviews and growing")),
    ).toBe("established");
  });

  it("returns generic by default", () => {
    expect(deterministicBrandTier(snapshot("A new shop in Wynwood"))).toBe(
      "generic",
    );
  });
});

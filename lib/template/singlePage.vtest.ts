import { describe, it, expect } from "vitest";
import { renderSinglePage, type TemplateFill } from "@/lib/template/singlePage";

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
    palette: ["#ff2d95", "#00f0ff"],
    brandTier: "generic",
    ...overrides,
  };
}

describe("renderSinglePage", () => {
  it("escapes HTML in visible text nodes", () => {
    const html = renderSinglePage(
      baseFill({ businessName: `Tom & Jerry's "Cafe"` }),
    );
    expect(html).toContain("<h1>Tom &amp; Jerry");
    expect(html).toContain("&quot;Cafe&quot;</h1>");
    expect(html).not.toMatch(/<h1>Tom & Jerry/);
  });

  it("builds tel: links from phone digits", () => {
    const html = renderSinglePage(baseFill({ phone: "(305) 444-0240" }));
    expect(html).toContain('href="tel:3054440240"');
    expect(html).toContain("Tap to call (305) 444-0240");
  });

  it("builds Google Maps search URL for address", () => {
    const addr = "3555 SW 8th St, Miami, FL";
    const html = renderSinglePage(baseFill({ address: addr }));
    expect(html).toContain(
      `query=${encodeURIComponent(addr)}`,
    );
  });

  it("iconic tier strips background grid; generic keeps grid", () => {
    const iconic = renderSinglePage(baseFill({ brandTier: "iconic" }));
    const generic = renderSinglePage(baseFill({ brandTier: "generic" }));
    expect(iconic).toContain("background-image:none");
    expect(generic).toContain("background-size:40px 40px");
    expect(generic).toMatch(/linear-gradient\(rgba\(0,240,255/);
  });

  it("selects JSON-LD schemaType by category", () => {
    const restaurant = renderSinglePage(
      baseFill({ category: "Cuban restaurant" }),
    );
    const shop = renderSinglePage(baseFill({ category: "Retail shop" }));
    const other = renderSinglePage(baseFill({ category: "Local business" }));

    expect(restaurant).toContain('"@type": "Restaurant"');
    expect(shop).toContain('"@type": "Store"');
    expect(other).toContain('"@type": "LocalBusiness"');
  });
});

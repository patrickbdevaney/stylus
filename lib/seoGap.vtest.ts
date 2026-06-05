import { describe, it, expect } from "vitest";
import {
  buildSeedPayload,
  buildJsonLdGraph,
  parseTavilyToPayload,
  SeoGapResponseSchema,
} from "@/lib/seoGap";

describe("buildSeedPayload", () => {
  it("returns schema-valid payload for known business", () => {
    const payload = buildSeedPayload("Versailles Restaurant", "Cuban restaurant");
    expect(() => SeoGapResponseSchema.parse(payload)).not.toThrow();
    expect(payload.targetBusiness).toBe("Versailles Restaurant");
    expect(payload.competitors.length).toBeGreaterThanOrEqual(1);
  });
});

describe("buildJsonLdGraph / schemaTypeForCategory", () => {
  it("maps restaurant category to Restaurant", () => {
    const graph = buildJsonLdGraph("Versailles", "Cuban restaurant");
    const local = (graph["@graph"] as { "@type": string }[])[2];
    expect(local["@type"]).toBe("Restaurant");
  });

  it("maps shop category to Store", () => {
    const graph = buildJsonLdGraph("Boutique", "Retail shop");
    const local = (graph["@graph"] as { "@type": string }[])[2];
    expect(local["@type"]).toBe("Store");
  });

  it("maps unknown category to LocalBusiness", () => {
    const graph = buildJsonLdGraph("Acme", "Consulting");
    const local = (graph["@graph"] as { "@type": string }[])[2];
    expect(local["@type"]).toBe("LocalBusiness");
  });
});

describe("parseTavilyToPayload", () => {
  it("parses stub Tavily JSON with competitors and valid jsonLd", () => {
    const payload = parseTavilyToPayload("New Biz", "Restaurant", {
      answer: "Wynwood dining is competitive.",
      results: [
        {
          title: "Competitor A | Miami",
          url: "https://example.com/a",
          content: "Strong LocalBusiness schema and reviews.",
        },
        {
          title: "Competitor B",
          url: "https://example.com/b",
          content: "Ranks for restaurant Miami keywords.",
        },
      ],
    });

    expect(() => SeoGapResponseSchema.parse(payload)).not.toThrow();
    expect(payload.competitors.length).toBeGreaterThanOrEqual(1);
    expect(payload.jsonLd).toBeTruthy();
    expect(payload.targetBusiness).toBe("New Biz");
  });
});

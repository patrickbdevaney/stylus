import { z } from "zod";

export const SeoGapCompetitorSchema = z.object({
  name: z.string(),
  positioning: z.string(),
  sourceUrl: z.string(),
});

export const SeoGapResponseSchema = z.object({
  targetBusiness: z.string(),
  competitors: z.array(SeoGapCompetitorSchema).min(1).max(5),
  categoryGap: z.boolean(),
  recommendedCategory: z.string(),
  summary: z.string(),
  jsonLd: z.record(z.unknown()),
});

export type SeoGapResponse = z.infer<typeof SeoGapResponseSchema>;

function schemaTypeForCategory(category: string): string {
  const c = category.toLowerCase();
  if (
    c.includes("restaurant") ||
    c.includes("cafe") ||
    c.includes("coffee") ||
    c.includes("bar") ||
    c.includes("seafood") ||
    c.includes("cuban")
  ) {
    return "Restaurant";
  }
  if (c.includes("retail") || c.includes("shop") || c.includes("store")) {
    return "Store";
  }
  return "LocalBusiness";
}

export function buildJsonLdGraph(
  businessName: string,
  category: string,
): Record<string, unknown> {
  const siteUrl = "https://stylus.vercel.app";
  const localType = schemaTypeForCategory(category);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: businessName,
        url: siteUrl,
        description: `${businessName} — ${category} in Miami`,
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: businessName,
        url: siteUrl,
        areaServed: "Miami, FL",
      },
      {
        "@type": localType,
        "@id": `${siteUrl}/#localbusiness`,
        name: businessName,
        description: category,
        url: siteUrl,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Miami",
          addressRegion: "FL",
          addressCountry: "US",
        },
        areaServed: "Wynwood, Miami, FL",
      },
    ],
  };
}

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const DEMO_SEEDS: Record<string, Omit<SeoGapResponse, "targetBusiness" | "jsonLd">> = {
  "versailles-restaurant": {
    competitors: [
      {
        name: "La Carreta",
        positioning:
          "24-hour Cuban diner on Bird Road with strong LocalBusiness + Menu schema and heavy Calle Ocho local SEO.",
        sourceUrl: "https://www.lacarreta.com/",
      },
      {
        name: "Sergio's Restaurant",
        positioning:
          "Multi-location Cuban chain ranking for 'Cuban restaurant Miami' with rich Organization markup.",
        sourceUrl: "https://www.sergios.com/",
      },
      {
        name: "Café La Trova",
        positioning:
          "Chef-driven Cuban in Little Havana with Event and Restaurant structured data on review pages.",
        sourceUrl: "https://www.cafelatrova.com/",
      },
    ],
    categoryGap: true,
    recommendedCategory: "Restaurant",
    summary:
      "Wynwood and Little Havana Cuban dining is crowded with legacy brands that already expose Restaurant schema, menu URLs, and review-rich LocalBusiness graphs. Versailles is known city-wide but competitor SERPs bundle food service + bar + bakery intents under Restaurant type — your rebuild should claim the same primary type to compete for 'Cuban restaurant Miami' clusters.",
  },
  "joe-s-stone-crab": {
    competitors: [
      {
        name: "Garcia's Seafood Grille",
        positioning:
          "Fish market + waterfront dining with Product and Restaurant schema on seasonal menus.",
        sourceUrl: "https://www.garciasseafood.com/",
      },
      {
        name: "Monty's Raw Bar",
        positioning:
          "Casual seafood on the water; ranks for dockside dining with LocalBusiness hours and geo coordinates.",
        sourceUrl: "https://www.montysrawbar.com/",
      },
      {
        name: "Rusty Pelican",
        positioning:
          "Special-occasion seafood with Event venue markup and strong image sitemap presence.",
        sourceUrl: "https://www.therustypelican.com/",
      },
    ],
    categoryGap: true,
    recommendedCategory: "Restaurant",
    summary:
      "Miami Beach seafood competitors pair Restaurant with Menu and Reservation actions in JSON-LD, capturing stone crab-adjacent queries even off-season. Joe's brand authority is high, but Wynwood-adjacent discovery queries surface rivals with explicit seafood service schema and aggregated rating markup.",
  },
  "panther-coffee": {
    competitors: [
      {
        name: "All Day",
        positioning:
          "Wynwood café with CoffeeShop attributes, online ordering links, and FAQ schema on beans.",
        sourceUrl: "https://www.alldaycafe.com/",
      },
      {
        name: "Zak the Baker",
        positioning:
          "Bakery-café hybrid using Bakery and Restaurant types for breakfast + retail bread SERPs.",
        sourceUrl: "https://www.zakthebaker.com/",
      },
      {
        name: "Miam Café",
        positioning:
          "Wynwood brunch café with Instagram-forward LocalBusiness and aggregateRating snippets.",
        sourceUrl: "https://www.miamcafe.com/",
      },
    ],
    categoryGap: false,
    recommendedCategory: "CafeOrCoffeeShop",
    summary:
      "Specialty coffee in Wynwood is saturated with cafés using CafeOrCoffeeShop or Restaurant markup plus sameAs links to Google Maps and social profiles. Panther already aligns with category intent; the gap is depth of Product schema for beans rather than missing primary type.",
  },
  "gramps": {
    competitors: [
      {
        name: "Wood Tavern",
        positioning:
          "Wynwood bar with Event schema for nightly DJs and BarOrPub primary type.",
        sourceUrl: "https://www.woodtavern.com/",
      },
      {
        name: "Electric Pickle",
        positioning:
          "Live-music venue with MusicVenue + Event graphs for ticketed listings.",
        sourceUrl: "https://www.electricpicklemiami.com/",
      },
      {
        name: "24 Street Winery",
        positioning:
          "Bar-winery hybrid using Winery and BarOrPub types for tasting room queries.",
        sourceUrl: "https://www.24streetwinery.com/",
      },
    ],
    categoryGap: true,
    recommendedCategory: "BarOrPub",
    summary:
      "Wynwood nightlife competitors explicitly mark BarOrPub or MusicVenue types with Event schedules, which Google maps to 'bar Wynwood' and live-music packs. Gramps ranks on brand search but broader discovery goes to venues advertising structured event data.",
  },
  "robert-is-here": {
    competitors: [
      {
        name: "Knaus Berry Farm",
        positioning:
          "Homestead farm stand with LocalBusiness + Product markup for seasonal U-pick.",
        sourceUrl: "https://www.knausberryfarm.com/",
      },
      {
        name: "Fruit and Spice Park",
        positioning:
          "Agricultural attraction using TouristAttraction and Place schema for educational tours.",
        sourceUrl: "https://www.fruitandspicepark.org/",
      },
      {
        name: "Los Pinarenos Fruteria",
        positioning:
          "Little Havana fruit window with LocalBusiness focus on fresh produce and juices.",
        sourceUrl: "https://www.yelp.com/biz/los-pinarenos-fruteria-miami",
      },
    ],
    categoryGap: true,
    recommendedCategory: "Store",
    summary:
      "Farm stand and produce competitors combine Store or GroceryStore types with geo-tagged LocalBusiness data for Homestead and Redland queries. Robert Is Here owns brand terms but category-level SERPs favor listings with explicit retail produce schema.",
  },
};

function genericSeed(
  businessName: string,
  category: string,
): Omit<SeoGapResponse, "targetBusiness" | "jsonLd"> {
  return {
    competitors: [
      {
        name: "Wynwood Kitchen & Bar",
        positioning: `Full-service ${category.toLowerCase()} competitor with Restaurant schema and strong Maps presence.`,
        sourceUrl: "https://www.wynwoodkitchenandbar.com/",
      },
      {
        name: "KYU Miami",
        positioning:
          "Wood-fired concept ranking for Wynwood dining with rich Organization graph.",
        sourceUrl: "https://www.kyurestaurants.com/miami/",
      },
      {
        name: "1-800-Lucky",
        positioning:
          "Food hall aggregating multiple vendors with ItemList and LocalBusiness markup.",
        sourceUrl: "https://www.1800lucky.com/",
      },
    ],
    categoryGap: true,
    recommendedCategory: schemaTypeForCategory(category),
    summary: `Wynwood ${category} searches surface venues with explicit Restaurant or LocalBusiness JSON-LD, review aggregates, and event-based discovery. ${businessName} should match the dominant schema type used by top-ranking competitors for this category cluster.`,
  };
}

export function buildSeedPayload(
  businessName: string,
  category: string,
): SeoGapResponse {
  const key = normalizeKey(businessName);
  const seed = DEMO_SEEDS[key] ?? genericSeed(businessName, category);
  return SeoGapResponseSchema.parse({
    targetBusiness: businessName,
    ...seed,
    jsonLd: buildJsonLdGraph(businessName, category),
  });
}

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilyResponse = {
  answer?: string;
  results?: TavilyResult[];
};

function positioningFromContent(content: string): string {
  const line = content.replace(/\s+/g, " ").trim();
  const sentence = line.split(/[.!?]/)[0]?.trim() || line;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

export function parseTavilyToPayload(
  businessName: string,
  category: string,
  data: TavilyResponse,
): SeoGapResponse {
  const summary =
    typeof data.answer === "string" && data.answer.trim()
      ? data.answer.trim()
      : `Competitive landscape for ${category} in Wynwood Miami.`;

  const competitors = (data.results ?? [])
    .slice(0, 5)
    .map((r) => ({
      name: (r.title ?? "Unknown competitor").split("|")[0].trim(),
      positioning: positioningFromContent(r.content ?? r.title ?? ""),
      sourceUrl: r.url ?? "https://tavily.com",
    }))
    .filter((c) => c.name.length > 0)
    .slice(0, 3);

  while (competitors.length < 3 && (data.results?.length ?? 0) > competitors.length) {
    const extra = data.results?.[competitors.length];
    if (!extra) break;
    competitors.push({
      name: (extra.title ?? "Competitor").trim(),
      positioning: positioningFromContent(extra.content ?? ""),
      sourceUrl: extra.url ?? "https://tavily.com",
    });
  }

  const payload = {
    targetBusiness: businessName,
    competitors:
      competitors.length >= 1
        ? competitors
        : buildSeedPayload(businessName, category).competitors,
    categoryGap: true,
    recommendedCategory: schemaTypeForCategory(category),
    summary,
    jsonLd: buildJsonLdGraph(businessName, category),
  };

  return SeoGapResponseSchema.parse(payload);
}

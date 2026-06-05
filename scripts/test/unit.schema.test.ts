import {
  DeployResultSchema,
  SiteAuditSchema,
  SiteSnapshotSchema,
} from "../../lib/schema";
import { LighthouseScoresSchema } from "../../lib/lighthouse";
import { seededLighthouse } from "../../lib/lighthouse";
import { buildSeedPayload } from "../../lib/seoGap";
import { SeoGapResponseSchema } from "../../lib/seoGap";
import { test, assert } from "./assert";

const VALID_AUDIT = {
  businessName: "Test Biz",
  category: "Restaurant",
  overallScore: 55,
  dimensions: {
    clarity: { score: 50, reason: "Needs clearer hero." },
    trust: { score: 52, reason: "Contact info is thin." },
    mobile: { score: 48, reason: "Mobile UX unclear." },
    speed: { score: 45, reason: "Likely slow on mobile." },
    conversion: { score: 60, reason: "CTA could be stronger." },
    localSeo: { score: 40, reason: "Weak local signals." },
  },
  topFixes: ["Fix hero", "Add tap-to-call"],
  brand: {
    tagline: "Serving Miami",
    phone: "(305) 555-0100",
    address: "1 Ocean Dr, Miami, FL",
    email: null,
    palette: ["#ff2d95", "#00f0ff"],
    services: ["Dining", "Takeout"],
  },
};

const VALID_SNAPSHOT = {
  businessName: "Test Biz",
  url: "https://example.com",
  degraded: false,
  title: "Test Biz | Miami",
  description: "A test business",
  headings: ["Welcome", "Menu"],
  contact: {
    phone: "(305) 555-0100",
    address: "1 Ocean Dr, Miami, FL",
    email: null,
  },
  rawText: "Welcome to Test Biz in Miami.",
  screenshot: null,
};

test("SiteAuditSchema accepts a valid audit", () => {
  const parsed = SiteAuditSchema.parse(VALID_AUDIT);
  assert.equal(parsed.businessName, "Test Biz", "businessName round-trip");
});

test("SiteAuditSchema rejects invalid overallScore", () => {
  assert.throws(
    () =>
      SiteAuditSchema.parse({
        ...VALID_AUDIT,
        overallScore: 200,
      }),
    "overallScore=200 should throw",
  );
});

test("SiteSnapshotSchema round-trips a valid snapshot", () => {
  const parsed = SiteSnapshotSchema.parse(VALID_SNAPSHOT);
  const again = SiteSnapshotSchema.parse(parsed);
  assert.equal(again.businessName, VALID_SNAPSHOT.businessName, "snapshot name");
  assert.equal(again.headings.length, 2, "headings length");
});

test("DeployResultSchema accepts https url and rejects bad url", () => {
  assert.notThrows(
    () =>
      DeployResultSchema.parse({
        url: "https://example.com/live",
        provider: "vercel",
        ms: 1200,
      }),
    "https deploy url should parse",
  );
  assert.throws(
    () =>
      DeployResultSchema.parse({
        url: "not-a-url",
        provider: "vercel",
        ms: 0,
      }),
    "invalid deploy url should throw",
  );
});

test("SeoGapResponseSchema accepts buildSeedPayload output", () => {
  const seed = buildSeedPayload("Versailles Restaurant", "Cuban restaurant");
  const parsed = SeoGapResponseSchema.parse(seed);
  assert.ok(parsed.targetBusiness.length > 0, "targetBusiness present");
  assert.ok(parsed.competitors.length >= 1, "competitors present");
});

test("LighthouseScoresSchema validates seededLighthouse after side", () => {
  const delta = seededLighthouse("versailles");
  assert.ok(delta.after !== null, "seeded after scores exist");
  const parsed = LighthouseScoresSchema.parse(delta.after);
  assert.inRange(parsed.performance, 0, 100, "performance");
  assert.inRange(parsed.seo, 0, 100, "seo");
});

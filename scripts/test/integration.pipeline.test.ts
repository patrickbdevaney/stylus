import { resolve } from "../../lib/agent/resolve";
import { fetchSite } from "../../lib/agent/fetchSite";
import { auditSite } from "../../lib/agent/auditSite";
import { enrichSite } from "../../lib/agent/enrichSite";
import { generateSite } from "../../lib/agent/generateSite";
import { buildFallbackAudit } from "../../lib/agent/fallbackAudit";
import { buildDegradedSnapshot } from "../../lib/agent/parseHelpers";
import {
  getDemo,
  getDemoBusinesses,
  findDemoByName,
} from "../../lib/demo/seed";
import { SiteAuditSchema, SiteSnapshotSchema } from "../../lib/schema";
import { test, assert } from "./assert";

test("resolve(): URL input resolves with url set", async () => {
  const r = await resolve("https://versaillesrestaurant.com");
  assert.equal(r.resolved, true, "url should resolve");
  assert.ok(r.url !== null && r.url.startsWith("https://"), "url is https");
});

test("resolve(): bare name matches demo Versailles", async () => {
  const r = await resolve("Versailles Restaurant");
  assert.equal(r.resolved, true, "Versailles should resolve via demo");
  assert.equal(r.businessName, "Versailles Restaurant", "business name");
  assert.ok(r.url !== null, "demo url present");
});

test("fetchSite() with demoSlug returns cached snapshot", async () => {
  const resolved = await resolve("versailles");
  const snapshot = await fetchSite(resolved, { demoSlug: "versailles" });
  assert.equal(snapshot.degraded, false, "cached snapshot not degraded");
  assert.ok(snapshot.headings.length > 0, "headings extracted");
});

test("auditSite() with demoSlug versailles returns cached audit", async () => {
  const snapshot = getDemo("versailles")!.snapshot;
  const audit = await auditSite(snapshot, { demoSlug: "versailles" });
  assert.inRange(audit.overallScore, 0, 100, "overallScore");
  assert.deepIncludes(
    audit.dimensions,
    ["clarity", "trust", "mobile", "speed", "conversion", "localSeo"],
    "audit dimensions",
  );
  assert.ok(audit.brand.palette.length >= 2, "brand palette");
});

test("auditSite() keyless degraded snapshot uses fallback audit schema", async () => {
  const degraded = buildDegradedSnapshot("Offline Test Co", null);
  const audit = await auditSite(degraded);
  assert.notThrows(() => SiteAuditSchema.parse(audit), "fallback passes schema");
  assert.equal(
    buildFallbackAudit(degraded).businessName,
    audit.businessName,
    "fallback business name",
  );
});

test("enrichSite() on degraded snapshot returns generic tier without throwing", async () => {
  const degraded = buildDegradedSnapshot("Generic Miami Shop", null);
  const ctx = await enrichSite(degraded);
  assert.equal(ctx.brandTier, "generic", "brandTier generic when offline");
});

test("generateSite() html contract and escapeHtml for special chars", async () => {
  const base = getDemo("versailles")!.audit;
  const audit = {
    ...base,
    businessName: `Tom & Jerry's "Cafe"`,
    brand: { ...base.brand, tagline: 'Best "beans" & brew' },
  };
  const { html, businessName } = await generateSite(audit);
  assert.ok(html.includes("<!DOCTYPE html>"), "doctype");
  assert.ok(html.includes("<h1>Tom &amp; Jerry"), "escaped ampersand in h1");
  assert.ok(html.includes("&quot;Cafe&quot;</h1>"), "escaped quotes in h1");
  const h1Match = html.match(/<h1>[^<]*<\/h1>/);
  assert.ok(h1Match !== null, "h1 present");
  assert.ok(!h1Match![0].includes("Tom & Jerry"), "raw ampersand absent in h1");
  assert.ok(html.includes('type="application/ld+json"'), "json-ld script");
  assert.equal(businessName, audit.businessName, "businessName echo");
  if (audit.brand.phone) {
    assert.ok(html.includes("tel:"), "tel link when phone present");
  }
});

test("all 5 demo fixtures: schema + generateSite html", async () => {
  for (const { slug } of getDemoBusinesses()) {
    const demo = getDemo(slug);
    assert.ok(demo !== null, `getDemo(${slug})`);
    if (!demo) return;
    assert.notThrows(
      () => SiteSnapshotSchema.parse(demo.snapshot),
      `${slug} snapshot schema`,
    );
    assert.notThrows(
      () => SiteAuditSchema.parse(demo.audit),
      `${slug} audit schema`,
    );
    const generated = await generateSite(demo.audit);
    assert.ok(generated.html.length > 500, `${slug} html length`);
  }
});

test("findDemoByName matches Versailles Restaurant", () => {
  const demo = findDemoByName("Versailles Restaurant");
  assert.ok(demo !== null, "demo found by name");
  if (!demo) return;
  assert.equal(demo.slug, "versailles", "versailles slug");
});

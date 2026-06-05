import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  seededLighthouse,
  seededLighthouseDelta,
  getLighthouseDelta,
  provenanceLabel,
} from "@/lib/lighthouse";

describe("seededLighthouse", () => {
  it("marks seeded side scores with provenance fields", () => {
    const before = seededLighthouse("versailles", "before");
    const after = seededLighthouse("versailles", "after");
    expect(before.seeded).toBe(true);
    expect(after.seeded).toBe(true);
    expect(before.sourceUrl).toBe("seeded");
    expect(before.performance).not.toBe(after.performance);
  });

  it("is deterministic for the same slug and side", () => {
    const a = seededLighthouse("versailles", "before");
    const b = seededLighthouse("versailles", "before");
    expect(a.performance).toBe(b.performance);
  });

  it("differs across slugs on after side", () => {
    const v = seededLighthouse("versailles", "after");
    const g = seededLighthouse("gramps-bar", "after");
    expect(v.seo).not.toBe(g.seo);
  });
});

describe("seededLighthouseDelta", () => {
  it("returns bothReal false", () => {
    const delta = seededLighthouseDelta("versailles");
    expect(delta.bothReal).toBe(false);
    expect(delta.before.seeded).toBe(true);
    expect(delta.after.seeded).toBe(true);
  });
});

describe("provenanceLabel", () => {
  it("labels estimated scores", () => {
    const label = provenanceLabel(seededLighthouse("versailles", "before"));
    expect(label).toContain("Estimated");
  });

  it("labels measured scores", () => {
    const label = provenanceLabel({
      ...seededLighthouse("versailles", "after"),
      seeded: false,
      sourceUrl: "https://example.com",
      degraded: false,
    });
    expect(label).toContain("Measured");
    expect(label).toContain("https://example.com");
  });
});

describe("getLighthouseDelta", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error("network disabled in test")),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns seeded sides when PSI rejects without throwing", async () => {
    const delta = await getLighthouseDelta(
      "https://before.example.com",
      "https://after.example.com",
      "versailles",
    );
    expect(delta.before.seeded).toBe(true);
    expect(delta.after.seeded).toBe(true);
    expect(delta.bothReal).toBe(false);
    expect(delta.beforeUrl).toBe("https://before.example.com");
    expect(delta.afterUrl).toBe("https://after.example.com");
  });
});

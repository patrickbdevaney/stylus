import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { seededLighthouse, getLighthouseDelta } from "@/lib/lighthouse";

describe("seededLighthouse", () => {
  it("is deterministic for the same slug", () => {
    const a = seededLighthouse("versailles");
    const b = seededLighthouse("versailles");
    expect(a).toEqual(b);
    expect(a.after?.performance).toBeGreaterThan(a.before?.performance ?? 0);
  });

  it("differs across slugs", () => {
    const v = seededLighthouse("versailles");
    const g = seededLighthouse("gramps-bar");
    expect(v.after?.seo).not.toBe(g.after?.seo);
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

  it("returns null sides when all fetches reject without throwing", async () => {
    const delta = await getLighthouseDelta(
      "https://before.example.com",
      "https://after.example.com",
    );
    expect(delta.before).toBeNull();
    expect(delta.after).toBeNull();
  });
});

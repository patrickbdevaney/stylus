import { describe, it, expect } from "vitest";
import { buildFallbackAudit } from "@/lib/agent/fallbackAudit";
import { buildDegradedSnapshot } from "@/lib/agent/parseHelpers";
import { SiteAuditSchema } from "@/lib/schema";

describe("buildFallbackAudit", () => {
  const degraded = buildDegradedSnapshot("Degraded Biz", null);
  const healthy = buildDegradedSnapshot("Healthy Biz", "https://example.com", {
    title: "Healthy Biz | Miami",
    description: "A great restaurant in Miami",
    headings: ["Welcome", "Menu"],
    contact: {
      phone: "(305) 555-0199",
      email: "info@healthy.com",
      address: "100 Main St, Miami, FL",
    },
    rawText:
      "Welcome to Healthy Biz restaurant in Miami. Call us for reservations and catering.",
  });
  healthy.degraded = false;

  it("produces different overall scores for degraded vs healthy", () => {
    const degradedAudit = buildFallbackAudit(degraded);
    const healthyAudit = buildFallbackAudit(healthy);
    expect(degradedAudit.overallScore).not.toBe(healthyAudit.overallScore);
    expect(degradedAudit.overallScore).toBeLessThan(healthyAudit.overallScore);
  });

  it("always passes SiteAuditSchema", () => {
    expect(() => SiteAuditSchema.parse(buildFallbackAudit(degraded))).not.toThrow();
    expect(() => SiteAuditSchema.parse(buildFallbackAudit(healthy))).not.toThrow();
  });

  it("includes tap-to-call fix when phone is present", () => {
    const withPhone = buildFallbackAudit({
      ...degraded,
      contact: { phone: "(305) 555-0100", email: null, address: null },
    });
    const withoutPhone = buildFallbackAudit({
      ...degraded,
      contact: { phone: null, email: null, address: null },
    });

    expect(withPhone.topFixes[0]).toMatch(/tap-to-call/i);
    expect(withoutPhone.topFixes[0]).toMatch(/tap-to-call/i);
    expect(withPhone.topFixes[0]).toMatch(/Move phone/);
    expect(withoutPhone.topFixes[0]).toMatch(/Add a prominent tap-to-call/);
  });
});

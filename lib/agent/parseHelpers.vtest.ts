import { describe, it, expect } from "vitest";
import {
  extractContact,
  isUsableSnapshot,
  buildDegradedSnapshot,
} from "@/lib/agent/parseHelpers";
import { SiteSnapshotSchema } from "@/lib/schema";

describe("extractContact", () => {
  it("pulls phone and email from sample text", () => {
    const contact = extractContact(
      "Call (305) 555-0100 or email hello@versailles.com for info.",
    );
    expect(contact.phone).toBe("(305) 555-0100");
    expect(contact.email).toBe("hello@versailles.com");
  });
});

describe("isUsableSnapshot", () => {
  it("requires at least two usable fields", () => {
    const thin = buildDegradedSnapshot("Thin", null, {
      title: "Only title",
      rawText: "short",
    });
    expect(isUsableSnapshot(thin)).toBe(false);

    const rich = buildDegradedSnapshot("Rich", null, {
      title: "Rich Biz",
      description: "Description here",
      headings: ["Hello"],
      rawText: "x".repeat(100),
    });
    expect(isUsableSnapshot(rich)).toBe(true);
  });
});

describe("buildDegradedSnapshot", () => {
  it("returns a valid degraded snapshot shape", () => {
    const snap = buildDegradedSnapshot("Offline Co", null);
    expect(snap.degraded).toBe(true);
    expect(snap.url).toBeNull();
    expect(() => SiteSnapshotSchema.parse(snap)).not.toThrow();
  });
});

import type { DemoBusiness, DemoCacheEntry } from "@/lib/schema";
import { SiteAuditSchema, SiteSnapshotSchema } from "@/lib/schema";

import versailles from "./cache/versailles.json";
import joesStoneCrab from "./cache/joes-stone-crab.json";
import pantherCoffee from "./cache/panther-coffee.json";
import grampsBar from "./cache/gramps-bar.json";
import robertIsHere from "./cache/robert-is-here.json";

const RAW_DEMOS = [
  versailles,
  joesStoneCrab,
  pantherCoffee,
  grampsBar,
  robertIsHere,
] as DemoCacheEntry[];

const DEMOS: DemoCacheEntry[] = RAW_DEMOS.map((d) => ({
  ...d,
  snapshot: SiteSnapshotSchema.parse(d.snapshot),
  audit: SiteAuditSchema.parse(d.audit),
}));

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";
}

export function getDemoBusinesses(): DemoBusiness[] {
  return DEMOS.map(({ slug, name, category }) => ({ slug, name, category }));
}

export function getDemo(
  slug: string,
): { snapshot: DemoCacheEntry["snapshot"]; audit: DemoCacheEntry["audit"]; reasoningTrace?: string[] } | null {
  const entry = DEMOS.find((d) => d.slug === slug);
  if (!entry) return null;
  return {
    snapshot: entry.snapshot,
    audit: entry.audit,
    reasoningTrace: entry.reasoningTrace,
  };
}

export function findDemoByName(name: string): DemoCacheEntry | null {
  const normalized = name.trim().toLowerCase();
  return (
    DEMOS.find(
      (d) =>
        d.name.toLowerCase() === normalized ||
        d.slug === normalized.replace(/\s+/g, "-"),
    ) ?? null
  );
}

export function getDemoEntry(slug: string): DemoCacheEntry | null {
  return DEMOS.find((d) => d.slug === slug) ?? null;
}

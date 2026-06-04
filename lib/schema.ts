import { z } from "zod";

export const DimensionScore = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string().min(1),
});

export const SiteAuditSchema = z.object({
  businessName: z.string(),
  category: z.string(),
  overallScore: z.number().int().min(0).max(100),
  dimensions: z.object({
    clarity: DimensionScore,
    trust: DimensionScore,
    mobile: DimensionScore,
    speed: DimensionScore,
    conversion: DimensionScore,
    localSeo: DimensionScore,
  }),
  topFixes: z.array(z.string().min(1)).min(1).max(3),
  brand: z.object({
    tagline: z.string(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    email: z.string().nullable(),
    palette: z.array(z.string()).min(2),
    services: z.array(z.string()),
  }),
});
export type SiteAudit = z.infer<typeof SiteAuditSchema>;

export const SiteSnapshotSchema = z.object({
  businessName: z.string(),
  url: z.string().nullable(),
  degraded: z.boolean(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  headings: z.array(z.string()),
  contact: z.object({
    phone: z.string().nullable(),
    address: z.string().nullable(),
    email: z.string().nullable(),
  }),
  rawText: z.string(),
  screenshot: z.string().nullable(),
});
export type SiteSnapshot = z.infer<typeof SiteSnapshotSchema>;

export const ResolveResultSchema = z.object({
  url: z.string().nullable(),
  businessName: z.string(),
  resolved: z.boolean(),
});
export type ResolveResult = z.infer<typeof ResolveResultSchema>;

export const GeneratedSiteSchema = z.object({
  html: z.string(),
  businessName: z.string(),
});
export type GeneratedSite = z.infer<typeof GeneratedSiteSchema>;

export const DeployResultSchema = z.object({
  url: z.string().url(),
  provider: z.enum(["vercel", "cloudflare"]),
  ms: z.number().int().nonnegative(),
});
export type DeployResult = z.infer<typeof DeployResultSchema>;

export type DemoBusiness = {
  slug: string;
  name: string;
  category: string;
};

export type DemoCacheEntry = DemoBusiness & {
  snapshot: SiteSnapshot;
  audit: SiteAudit;
  reasoningTrace?: string[];
  deployFallbackUrl?: string;
};

export type AuditStep = "resolve" | "fetch" | "audit";

export type StreamEvent =
  | {
      type: "step";
      step: AuditStep;
      status: "start" | "done";
      message: string;
    }
  | { type: "reasoning"; delta: string }
  | { type: "resolve"; data: ResolveResult }
  | { type: "snapshot"; data: SiteSnapshot }
  | { type: "audit"; data: SiteAudit }
  | { type: "done" }
  | { type: "error"; message: string };

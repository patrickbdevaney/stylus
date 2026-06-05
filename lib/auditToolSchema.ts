const dimensionScore = {
  type: "object" as const,
  required: ["score", "reason"],
  properties: {
    score: { type: "integer" as const, minimum: 0, maximum: 100 },
    reason: { type: "string" as const },
  },
};

/** JSON Schema for Claude tool `emit_audit` — mirrors SiteAuditSchema. */
export const EMIT_AUDIT_TOOL = {
  name: "emit_audit",
  description:
    "Emit a structured website audit with scores, plain-language reasons, and brand facts for site generation.",
  input_schema: {
    type: "object" as const,
    required: [
      "businessName",
      "category",
      "overallScore",
      "dimensions",
      "topFixes",
      "brand",
    ],
    properties: {
      businessName: { type: "string" as const },
      category: { type: "string" as const },
      overallScore: { type: "integer" as const, minimum: 0, maximum: 100 },
      dimensions: {
        type: "object" as const,
        required: [
          "clarity",
          "trust",
          "mobile",
          "speed",
          "conversion",
          "localSeo",
        ],
        properties: {
          clarity: dimensionScore,
          trust: dimensionScore,
          mobile: dimensionScore,
          speed: dimensionScore,
          conversion: dimensionScore,
          localSeo: dimensionScore,
        },
      },
      topFixes: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 1,
        maxItems: 3,
      },
      brand: {
        type: "object" as const,
        required: [
          "tagline",
          "phone",
          "address",
          "email",
          "palette",
          "services",
        ],
        properties: {
          tagline: { type: "string" as const },
          phone: { type: ["string", "null"] as const },
          address: { type: ["string", "null"] as const },
          email: { type: ["string", "null"] as const },
          palette: {
            type: "array" as const,
            items: { type: "string" as const },
            minItems: 2,
          },
          services: {
            type: "array" as const,
            items: { type: "string" as const },
          },
        },
      },
      brandTier: {
        type: "string" as const,
        enum: ["iconic", "established", "generic"],
      },
    },
  },
};

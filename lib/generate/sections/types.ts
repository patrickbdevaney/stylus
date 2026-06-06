import type { BrandTokens, DesignBrief } from "@/lib/schema";

export type SectionContent = {
  businessName: string;
  tagline: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  primaryAction: string;
  services: { name: string; description: string }[];
  about: string;
  category: string;
  reviewCount: number | null;
  yearsOperating: number | null;
};

export type SectionTokens = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  displayFont: string;
  bodyFont: string;
  colorMode: "dark" | "light";
  spacingScale: "generous" | "standard" | "dense";
  motionLevel: "none" | "subtle" | "rich";
  library: "shadcn" | "aceternity" | "daisyui";
};

export type SectionResult = {
  html: string;
  tsx: string;
  imports: string[];
};

export const SPACING = {
  generous: { section: "py-24 px-8", card: "p-8", gap: "gap-8" },
  standard: { section: "py-16 px-6", card: "p-6", gap: "gap-6" },
  dense: { section: "py-10 px-4", card: "p-4", gap: "gap-4" },
} as const;

const COLOR_DEFAULTS = {
  primary: "#ff2d95",
  secondary: "#00f0ff",
  accent: "#9d4edd",
  background: "#0a0a12",
  text: "#f0f0f0",
} as const;

function colorByRole(
  tokens: BrandTokens,
  role: "primary" | "secondary" | "accent" | "background" | "text",
): string {
  return (
    tokens.colors.find((entry) => entry.role === role)?.value ??
    COLOR_DEFAULTS[role]
  );
}

export function tokensToSectionTokens(
  tokens: BrandTokens,
  brief: DesignBrief,
): SectionTokens {
  const displayFont =
    tokens.fonts.find((font) => font.role === "display")?.family ??
    "Playfair Display";
  const bodyFont =
    tokens.fonts.find((font) => font.role === "body")?.family ?? "Inter";

  return {
    primary: colorByRole(tokens, "primary"),
    secondary: colorByRole(tokens, "secondary"),
    accent: colorByRole(tokens, "accent"),
    background: colorByRole(tokens, "background"),
    text: colorByRole(tokens, "text"),
    displayFont,
    bodyFont,
    colorMode: brief.colorMode,
    spacingScale: brief.spacingScale,
    motionLevel: brief.motionLevel,
    library: brief.library,
  };
}

export function phoneTel(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function spacingClasses(tok: SectionTokens): (typeof SPACING)[keyof typeof SPACING] {
  return SPACING[tok.spacingScale];
}

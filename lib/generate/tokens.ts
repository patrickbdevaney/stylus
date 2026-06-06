import { getDemo } from "@/lib/demo/seed";
import type { BrandColor, BrandTokens, SiteAudit } from "@/lib/schema";

const SPACING_KEYS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const;
const RADIUS_KEYS = ["sm", "md", "lg", "xl", "2xl", "full"] as const;
const SHADOW_KEYS = ["sm", "md", "lg"] as const;

const DEFAULT_SPACING = [4, 8, 12, 16, 24, 32, 48, 64];
const DEMO_RADII = [4, 8, 12, 16];

function baseTokens(
  colors: BrandColor[],
  fonts: BrandTokens["fonts"],
  sourceUrl: string | null = null,
): BrandTokens {
  return {
    colors,
    fonts,
    spacing: DEFAULT_SPACING,
    radii: DEMO_RADII,
    shadows: [],
    motion: { hasParallax: false, hasScrollAnimation: false },
    logo: null,
    extractedAt: new Date().toISOString(),
    sourceUrl,
    degraded: false,
  };
}

function roleColors(
  primary: string,
  secondary: string,
  accent: string,
  background: string,
  text: string,
): BrandColor[] {
  return [
    { role: "primary", value: primary, confidence: 1 },
    { role: "secondary", value: secondary, confidence: 1 },
    { role: "accent", value: accent, confidence: 1 },
    { role: "background", value: background, confidence: 1 },
    { role: "text", value: text, confidence: 1 },
  ];
}

function paletteToColors(palette: string[]): BrandColor[] {
  const roles: BrandColor["role"][] = [
    "primary",
    "secondary",
    "accent",
    "background",
    "text",
  ];

  return roles.map((role, index) => ({
    role,
    value: palette[index] ?? palette[palette.length - 1] ?? "#f0f0f8",
    confidence: 1,
  }));
}

export function tokensFromAudit(audit: SiteAudit): BrandTokens {
  return baseTokens(
    paletteToColors(audit.brand.palette),
    [
      { role: "display", family: "Inter", weights: [400, 600, 700] },
      { role: "body", family: "Inter", weights: [400, 500, 600] },
    ],
    null,
  );
}

export function seededTokensForSlug(slug: string): BrandTokens {
  const demo = getDemo(slug);
  const sourceUrl = demo?.snapshot.url ?? null;
  const sharedBackground = "#0a0a0f";
  const sharedText = "#f0f0f0";

  const slugConfig: Record<
    string,
    { colors: BrandColor[]; fonts: BrandTokens["fonts"] }
  > = {
    versailles: {
      colors: roleColors("#ff2d95", "#00f0ff", "#9d4edd", sharedBackground, sharedText),
      fonts: [
        { role: "display", family: "Playfair Display", weights: [400, 700] },
        { role: "body", family: "Inter", weights: [400, 500, 600] },
      ],
    },
    "joes-stone-crab": {
      colors: roleColors("#00f0ff", "#ff6b35", "#9d4edd", sharedBackground, sharedText),
      fonts: [
        { role: "display", family: "Georgia", weights: [400, 700] },
        { role: "body", family: "Inter", weights: [400, 500, 600, 700] },
      ],
    },
    "panther-coffee": {
      colors: roleColors("#9d4edd", "#00f0ff", "#ff2d95", sharedBackground, sharedText),
      fonts: [
        { role: "display", family: "Inter", weights: [600, 700] },
        { role: "body", family: "Inter", weights: [400, 500] },
      ],
    },
    "gramps-bar": {
      colors: roleColors("#ff2d95", "#9d4edd", "#00f0ff", sharedBackground, sharedText),
      fonts: [
        { role: "display", family: "Courier New", weights: [400, 700] },
        { role: "body", family: "Inter", weights: [400, 500, 600] },
      ],
    },
    "robert-is-here": {
      colors: roleColors("#ff6b35", "#00f0ff", "#9d4edd", sharedBackground, sharedText),
      fonts: [
        { role: "display", family: "Georgia", weights: [400, 700] },
        { role: "body", family: "Inter", weights: [400, 500, 600] },
      ],
    },
  };

  const config = slugConfig[slug] ?? slugConfig.versailles;
  return baseTokens(config.colors, config.fonts, sourceUrl);
}

function spacingMap(tokens: BrandTokens): Record<string, string> {
  const map: Record<string, string> = {};
  tokens.spacing.forEach((value, index) => {
    const key = SPACING_KEYS[index];
    if (key) map[key] = `${value}px`;
  });
  return map;
}

function radiusMap(tokens: BrandTokens): Record<string, string> {
  const map: Record<string, string> = {};
  tokens.radii.forEach((value, index) => {
    const key = RADIUS_KEYS[index];
    if (key) map[key] = value >= 999 ? "9999px" : `${value}px`;
  });
  return map;
}

export function tokensToW3C(tokens: BrandTokens): string {
  const color: Record<string, { $type: string; $value: string }> = {};
  for (const entry of tokens.colors) {
    color[entry.role] = { $type: "color", $value: entry.value };
  }

  const fontFamily: Record<string, { $type: string; $value: string }> = {};
  for (const font of tokens.fonts) {
    fontFamily[font.role] = { $type: "fontFamily", $value: font.family };
  }

  const spacing: Record<string, { $type: string; $value: string }> = {};
  for (const [key, value] of Object.entries(spacingMap(tokens))) {
    spacing[key] = { $type: "dimension", $value: value };
  }

  const borderRadius: Record<string, { $type: string; $value: string }> = {};
  for (const [key, value] of Object.entries(radiusMap(tokens))) {
    borderRadius[key] = { $type: "dimension", $value: value };
  }

  const shadow: Record<string, { $type: string; $value: string }> = {};
  tokens.shadows.forEach((value, index) => {
    const key = SHADOW_KEYS[index] ?? `shadow-${index}`;
    shadow[key] = { $type: "shadow", $value: value };
  });

  return JSON.stringify(
    { color, fontFamily, spacing, borderRadius, shadow },
    null,
    2,
  );
}

function cssFontStack(family: string): string {
  const lower = family.toLowerCase();
  if (lower.includes("mono") || lower.includes("jetbrains") || lower.includes("courier")) {
    return `"${family}", ui-monospace, monospace`;
  }
  if (
    lower.includes("georgia") ||
    lower.includes("playfair") ||
    lower.includes("lora") ||
    lower.includes("times")
  ) {
    return `"${family}", Georgia, serif`;
  }
  return `"${family}", "Helvetica Neue", Arial, sans-serif`;
}

export function tokensToCssVars(tokens: BrandTokens): string {
  const lines: string[] = [":root {"];

  for (const color of tokens.colors) {
    lines.push(`  --color-${color.role}: ${color.value};`);
  }

  for (const font of tokens.fonts) {
    lines.push(`  --font-${font.role}: ${cssFontStack(font.family)};`);
  }

  for (const [key, value] of Object.entries(spacingMap(tokens))) {
    lines.push(`  --spacing-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(radiusMap(tokens))) {
    lines.push(`  --radius-${key}: ${value};`);
  }

  lines.push("}", "");
  return lines.join("\n");
}

function tailwindColorObject(tokens: BrandTokens): string {
  const entries = tokens.colors.map(
    (color) => `        ${color.role}: "var(--color-${color.role})",`,
  );
  return entries.join("\n");
}

function tailwindFontObject(tokens: BrandTokens): string {
  const entries = tokens.fonts.map(
    (font) => `        ${font.role}: ["var(--font-${font.role})"],`,
  );
  return entries.join("\n");
}

function tailwindRadiusObject(tokens: BrandTokens): string {
  const entries = Object.keys(radiusMap(tokens)).map(
    (key) => `        ${key}: "var(--radius-${key})",`,
  );
  return entries.join("\n");
}

export function tokensToTailwindTheme(
  tokens: BrandTokens,
  library?: string,
): string {
  const plugins =
    library === "daisyui"
      ? `\n  plugins: [require("daisyui")],`
      : "\n  plugins: [],";

  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
${tailwindColorObject(tokens)}
      },
      fontFamily: {
${tailwindFontObject(tokens)}
      },
      borderRadius: {
${tailwindRadiusObject(tokens)}
      },
    },
  },${plugins}
};

export default config;
`;
}

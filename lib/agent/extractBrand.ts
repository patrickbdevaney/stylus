import {
  BrandTokensSchema,
  type BrandColor,
  type BrandFont,
  type BrandTokens,
  type SiteSnapshot,
} from "@/lib/schema";

const FIRECRAWL_TIMEOUT_MS = 12_000;

const DEFAULT_SPACING = [4, 8, 12, 16, 24, 32, 48, 64];
const DEFAULT_RADII = [4, 8, 12, 16, 24, 9999];

const NEON_DEFAULTS: Omit<BrandTokens, "sourceUrl" | "extractedAt"> = {
  colors: [
    { role: "primary", value: "#ff2d95", confidence: 0 },
    { role: "secondary", value: "#00f0ff", confidence: 0 },
    { role: "accent", value: "#9d4edd", confidence: 0 },
    { role: "background", value: "#0a0a12", confidence: 0 },
    { role: "text", value: "#f0f0f8", confidence: 0 },
  ],
  fonts: [
    { role: "display", family: "Courier New", weights: [400] },
    { role: "body", family: "Inter", weights: [400, 500, 600, 700] },
  ],
  spacing: DEFAULT_SPACING,
  radii: DEFAULT_RADII,
  shadows: [],
  motion: { hasParallax: false, hasScrollAnimation: false },
  logo: null,
  degraded: true,
};

const COLOR_ROLES: BrandColor["role"][] = [
  "primary",
  "secondary",
  "accent",
  "background",
  "text",
];

type FirecrawlBrandingPayload = {
  colors?: Record<string, string | undefined>;
  fonts?: Array<{ family?: string; role?: string }>;
  typography?: {
    fontFamilies?: {
      primary?: string;
      heading?: string;
      body?: string;
      code?: string;
    };
    fontWeights?: Record<string, number>;
  };
  spacing?: number[] | { baseUnit?: number; borderRadius?: string };
  borderRadius?: string | number[];
  logo?: string;
  images?: { logo?: string; favicon?: string };
};

function mergeColors(base: BrandColor[], overlay: BrandColor[]): BrandColor[] {
  const byRole = new Map<BrandColor["role"], BrandColor>();
  for (const color of base) {
    byRole.set(color.role, color);
  }
  for (const color of overlay) {
    const existing = byRole.get(color.role);
    if (!existing || color.confidence > existing.confidence) {
      byRole.set(color.role, color);
    }
  }
  return Array.from(byRole.values());
}

function mergeFonts(base: BrandFont[], overlay: BrandFont[]): BrandFont[] {
  const byRole = new Map<BrandFont["role"], BrandFont>();
  for (const font of base) {
    byRole.set(font.role, font);
  }
  for (const font of overlay) {
    byRole.set(font.role, font);
  }
  return Array.from(byRole.values());
}

export function defaultBrandTokens(sourceUrl: string | null): BrandTokens {
  return {
    ...NEON_DEFAULTS,
    sourceUrl,
    extractedAt: new Date().toISOString(),
  };
}

export function mergeBrandTokens(
  base: BrandTokens,
  overlay: Partial<BrandTokens>,
): BrandTokens {
  const colors =
    overlay.colors && overlay.colors.length > 0
      ? mergeColors(base.colors, overlay.colors)
      : base.colors;
  const fonts =
    overlay.fonts && overlay.fonts.length > 0
      ? mergeFonts(base.fonts, overlay.fonts)
      : base.fonts;

  return {
    colors,
    fonts,
    spacing:
      overlay.spacing && overlay.spacing.length > 0
        ? overlay.spacing
        : base.spacing,
    radii:
      overlay.radii && overlay.radii.length > 0 ? overlay.radii : base.radii,
    shadows:
      overlay.shadows && overlay.shadows.length > 0
        ? overlay.shadows
        : base.shadows,
    motion: overlay.motion ?? base.motion,
    logo: overlay.logo !== undefined ? overlay.logo : base.logo,
    extractedAt: overlay.extractedAt ?? base.extractedAt,
    sourceUrl: overlay.sourceUrl !== undefined ? overlay.sourceUrl : base.sourceUrl,
    degraded:
      overlay.degraded === false
        ? false
        : overlay.degraded !== undefined
          ? overlay.degraded
          : base.degraded,
  };
}

function parsePixelValues(input: string): number[] {
  const matches = input.match(/(\d+(?:\.\d+)?)\s*px/gi);
  if (!matches) return [];
  return matches
    .map((m) => Number.parseFloat(m))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

function parseRadiiFromBranding(
  spacing: FirecrawlBrandingPayload["spacing"],
  borderRadius: FirecrawlBrandingPayload["borderRadius"],
): number[] {
  if (Array.isArray(borderRadius)) {
    return borderRadius.filter((n) => typeof n === "number" && n > 0);
  }
  if (typeof borderRadius === "string") {
    const parsed = parsePixelValues(borderRadius);
    if (parsed.length > 0) return parsed;
  }

  if (Array.isArray(spacing)) {
    return spacing.filter((n) => n > 0);
  }
  if (spacing && typeof spacing === "object" && spacing.borderRadius) {
    const parsed = parsePixelValues(spacing.borderRadius);
    if (parsed.length > 0) return parsed;
  }

  return DEFAULT_RADII;
}

function parseSpacingFromBranding(
  spacing: FirecrawlBrandingPayload["spacing"],
): number[] {
  if (Array.isArray(spacing) && spacing.length > 0) {
    return spacing.filter((n) => n > 0);
  }
  if (
    spacing &&
    !Array.isArray(spacing) &&
    typeof spacing.baseUnit === "number" &&
    spacing.baseUnit > 0
  ) {
    const unit = spacing.baseUnit;
    return [unit, unit * 2, unit * 3, unit * 4, unit * 6, unit * 8, unit * 12, unit * 16];
  }
  return DEFAULT_SPACING;
}

function mapFirecrawlColors(
  colors: Record<string, string | undefined>,
): BrandColor[] {
  const roleMap: Array<{ key: string; role: BrandColor["role"]; confidence: number }> = [
    { key: "primary", role: "primary", confidence: 0.9 },
    { key: "secondary", role: "secondary", confidence: 0.6 },
    { key: "accent", role: "accent", confidence: 0.6 },
    { key: "background", role: "background", confidence: 0.6 },
    { key: "textPrimary", role: "text", confidence: 0.6 },
    { key: "text", role: "text", confidence: 0.6 },
    { key: "link", role: "accent", confidence: 0.5 },
    { key: "border", role: "border", confidence: 0.5 },
  ];

  const mapped: BrandColor[] = [];
  const seenRoles = new Set<BrandColor["role"]>();

  for (const { key, role, confidence } of roleMap) {
    const value = colors[key];
    if (!value || seenRoles.has(role)) continue;
    seenRoles.add(role);
    mapped.push({ role, value, confidence });
  }

  return mapped;
}

function mapFirecrawlFonts(branding: FirecrawlBrandingPayload): BrandFont[] {
  const fonts: BrandFont[] = [];
  const defaultWeights = [400, 500, 600, 700];
  const weightValues = branding.typography?.fontWeights
    ? Object.values(branding.typography.fontWeights).filter(
        (w): w is number => typeof w === "number",
      )
    : defaultWeights;

  if (branding.fonts && branding.fonts.length > 0) {
    for (const entry of branding.fonts) {
      if (!entry.family) continue;
      const roleRaw = (entry.role ?? "").toLowerCase();
      const role: BrandFont["role"] =
        roleRaw.includes("head") || roleRaw === "display"
          ? "display"
          : roleRaw.includes("mono") || roleRaw === "code"
            ? "mono"
            : roleRaw.includes("accent")
              ? "accent"
              : "body";
      if (fonts.some((f) => f.role === role)) continue;
      fonts.push({ role, family: entry.family, weights: weightValues });
    }
  }

  const families = branding.typography?.fontFamilies;
  if (families?.heading && !fonts.some((f) => f.role === "display")) {
    fonts.push({
      role: "display",
      family: families.heading,
      weights: weightValues,
    });
  }
  const bodyFamily = families?.body ?? families?.primary;
  if (bodyFamily && !fonts.some((f) => f.role === "body")) {
    fonts.push({ role: "body", family: bodyFamily, weights: weightValues });
  }
  if (families?.code && !fonts.some((f) => f.role === "mono")) {
    fonts.push({ role: "mono", family: families.code, weights: [400, 700] });
  }

  if (fonts.length === 0) {
    fonts.push({ role: "body", family: "Inter", weights: defaultWeights });
  }

  return fonts;
}

function mapFirecrawlBranding(
  branding: FirecrawlBrandingPayload,
  url: string,
): BrandTokens | null {
  const colors = branding.colors
    ? mapFirecrawlColors(branding.colors)
    : [];
  const fonts = mapFirecrawlFonts(branding);
  const logo =
    branding.logo ?? branding.images?.logo ?? null;

  const tokens: BrandTokens = {
    colors: colors.length > 0 ? colors : NEON_DEFAULTS.colors,
    fonts,
    spacing: parseSpacingFromBranding(branding.spacing),
    radii: parseRadiiFromBranding(branding.spacing, branding.borderRadius),
    shadows: [],
    motion: { hasParallax: false, hasScrollAnimation: false },
    logo,
    extractedAt: new Date().toISOString(),
    sourceUrl: url,
    degraded: false,
  };

  const parsed = BrandTokensSchema.safeParse(tokens);
  return parsed.success ? parsed.data : null;
}

async function extractViaFirecrawl(url: string): Promise<BrandTokens | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["branding"] }),
      signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      success?: boolean;
      data?: { branding?: FirecrawlBrandingPayload };
    };

    if (!json.success || !json.data?.branding) return null;

    return mapFirecrawlBranding(json.data.branding, url);
  } catch {
    return null;
  }
}

function normalizeHex(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
  }
  if (raw.length === 6 || raw.length === 8) {
    return `#${raw.slice(0, 6)}`.toLowerCase();
  }
  return hex.toLowerCase();
}

function isNearWhite(value: string): boolean {
  const hex = normalizeHex(value);
  if (!hex.startsWith("#") || hex.length !== 7) return false;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return r > 240 && g > 240 && b > 240;
}

function isNearBlack(value: string): boolean {
  const hex = normalizeHex(value);
  if (!hex.startsWith("#") || hex.length !== 7) return false;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return r < 20 && g < 20 && b < 20;
}

function extractColorCandidates(rawText: string): string[] {
  const counts = new Map<string, number>();

  const add = (value: string) => {
    const normalized = value.startsWith("#") ? normalizeHex(value) : value;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  };

  for (const match of Array.from(rawText.matchAll(/#([0-9a-fA-F]{3,8})\b/g))) {
    add(`#${match[1]}`);
  }

  for (const match of Array.from(
    rawText.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi),
  )) {
    const r = Number.parseInt(match[1], 10);
    const g = Number.parseInt(match[2], 10);
    const b = Number.parseInt(match[3], 10);
    add(
      `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
    );
  }

  for (const match of Array.from(rawText.matchAll(/hsla?\([^)]+\)/gi))) {
    add(match[0]);
  }

  return Array.from(counts.entries())
    .filter(([value]) => !isNearWhite(value) && !isNearBlack(value))
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}

function mapFrequencyColors(candidates: string[]): BrandColor[] {
  const top = candidates.slice(0, 5);
  if (top.length === 0) {
    return NEON_DEFAULTS.colors.map((c) => ({ ...c, confidence: 0.5 }));
  }

  return top.map((value, index) => ({
    role: COLOR_ROLES[index] ?? "unknown",
    value,
    confidence: 0.5,
  }));
}

function cleanFontFamily(raw: string): string {
  return raw
    .replace(/["']/g, "")
    .split(",")[0]
    ?.trim() ?? raw.trim();
}

function extractFontsFromRawText(rawText: string): BrandFont[] {
  const fonts: BrandFont[] = [];
  const seen = new Set<string>();

  const addFont = (family: string, role: BrandFont["role"]) => {
    const cleaned = cleanFontFamily(family);
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    fonts.push({
      role,
      family: cleaned,
      weights: [400, 500, 600, 700],
    });
  };

  for (const match of Array.from(
    rawText.matchAll(
      /fonts\.googleapis\.com\/css2\?[^"'\s>]*family=([^:&"'\s>]+)/gi,
    ),
  )) {
    addFont(decodeURIComponent(match[1].replace(/\+/g, " ")), "display");
  }

  for (const match of Array.from(
    rawText.matchAll(
      /fonts\.googleapis\.com\/css\?[^"'\s>]*family=([^:&"'\s>]+)/gi,
    ),
  )) {
    addFont(decodeURIComponent(match[1].replace(/\+/g, " ")), "display");
  }

  for (const match of Array.from(
    rawText.matchAll(/font-family\s*:\s*([^;}{]+)/gi),
  )) {
    const families = match[1].split(",");
    addFont(families[0], fonts.length === 0 ? "display" : "body");
    if (families[1]) {
      addFont(families[1], "body");
    }
  }

  if (fonts.length === 0) {
    fonts.push({ role: "body", family: "Inter", weights: [400, 500, 600, 700] });
  } else if (!fonts.some((f) => f.role === "display")) {
    fonts[0] = { ...fonts[0], role: "display" };
  }

  return fonts;
}

function extractCssVarNumbers(rawText: string, pattern: RegExp): number[] {
  const values: number[] = [];
  for (const match of Array.from(rawText.matchAll(pattern))) {
    const parsed = Number.parseFloat(match[1]);
    if (!Number.isNaN(parsed) && parsed > 0) {
      values.push(parsed);
    }
  }
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function extractSpacingFromCssVars(rawText: string): number[] {
  const spacing = extractCssVarNumbers(
    rawText,
    /--[\w-]*(?:space|spacing|gap|size)[\w-]*\s*:\s*(\d+(?:\.\d+)?)\s*px/gi,
  );
  return spacing.length > 0 ? spacing : DEFAULT_SPACING;
}

function extractRadiiFromCssVars(rawText: string): number[] {
  const radii = extractCssVarNumbers(
    rawText,
    /--[\w-]*(?:radius|rounded)[\w-]*\s*:\s*(\d+(?:\.\d+)?)\s*px/gi,
  );
  return radii.length > 0 ? radii : DEFAULT_RADII;
}

async function extractViaStyleScrape(
  snapshot: SiteSnapshot,
): Promise<BrandTokens | null> {
  try {
    const { rawText } = snapshot;
    const colors = mapFrequencyColors(extractColorCandidates(rawText));
    const fonts = extractFontsFromRawText(rawText);

    const tokens: BrandTokens = {
      colors,
      fonts,
      spacing: extractSpacingFromCssVars(rawText),
      radii: extractRadiiFromCssVars(rawText),
      shadows: [],
      motion: { hasParallax: false, hasScrollAnimation: false },
      logo: null,
      extractedAt: new Date().toISOString(),
      sourceUrl: snapshot.url,
      degraded: true,
    };

    const parsed = BrandTokensSchema.safeParse(tokens);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function extractBrand(
  snapshot: SiteSnapshot,
  opts?: { onProgress?: (msg: string) => void },
): Promise<BrandTokens> {
  if (snapshot.url === null || snapshot.degraded) {
    opts?.onProgress?.("No live URL — using default brand tokens.");
    return defaultBrandTokens(snapshot.url);
  }

  let tokens: BrandTokens | null = null;

  const firecrawlResult = await extractViaFirecrawl(snapshot.url);
  if (firecrawlResult) {
    opts?.onProgress?.(
      `Brand tokens extracted via Firecrawl (${firecrawlResult.colors.length} colors, ${firecrawlResult.fonts.length} fonts).`,
    );
    tokens = firecrawlResult;
  }

  const styleScrapeResult = await extractViaStyleScrape(snapshot);

  if (tokens && styleScrapeResult) {
    tokens = mergeBrandTokens(styleScrapeResult, tokens);
  } else if (!tokens) {
    tokens = styleScrapeResult ?? defaultBrandTokens(snapshot.url);
  }

  const parsed = BrandTokensSchema.safeParse(tokens);
  if (!parsed.success) {
    return defaultBrandTokens(snapshot.url);
  }

  return parsed.data;
}

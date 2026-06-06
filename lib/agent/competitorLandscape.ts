import { defaultBrandTokens, extractBrand } from "@/lib/agent/extractBrand";
import {
  LandscapeAnalysisSchema,
  type BrandTokens,
  type ColorTendency,
  type LandscapeAnalysis,
  type SiteSnapshot,
} from "@/lib/schema";

type FontStyle = LandscapeAnalysis["targetFontStyle"];

const SERIF_FAMILIES = [
  "georgia",
  "playfair",
  "lora",
  "times",
  "garamond",
  "palatino",
  "merriweather",
  "crimson",
  "baskerville",
  "cambria",
  "serif",
];

const SANS_FAMILIES = [
  "inter",
  "helvetica",
  "arial",
  "roboto",
  "open sans",
  "system-ui",
  "sans-serif",
  "Segoe UI",
  "avenir",
  "futura",
];

const MONO_FAMILIES = [
  "courier",
  "jetbrains",
  "fira code",
  "monospace",
  "consolas",
  "menlo",
  "source code",
];

const NEUTRAL_TENDENCY: ColorTendency = {
  dominantHue: "neutral",
  saturation: "neutral",
  lightness: "dark",
};

function hexToHsl(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  let r: number;
  let g: number;
  let b: number;

  if (normalized.length === 3) {
    r = Number.parseInt(normalized[0] + normalized[0], 16);
    g = Number.parseInt(normalized[1] + normalized[1], 16);
    b = Number.parseInt(normalized[2] + normalized[2], 16);
  } else {
    r = Number.parseInt(normalized.slice(0, 2), 16);
    g = Number.parseInt(normalized.slice(2, 4), 16);
    b = Number.parseInt(normalized.slice(4, 6), 16);
  }

  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / delta + 2) * 60;
        break;
      default:
        h = ((rn - gn) / delta + 4) * 60;
        break;
    }
  }

  return [h, s * 100, l * 100];
}

function classifyHue(h: number, s: number, l: number): ColorTendency["dominantHue"] {
  if (s < 15) return "neutral";
  if (l < 20) return "dark";
  if (l > 80) return "neutral";

  if (h >= 330 || h < 15) return h >= 345 ? "pink" : "red";
  if (h < 30) return "red";
  if (h < 60) return "orange";
  if (h < 90) return "yellow";
  if (h < 150) return "green";
  if (h < 210) return "blue";
  if (h < 270) return "blue";
  if (h < 330) return "purple";
  return "pink";
}

function classifySaturation(s: number): ColorTendency["saturation"] {
  if (s > 60) return "vibrant";
  if (s > 20) return "muted";
  return "neutral";
}

function classifyLightness(l: number): ColorTendency["lightness"] {
  if (l > 60) return "light";
  if (l > 30) return "mid";
  return "dark";
}

function colorToHsl(value: string): [number, number, number] | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    return hexToHsl(trimmed);
  }
  const rgbMatch = trimmed.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i,
  );
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1], 10);
    const g = Number.parseInt(rgbMatch[2], 10);
    const b = Number.parseInt(rgbMatch[3], 10);
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return hexToHsl(hex);
  }
  return null;
}

function averageHue(
  entries: Array<{ h: number; weight: number }>,
): number {
  let sinSum = 0;
  let cosSum = 0;
  let weightSum = 0;

  for (const entry of entries) {
    const rad = (entry.h * Math.PI) / 180;
    sinSum += Math.sin(rad) * entry.weight;
    cosSum += Math.cos(rad) * entry.weight;
    weightSum += entry.weight;
  }

  if (weightSum === 0) return 0;
  const avgRad = Math.atan2(sinSum / weightSum, cosSum / weightSum);
  const avg = (avgRad * 180) / Math.PI;
  return avg < 0 ? avg + 360 : avg;
}

function dominantColorTendency(tokens: BrandTokens): ColorTendency {
  const hslEntries: Array<{ h: number; s: number; l: number; weight: number }> =
    [];

  for (const color of tokens.colors) {
    const hsl = colorToHsl(color.value);
    if (!hsl) continue;
    const weight = Math.max(color.confidence, 0.1);
    hslEntries.push({
      h: hsl[0],
      s: hsl[1],
      l: hsl[2],
      weight,
    });
  }

  if (hslEntries.length === 0) {
    return NEUTRAL_TENDENCY;
  }

  let weightSum = 0;
  let sSum = 0;
  let lSum = 0;
  const hueEntries: Array<{ h: number; weight: number }> = [];

  for (const entry of hslEntries) {
    weightSum += entry.weight;
    sSum += entry.s * entry.weight;
    lSum += entry.l * entry.weight;
    hueEntries.push({ h: entry.h, weight: entry.weight });
  }

  const avgH = averageHue(hueEntries);
  const avgS = sSum / weightSum;
  const avgL = lSum / weightSum;

  return {
    dominantHue: classifyHue(avgH, avgS, avgL),
    saturation: classifySaturation(avgS),
    lightness: classifyLightness(avgL),
  };
}

function classifyFontFamily(family: string): FontStyle {
  const lower = family.toLowerCase();

  if (MONO_FAMILIES.some((name) => lower.includes(name))) {
    return "mono";
  }
  if (SERIF_FAMILIES.some((name) => lower.includes(name))) {
    return "serif";
  }
  if (SANS_FAMILIES.some((name) => lower.includes(name))) {
    return "sans-serif";
  }
  return "sans-serif";
}

function dominantFontStyle(tokens: BrandTokens): FontStyle {
  const counts: Record<FontStyle, number> = {
    serif: 0,
    "sans-serif": 0,
    mixed: 0,
    mono: 0,
  };

  for (const font of tokens.fonts) {
    const style = classifyFontFamily(font.family);
    counts[style] += 1;
  }

  const ranked = (Object.entries(counts) as Array<[FontStyle, number]>).filter(
    ([, count]) => count > 0,
  );
  ranked.sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    return "sans-serif";
  }
  if (ranked.length >= 2 && ranked[0][1] === ranked[1][1]) {
    return "mixed";
  }
  return ranked[0][0];
}

function majorityFontStyle(styles: FontStyle[]): FontStyle {
  if (styles.length === 0) return "sans-serif";

  const counts: Record<FontStyle, number> = {
    serif: 0,
    "sans-serif": 0,
    mixed: 0,
    mono: 0,
  };

  for (const style of styles) {
    counts[style] += 1;
  }

  const ranked = (Object.entries(counts) as Array<[FontStyle, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  const top = ranked[0];
  const second = ranked[1];

  if (second && second[1] > 0 && top[1] === second[1]) {
    return "mixed";
  }
  return top[0];
}

function deriveDifferentiationVector(
  targetTendency: ColorTendency,
  sharedTendency: ColorTendency,
  targetFont: FontStyle,
  sharedFont: FontStyle,
  brandTier: string,
): string {
  if (targetTendency.dominantHue !== sharedTendency.dominantHue) {
    return `Your palette stands apart from competitors who favor ${sharedTendency.dominantHue} tones — lean into this distinction.`;
  }

  if (
    targetTendency.dominantHue === sharedTendency.dominantHue &&
    targetTendency.saturation !== sharedTendency.saturation
  ) {
    return `Match category but own ${targetTendency.saturation} palette where rivals are ${sharedTendency.saturation}.`;
  }

  if (targetFont !== sharedFont) {
    return `Competitors are ${sharedFont}-heavy; your ${targetFont} treatment is a typographic differentiator.`;
  }

  if (brandTier === "iconic") {
    return "As an iconic brand, amplify heritage — depth and restraint will stand apart from modern rivals.";
  }

  return "Differentiate through UX clarity and conversion, not just aesthetics.";
}

function isWarmHue(hue: ColorTendency["dominantHue"]): boolean {
  return hue === "orange" || hue === "red";
}

function isDarkMuted(tendency: ColorTendency): boolean {
  return (
    tendency.lightness === "dark" &&
    (tendency.saturation === "muted" || tendency.saturation === "neutral")
  );
}

function recommendArchetype(
  brandTier: "iconic" | "established" | "generic",
  targetTendency: ColorTendency,
  targetFont: FontStyle,
): LandscapeAnalysis["recommendedArchetype"] {
  if (brandTier === "iconic" && isDarkMuted(targetTendency)) {
    if (targetFont === "serif") return "editorial";
    if (targetFont === "sans-serif") return "luxury";
  }

  if (isWarmHue(targetTendency.dominantHue)) {
    return "warm-local";
  }

  if (
    brandTier === "established" &&
    targetTendency.saturation === "vibrant" &&
    targetFont === "sans-serif"
  ) {
    return "tech";
  }

  if (
    brandTier === "generic" &&
    targetTendency.saturation === "vibrant" &&
    targetFont === "sans-serif"
  ) {
    return "playful";
  }

  return "generic";
}

function businessNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const stem = hostname.split(".")[0] ?? hostname;
    return stem.replace(/-/g, " ");
  } catch {
    return "Competitor";
  }
}

function minimalSnapshot(url: string): SiteSnapshot {
  return {
    businessName: businessNameFromUrl(url),
    url,
    degraded: false,
    title: null,
    description: null,
    headings: [],
    contact: { phone: null, address: null, email: null },
    rawText: "",
    screenshot: null,
  };
}

export async function extractCompetitorTokens(
  competitorUrls: string[],
  onProgress?: (msg: string) => void,
): Promise<BrandTokens[]> {
  const tokens: BrandTokens[] = [];
  const urls = competitorUrls.slice(0, 3);

  for (const url of urls) {
    onProgress?.(`Extracting brand tokens from ${url}…`);
    try {
      const snapshot = minimalSnapshot(url);
      const extracted = await extractBrand(snapshot);
      tokens.push(extracted);
    } catch {
      tokens.push(defaultBrandTokens(url));
    }
  }

  return tokens;
}

export function defaultLandscape(competitorUrls: string[]): LandscapeAnalysis {
  return {
    competitorCount: competitorUrls.length,
    sharedColorTendency: NEUTRAL_TENDENCY,
    sharedFontStyle: "sans-serif",
    targetColorTendency: NEUTRAL_TENDENCY,
    targetFontStyle: "sans-serif",
    differentiationVector:
      "Insufficient competitor data for relational analysis.",
    recommendedArchetype: "generic",
    competitorUrls,
    degraded: true,
  };
}

function mergeCompetitorColors(competitorTokens: BrandTokens[]): BrandTokens {
  const base = competitorTokens[0] ?? defaultBrandTokens(null);
  return {
    ...base,
    colors: competitorTokens.flatMap((token) => token.colors),
  };
}

export async function analyzeLandscape(
  target: BrandTokens,
  competitorUrls: string[],
  brandTier: "iconic" | "established" | "generic",
  onProgress?: (msg: string) => void,
): Promise<LandscapeAnalysis> {
  if (competitorUrls.length === 0) {
    return defaultLandscape([]);
  }

  onProgress?.("Analyzing competitor design systems...");

  const urls = competitorUrls.slice(0, 3);
  const competitorTokens = await extractCompetitorTokens(urls, onProgress);

  const targetColorTendency = dominantColorTendency(target);
  const targetFontStyle = dominantFontStyle(target);
  const mergedCompetitors = mergeCompetitorColors(competitorTokens);
  const sharedColorTendency = dominantColorTendency(mergedCompetitors);
  const sharedFontStyle = majorityFontStyle(
    competitorTokens.map((token) => dominantFontStyle(token)),
  );
  const differentiationVector = deriveDifferentiationVector(
    targetColorTendency,
    sharedColorTendency,
    targetFontStyle,
    sharedFontStyle,
    brandTier,
  );
  const recommendedArchetype = recommendArchetype(
    brandTier,
    targetColorTendency,
    targetFontStyle,
  );

  const parsed = LandscapeAnalysisSchema.safeParse({
    competitorCount: competitorTokens.length,
    sharedColorTendency,
    sharedFontStyle,
    targetColorTendency,
    targetFontStyle,
    differentiationVector,
    recommendedArchetype,
    competitorUrls: urls,
    degraded: competitorTokens.every((token) => token.degraded),
  });

  if (!parsed.success) {
    return defaultLandscape(urls);
  }

  return parsed.data;
}

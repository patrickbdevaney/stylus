import type { GeneratedCopy } from "@/lib/agent/generateCopy";
import { generateLiveCopy } from "@/lib/agent/generateCopy";
import type { SiteAudit } from "@/lib/schema";
import {
  fillTemplateFromAudit,
  renderSinglePage,
} from "@/lib/template/singlePage";

export type SiteVariant = {
  copy: GeneratedCopy;
  html: string;
  businessName: string;
  variantIndex: number;
  raceDurationMs: number;
};

type ScoredVariant = {
  copy: GeneratedCopy;
  index: number;
  score: number;
};

function scoreCopy(copy: GeneratedCopy): number {
  let score = 0;
  if (copy.hero.length > 20) score += 1;
  if (copy.tagline.length > 30) score += 1;
  if (copy.services.length === 3) score += 1;
  if (copy.services.every((s) => s.description.length > 20)) score += 1;
  if (copy.about.length > 60) score += 1;
  if (copy.provider !== "fallback") score += 2;
  return score;
}

function renderWithCopy(audit: SiteAudit, copy: GeneratedCopy): string {
  const fill = fillTemplateFromAudit(audit);
  return renderSinglePage({
    ...fill,
    tagline: copy.tagline
      ? `${copy.hero} — ${copy.tagline}`
      : copy.hero || fill.tagline,
    services: copy.services.length > 0 ? copy.services : fill.services,
    about: copy.about || fill.about,
  });
}

export async function generateBestVariant(
  audit: SiteAudit,
  onProgress?: (msg: string) => void,
  onProviderResult?: (provider: string, ms: number, won: boolean) => void,
): Promise<SiteVariant> {
  onProgress?.("Racing 3 variants in parallel...");
  const raceStart = Date.now();

  const results = await Promise.allSettled([
    generateLiveCopy(audit),
    generateLiveCopy(audit),
    generateLiveCopy(audit),
  ]);

  let fulfilled: ScoredVariant[] = results
    .map((result, index) => {
      if (result.status !== "fulfilled") return null;
      const copy = result.value;
      onProgress?.(
        `Variant ${index} complete (${copy.provider}, ${copy.ms}ms)`,
      );
      return {
        copy,
        index,
        score: scoreCopy(copy),
      };
    })
    .filter((v): v is ScoredVariant => v !== null);

  if (fulfilled.length === 0) {
    const fallback = await generateLiveCopy(audit);
    onProgress?.(
      `Variant 0 complete (${fallback.provider}, ${fallback.ms}ms)`,
    );
    fulfilled = [
      { copy: fallback, index: 0, score: scoreCopy(fallback) },
    ];
  }

  onProgress?.("Selecting best of 3 variants...");

  fulfilled.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.copy.ms - b.copy.ms;
  });

  const winner = fulfilled[0];
  onProgress?.(`Winner: variant ${winner.index} (score: ${winner.score}/7)`);

  for (const v of fulfilled) {
    onProviderResult?.(v.copy.provider, v.copy.ms, v.index === winner.index);
  }

  const html = renderWithCopy(audit, winner.copy);
  const raceDurationMs = Date.now() - raceStart;

  return {
    copy: winner.copy,
    html,
    businessName: audit.businessName,
    variantIndex: winner.index,
    raceDurationMs,
  };
}

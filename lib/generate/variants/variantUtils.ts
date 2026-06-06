import { buildBaseScaffold } from "@/lib/generate/scaffold";
import { tokensToW3C } from "@/lib/generate/tokens";
import type { BrandTokens, DesignBrief, GeneratedVariant, SiteAudit } from "@/lib/schema";
import { renderFromAudit } from "@/lib/template/singlePage";

export function primaryLibrary(brief: DesignBrief): string {
  return brief.library;
}

export function buildVariantPage(
  audit: SiteAudit,
  brief: DesignBrief,
  headline: string,
  subcopy: string,
): string {
  return `export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-4 text-sm uppercase tracking-[0.2em] text-[var(--color-secondary)]">
        ${JSON.stringify(audit.category)}
      </p>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--color-primary)] md:text-6xl">
        ${JSON.stringify(audit.businessName)}
      </h1>
      <p className="mb-4 max-w-2xl text-xl text-[var(--color-text)] opacity-90">
        ${JSON.stringify(headline)}
      </p>
      <p className="mb-10 max-w-2xl text-base opacity-80">${JSON.stringify(subcopy)}</p>
      <a
        href="#contact"
        className="inline-flex w-fit rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-background)]"
      >
        ${JSON.stringify(brief.primaryAction)}
      </a>
    </main>
  );
}
`;
}

export async function assembleVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
  variantLabel: string,
  differentiationRationale: string,
  pageSource: string,
): Promise<GeneratedVariant> {
  const library = primaryLibrary(brief);
  const files = buildBaseScaffold({
    businessName: audit.businessName,
    library,
    tokens,
    brief,
  });
  files["app/page.tsx"] = pageSource;

  return {
    files,
    library,
    archetype: brief.archetype,
    businessName: audit.businessName,
    variantLabel,
    differentiationRationale,
    tokensJson: tokensToW3C(tokens),
    previewHtml: renderFromAudit(audit),
  };
}

export function buildFallbackVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
  variantLabel: string,
  rationale: string,
): GeneratedVariant {
  const previewHtml = renderFromAudit(audit);
  const library = primaryLibrary(brief);
  const files = buildBaseScaffold({
    businessName: audit.businessName,
    library,
    tokens,
    brief,
  });
  files["preview.html"] = previewHtml;

  return {
    files,
    library,
    archetype: brief.archetype,
    businessName: audit.businessName,
    variantLabel,
    differentiationRationale: rationale,
    tokensJson: tokensToW3C(tokens),
    previewHtml,
  };
}

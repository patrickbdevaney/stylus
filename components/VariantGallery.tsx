"use client";

import { useEffect, useMemo, useState } from "react";
import type { DesignBrief } from "@/lib/schema";
import { BundleDownloadCard } from "@/components/BundleDownloadCard";
import { VisualRegressionSlider } from "@/components/VisualRegressionSlider";

type VariantEntry = {
  index: number;
  label: string;
  archetype: string;
  library: string;
  previewHtml: string;
  rationale: string;
  heroType: string;
  servicesType: string;
  spacingScale: string;
  motionLevel: string;
};

type Props = {
  variants: VariantEntry[];
  variantFiles: Record<number, Record<string, string>>;
  businessName: string;
  originalUrl: string | null;
  deployUrl?: string | null;
  designBriefs?: DesignBrief[];
};

function thumShot(pageUrl: string): string {
  return `https://image.thum.io/get/width/600/crop/338/${pageUrl}`;
}

function axisPills(variant: VariantEntry): Array<{ key: string; label: string }> {
  return [
    { key: "hero", label: `${variant.heroType} hero` },
    { key: "services", label: variant.servicesType },
    { key: "spacing", label: variant.spacingScale },
    { key: "motion", label: variant.motionLevel },
  ];
}

function AxisBadgeRow({ variant }: { variant: VariantEntry }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {axisPills(variant).map((pill) => (
        <span
          key={pill.key}
          className="stage-label rounded-full border border-neon-purple/20 bg-neon-purple/10 px-2 py-0.5 text-[10px] normal-case tracking-normal text-neon-cyan"
        >
          {pill.label}
        </span>
      ))}
    </div>
  );
}

export function VariantGallery({
  variants,
  variantFiles,
  businessName,
  originalUrl,
  deployUrl,
  designBriefs = [],
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [diffMode, setDiffMode] = useState(false);

  const selected = variants[selectedIndex] ?? variants[0];
  const otherVariants = variants.filter((variant) => variant.index !== selected?.index);

  const previewBlobUrl = useMemo(() => {
    if (!selected?.previewHtml) return null;
    const blob = new Blob([selected.previewHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [selected?.previewHtml]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  if (variants.length === 0 || !selected) {
    return null;
  }

  const files = variantFiles[selected.index] ?? {};
  const beforeSrc = originalUrl ? thumShot(originalUrl) : null;
  const afterSrc = deployUrl
    ? thumShot(deployUrl)
    : previewBlobUrl
      ? previewBlobUrl
      : null;

  const briefLine = (() => {
    const selectedBrief =
      designBriefs[selected.index] ?? designBriefs[0] ?? null;
    if (!selectedBrief) return null;
    const raw = `${selectedBrief.archetype} — ${selectedBrief.differentiationVector}`;
    return raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
  })();

  return (
    <section className="glass-card neon-glow-cyan mt-8 animate-reveal-up p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="stage-label mb-2">Generated variants</p>
          <h2 className="font-display text-2xl uppercase tracking-wide text-white md:text-3xl">
            3 brand-faithful variants
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Each built on different design foundations — same brand tokens
          </p>
          {briefLine ? (
            <p className="mt-3 inline-block rounded-full border border-neon-cyan/35 bg-neon-cyan/10 px-4 py-1.5 text-xs text-neon-cyan">
              {briefLine}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setDiffMode((value) => !value)}
            className={`rounded-full border px-4 py-2 font-display text-xs uppercase tracking-wider transition ${
              diffMode
                ? "border-neon-pink bg-neon-pink/15 text-neon-pink"
                : "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
            }`}
          >
            Compare vs original ↔
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {variants.map((variant) => {
          const active = variant.index === selected.index;
          return (
            <button
              key={variant.index}
              type="button"
              onClick={() => setSelectedIndex(variant.index)}
              className={`flex flex-col items-start border-b-2 px-4 py-2 transition ${
                active
                  ? "border-neon-pink text-white"
                  : "border-transparent text-white/55 hover:text-white/80"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="font-display text-sm uppercase tracking-wide">
                  {variant.label}
                </span>
                <span className="rounded-full border border-neon-cyan/35 bg-neon-cyan/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neon-cyan">
                  {variant.library}
                </span>
              </span>
              <AxisBadgeRow variant={variant} />
            </button>
          );
        })}
      </div>

      {diffMode ? (
        <div className="mb-8">
          {!beforeSrc ? (
            <p className="rounded-xl border border-white/10 bg-night/60 px-4 py-3 text-sm text-white/60">
              No original URL for this demo — snapshot comparison unavailable.
            </p>
          ) : afterSrc ? (
            <VisualRegressionSlider
              beforeSrc={beforeSrc}
              afterSrc={afterSrc}
              businessName={businessName}
            />
          ) : (
            <p className="rounded-xl border border-white/10 bg-night/60 px-4 py-3 text-sm text-white/60">
              Deploy preview not ready yet — comparison will appear after deploy.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-4 overflow-hidden rounded-xl border border-neon-cyan/40 bg-night/80">
          <iframe
            title={`${selected.label} preview`}
            srcDoc={selected.previewHtml}
            className="h-[500px] w-full bg-white"
            sandbox="allow-scripts"
          />
        </div>
      )}

      <AxisBadgeRow variant={selected} />

      <div className="mb-8 mt-4">
        <BundleDownloadCard
          variant={selected}
          files={files}
          businessName={businessName}
          pending={Object.keys(files).length === 0}
        />
      </div>

      {otherVariants.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {otherVariants.map((variant) => (
            <button
              key={variant.index}
              type="button"
              onClick={() => setSelectedIndex(variant.index)}
              className="group overflow-hidden rounded-xl border border-white/10 bg-night/50 text-left transition hover:border-neon-cyan/40"
            >
              <div className="border-b border-white/10 px-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm uppercase tracking-wide text-white/80 group-hover:text-neon-cyan">
                    {variant.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-neon-purple">
                    {variant.archetype}
                  </span>
                </div>
                <AxisBadgeRow variant={variant} />
              </div>
              <iframe
                title={`${variant.label} mini preview`}
                srcDoc={variant.previewHtml}
                className="pointer-events-none h-[200px] w-full bg-white"
                sandbox="allow-scripts"
                tabIndex={-1}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

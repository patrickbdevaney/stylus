"use client";

import { useState } from "react";
import type { SeoGapResponse } from "@/lib/seoGap";

type Props = SeoGapResponse & {
  validation?: { passed: boolean; items: number };
};

export function SeoGapPanel({
  targetBusiness,
  competitors,
  categoryGap,
  recommendedCategory,
  summary,
  jsonLd,
  validation,
}: Props) {
  const [copied, setCopied] = useState(false);
  const jsonText = JSON.stringify(jsonLd, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const rows = [
    {
      name: targetBusiness,
      positioning: "Your site — target business",
      sourceUrl: "",
      isTarget: true,
    },
    ...competitors.filter(
      (c) => c.name.toLowerCase() !== targetBusiness.toLowerCase(),
    ),
  ];

  return (
    <div className="glass-card neon-glow-purple mt-8 animate-reveal-up p-6 md:p-8">
      <p className="stage-label mb-2">SEO gap analysis</p>
      <h2 className="mb-6 font-display text-3xl uppercase tracking-wide text-white md:text-4xl">
        Competitive landscape
      </h2>

      <section className="mb-8">
        <p className="stage-label mb-3 text-neon-cyan">Competitive landscape</p>
        <p className="text-base leading-relaxed text-white/80 md:text-lg">
          {summary}
        </p>
      </section>

      <section className="mb-8">
        <p className="mb-4 font-display text-lg uppercase tracking-[0.12em] text-white/55">
          Competitors
        </p>
        <ul className="space-y-4">
          {rows.map((row) => (
            <li
              key={row.name}
              className={`rounded-xl border px-4 py-3 ${
                "isTarget" in row && row.isTarget
                  ? "border-neon-pink/50 bg-neon-pink/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span
                  className={`font-display text-lg uppercase tracking-wide md:text-xl ${
                    "isTarget" in row && row.isTarget
                      ? "text-neon-pink"
                      : "text-white"
                  }`}
                >
                  {row.name}
                </span>
                {row.sourceUrl && (
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-neon-cyan transition hover:text-neon-pink"
                  >
                    source ↗
                  </a>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-white/65 md:text-base">
                {row.positioning}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {categoryGap && (
        <p className="mb-6 rounded-xl border border-neon-orange/40 bg-neon-orange/10 px-4 py-3 font-display text-sm uppercase tracking-wide text-neon-orange md:text-base">
          Competitors rank for {recommendedCategory} — your site is missing this
          schema.
        </p>
      )}

      <section>
        {validation?.passed && (
          <p className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 font-display text-sm uppercase tracking-wide text-emerald-400 md:text-base">
            ✓ Structured data validated by Lighthouse ({validation.items} items)
          </p>
        )}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg uppercase tracking-[0.12em] text-neon-cyan">
            Structured data (deployable)
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-neon-cyan/40 px-4 py-1.5 font-display text-sm uppercase tracking-wide text-neon-cyan transition hover:border-neon-pink hover:text-neon-pink"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="max-h-64 overflow-auto rounded-xl border border-neon-cyan/25 bg-night/80 p-4 font-mono text-xs leading-relaxed text-neon-cyan md:text-sm">
          {jsonText}
        </pre>
      </section>
    </div>
  );
}

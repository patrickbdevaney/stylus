"use client";

import type { SiteAudit } from "@/lib/schema";

const DIMENSION_LABELS: Record<
  keyof SiteAudit["dimensions"],
  string
> = {
  clarity: "Clarity",
  trust: "Trust",
  mobile: "Mobile",
  speed: "Speed",
  conversion: "Conversion",
  localSeo: "Local SEO",
};

type Props = {
  audit: SiteAudit;
};

export function ScoreCard({ audit }: Props) {
  return (
    <div className="glass-card mt-6 p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wider text-neon-pink">
            {audit.category}
          </p>
          <h2 className="font-display text-3xl uppercase text-white">
            {audit.businessName}
          </h2>
          <p className="mt-1 text-white/60">{audit.brand.tagline}</p>
        </div>
        <div className="text-center">
          <p className="font-display text-5xl text-gradient-pink-cyan">
            {audit.overallScore}
          </p>
          <p className="text-xs uppercase tracking-wider text-white/40">
            Overall
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(audit.dimensions) as (keyof SiteAudit["dimensions"])[]).map(
          (key) => {
            const dim = audit.dimensions[key];
            return (
              <div
                key={key}
                className="rounded-lg border border-white/10 bg-night/40 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-neon-cyan">
                    {DIMENSION_LABELS[key]}
                  </span>
                  <span className="font-display text-xl text-white">
                    {dim.score}
                  </span>
                </div>
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all"
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-white/55">
                  {dim.reason}
                </p>
              </div>
            );
          },
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <p className="mb-3 text-sm uppercase tracking-wider text-neon-orange">
          Top fixes
        </p>
        <ul className="space-y-2">
          {audit.topFixes.map((fix, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/70">
              <span className="text-neon-pink">{i + 1}.</span>
              {fix}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

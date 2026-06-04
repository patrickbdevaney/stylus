"use client";

import { useEffect, useState } from "react";
import type { SiteAudit } from "@/lib/schema";

const DIMENSION_LABELS: Record<keyof SiteAudit["dimensions"], string> = {
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const dimensions = Object.keys(
    audit.dimensions,
  ) as (keyof SiteAudit["dimensions"])[];

  return (
    <div
      className={`glass-card mt-8 p-6 md:p-8 ${
        visible ? "animate-reveal-up" : "reveal-hidden"
      }`}
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="stage-label mb-1 text-neon-pink">{audit.category}</p>
          <h2 className="font-display text-4xl uppercase leading-tight text-white md:text-5xl">
            {audit.businessName}
          </h2>
          <p className="mt-2 text-stage text-white/75">{audit.brand.tagline}</p>
        </div>
        <div className="text-center">
          <p className="font-display text-7xl leading-none text-gradient-pink-cyan md:text-8xl">
            {audit.overallScore}
          </p>
          <p className="mt-1 font-display text-lg uppercase tracking-[0.2em] text-white/50">
            Overall score
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {dimensions.map((key, i) => {
          const dim = audit.dimensions[key];
          return (
            <div
              key={key}
              className="rounded-xl border border-white/12 bg-night/50 p-5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(12px)",
                transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-xl uppercase tracking-wide text-neon-cyan">
                  {DIMENSION_LABELS[key]}
                </span>
                <span className="font-display text-3xl text-white">
                  {dim.score}
                </span>
              </div>
              <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-neon-pink to-neon-cyan"
                  style={{
                    width: visible ? `${dim.score}%` : "0%",
                    transition: `width 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${300 + i * 80}ms`,
                  }}
                />
              </div>
              <p className="text-stage-sm leading-relaxed text-white/70">
                {dim.reason}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-white/10 pt-8">
        <p className="mb-4 font-display text-2xl uppercase tracking-wide text-neon-orange">
          Top fixes
        </p>
        <ul className="space-y-3">
          {audit.topFixes.map((fix, i) => (
            <li
              key={i}
              className="flex gap-4 text-stage text-white/85"
              style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${600 + i * 100}ms`,
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon-pink/20 font-display text-lg text-neon-pink">
                {i + 1}
              </span>
              {fix}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

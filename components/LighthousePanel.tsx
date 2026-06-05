"use client";

import { useEffect, useState } from "react";
import type { LighthouseDelta, LighthouseScores } from "@/lib/lighthouse";

type Props = LighthouseDelta & {
  businessName: string;
};

const METRICS: {
  key: keyof Pick<
    LighthouseScores,
    "performance" | "seo" | "accessibility" | "bestPractices"
  >;
  label: string;
}[] = [
  { key: "performance", label: "Performance" },
  { key: "seo", label: "SEO" },
  { key: "accessibility", label: "Accessibility" },
  { key: "bestPractices", label: "Best Practices" },
];

function scorePillClass(score: number): string {
  if (score >= 90) return "border-emerald-400/50 bg-emerald-500/15 text-emerald-300";
  if (score >= 50) return "border-neon-orange/50 bg-neon-orange/10 text-neon-orange";
  return "border-red-500/50 bg-red-500/15 text-red-300";
}

function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}

function measuredAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (sec < 60) return `measured ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `measured ${min}m ago`;
  return `measured ${Math.floor(min / 60)}h ago`;
}

function pageSpeedInsightsUrl(sourceUrl: string): string {
  return `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(sourceUrl)}`;
}

function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <>{value}</>;
}

function ScorePillWithProvenance({
  scores,
  metricKey,
  muted,
}: {
  scores: LighthouseScores;
  metricKey: (typeof METRICS)[number]["key"];
  muted?: boolean;
}) {
  const score = scores[metricKey];
  const pillBase = muted
    ? "border-white/20 bg-white/5 text-white/55"
    : scorePillClass(score);

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex min-w-[3rem] items-center justify-center gap-0.5 rounded-full border px-3 py-1 font-mono text-sm font-bold tabular-nums ${pillBase}`}
        title={
          scores.seeded
            ? "Estimated — PSI could not reach this URL"
            : provenanceShort(scores)
        }
      >
        {scores.seeded && (
          <span className="text-amber-300" aria-hidden>
            ~
          </span>
        )}
        <CountUp target={score} />
        {scores.seeded && (
          <span
            className="ml-0.5 text-[10px] font-bold text-amber-400"
            aria-label="Estimated"
          >
            *
          </span>
        )}
      </span>
      {scores.seeded ? (
        <span className="text-[10px] leading-tight text-amber-400/90">
          Estimated — PSI could not reach this URL
        </span>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            ✓ measured
          </span>
          <a
            href={pageSpeedInsightsUrl(scores.sourceUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-neon-cyan hover:text-neon-pink"
          >
            via PageSpeed Insights ↗
          </a>
          <span className="text-[10px] text-white/40">
            {measuredAgo(scores.fetchedAt)}
          </span>
        </div>
      )}
    </div>
  );
}

function provenanceShort(scores: LighthouseScores): string {
  return scores.seeded
    ? "Estimated"
    : `Measured · ${scores.sourceUrl}`;
}

function ProvenanceLink({
  label,
  url,
  scores,
}: {
  label: string;
  url: string;
  scores: LighthouseScores;
}) {
  const display = truncateUrl(scores.seeded ? url : scores.sourceUrl);
  if (scores.seeded) {
    return (
      <span className="text-white/45">
        {label}: {display}
      </span>
    );
  }
  return (
    <span>
      {label}:{" "}
      <a
        href={pageSpeedInsightsUrl(scores.sourceUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-neon-cyan hover:text-neon-pink"
        title={scores.sourceUrl}
      >
        {display}
      </a>
    </span>
  );
}

function MetricRow({
  label,
  metricKey,
  before,
  after,
}: {
  label: string;
  metricKey: (typeof METRICS)[number]["key"];
  before: LighthouseScores;
  after: LighthouseScores;
}) {
  const beforeScore = before[metricKey];
  const afterScore = after[metricKey];
  const delta = afterScore - beforeScore;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 md:flex-row md:flex-wrap md:items-start">
      <span className="min-w-[8rem] font-display text-sm uppercase tracking-wide text-white/80 md:text-base">
        {label}
      </span>
      <div className="flex flex-wrap items-start gap-4">
        <ScorePillWithProvenance scores={before} metricKey={metricKey} muted />
        <span className="self-center text-white/30">→</span>
        <ScorePillWithProvenance scores={after} metricKey={metricKey} />
        {delta > 0 && (
          <span className="self-center rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 font-mono text-xs font-bold text-neon-cyan">
            +{delta}
          </span>
        )}
        {delta < 0 && (
          <span className="self-center rounded-full border border-white/20 px-2 py-0.5 font-mono text-xs text-white/50">
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

export function LighthousePanel({
  before,
  after,
  bothReal,
  beforeUrl,
  afterUrl,
  businessName,
}: Props) {
  return (
    <div className="glass-card neon-glow-cyan mt-8 animate-reveal-up p-6 md:p-8">
      <p className="stage-label mb-1 text-neon-cyan">PageSpeed Insights</p>
      <h2 className="mb-2 font-display text-3xl uppercase tracking-wide text-gradient-pink-cyan md:text-4xl">
        {bothReal
          ? "Google Lighthouse — measured, not estimated"
          : "Google Lighthouse — partial estimate"}
      </h2>
      <p className="mb-6 text-sm text-white/55">{businessName} · mobile strategy</p>

      <div className="space-y-3">
        {METRICS.map(({ key, label }) => (
          <MetricRow
            key={key}
            label={label}
            metricKey={key}
            before={before}
            after={after}
          />
        ))}
      </div>

      <p className="mt-6 border-t border-white/10 pt-4 font-mono text-xs leading-relaxed text-white/50">
        <ProvenanceLink label="Before" url={beforeUrl} scores={before} />
        {" | "}
        <ProvenanceLink label="After" url={afterUrl} scores={after} />
      </p>
    </div>
  );
}

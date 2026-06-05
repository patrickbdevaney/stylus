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

function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
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

function ScorePill({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex min-w-[3rem] justify-center rounded-full border px-3 py-1 font-mono text-sm font-bold tabular-nums ${scorePillClass(score)}`}
    >
      <CountUp target={score} />
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
  before: LighthouseScores | null;
  after: LighthouseScores | null;
}) {
  const beforeScore = before ? before[metricKey] : null;
  const afterScore = after ? after[metricKey] : null;
  const delta =
    beforeScore != null && afterScore != null ? afterScore - beforeScore : null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="min-w-[8rem] font-display text-sm uppercase tracking-wide text-white/80 md:text-base">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {beforeScore != null ? (
          <span className="inline-flex min-w-[3rem] justify-center rounded-full border border-white/20 bg-white/5 px-3 py-1 font-mono text-sm font-bold tabular-nums text-white/55">
            <CountUp target={beforeScore} />
          </span>
        ) : (
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-sm text-white/35">
            —
          </span>
        )}
        <span className="text-white/30">→</span>
        {afterScore != null ? (
          <ScorePill score={afterScore} />
        ) : (
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-sm text-white/35">
            —
          </span>
        )}
        {delta != null && delta > 0 && (
          <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 font-mono text-xs font-bold text-neon-cyan">
            +{delta}
          </span>
        )}
        {delta != null && delta < 0 && (
          <span className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-xs text-white/50">
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
  businessName,
}: Props) {
  const unavailable =
    before === null || after === null || before.degraded || after.degraded;

  return (
    <div className="glass-card neon-glow-cyan mt-8 animate-reveal-up p-6 md:p-8">
      <p className="stage-label mb-1 text-neon-cyan">PageSpeed Insights</p>
      <h2 className="mb-2 font-display text-3xl uppercase tracking-wide text-gradient-pink-cyan md:text-4xl">
        Google Lighthouse — measured, not estimated
      </h2>
      <p className="mb-6 text-sm text-white/55">{businessName} · mobile strategy</p>

      {unavailable && (
        <p className="mb-4 text-sm text-white/40">
          Live fetch unavailable for one or both URLs — showing cached or partial
          scores where available.
        </p>
      )}

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
    </div>
  );
}

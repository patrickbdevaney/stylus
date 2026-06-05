"use client";

import { useEffect, useState } from "react";
import { getDemoBusinesses } from "@/lib/demo/seed";

const MEDIAN_DEPLOY_SEC = 38;
const AVG_SCORE_LIFT = 52;
const COUNT_UP_MS = 1400;

function useCountUp(target: number, durationMs = COUNT_UP_MS): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

const ACCENT_STYLES = {
  cyan: {
    value: "text-neon-cyan",
    border: "border-neon-cyan/40",
  },
  pink: {
    value: "text-neon-pink",
    border: "border-neon-pink/40",
  },
  purple: {
    value: "text-neon-purple",
    border: "border-neon-purple/40",
  },
} as const;

type StatProps = {
  label: string;
  value: string;
  accent: keyof typeof ACCENT_STYLES;
};

function Stat({ label, value, accent }: StatProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={`flex flex-col items-center rounded-xl border bg-white/[0.03] px-5 py-4 ${styles.border}`}
    >
      <span
        className={`font-display text-4xl tabular-nums tracking-wide md:text-5xl ${styles.value}`}
      >
        {value}
      </span>
      <span className="mt-1 font-display text-xs uppercase tracking-[0.2em] text-white/50 md:text-sm">
        {label}
      </span>
    </div>
  );
}

export function StatTicker() {
  const demoCount = getDemoBusinesses().length;
  const countUp = useCountUp(demoCount);
  const deployUp = useCountUp(MEDIAN_DEPLOY_SEC);
  const liftUp = useCountUp(AVG_SCORE_LIFT);

  return (
    <div className="mb-8 animate-reveal-up">
      <div className="glass-card neon-glow-cyan grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 md:p-5">
        <Stat
          label="Miami demos ready"
          value={String(countUp)}
          accent="cyan"
        />
        <Stat
          label="Median deploy"
          value={`${deployUp}s`}
          accent="pink"
        />
        <Stat
          label="Avg score lift"
          value={`+${liftUp}`}
          accent="purple"
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export type ProviderResultRow = {
  provider: string;
  ms: number;
  won: boolean;
};

type Props = {
  results: ProviderResultRow[];
};

export function ProviderScoreboard({ results }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(t);
  }, [results]);

  if (results.length === 0) return null;

  const sorted = [...results].sort((a, b) => a.ms - b.ms);
  const maxMs = Math.max(...sorted.map((r) => r.ms), 1);

  return (
    <div className="glass-card neon-glow-cyan mt-4 animate-reveal-up p-4 md:p-6">
      <p className="stage-label mb-3 text-neon-cyan">Live copy race</p>
      <h3 className="mb-4 font-display text-xl uppercase tracking-wide text-white md:text-2xl">
        6-model copy race
      </h3>

      <ul className="space-y-3">
        {sorted.map((row) => {
          const widthPct = animated
            ? Math.max(12, Math.round((row.ms / maxMs) * 100))
            : 0;

          return (
            <li key={`${row.provider}-${row.ms}-${row.won}`}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`font-display text-sm uppercase tracking-wide md:text-base ${
                    row.won ? "text-neon-pink" : "text-neon-cyan"
                  }`}
                >
                  {row.provider}
                  {row.won && (
                    <span className="ml-2 text-xs md:text-sm">🏆 winner</span>
                  )}
                </span>
                <span
                  className={`font-mono text-sm tabular-nums ${
                    row.won ? "text-neon-pink" : "text-neon-cyan"
                  }`}
                >
                  {row.ms}ms
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                    row.won
                      ? "bg-gradient-to-r from-neon-pink to-neon-purple"
                      : "bg-gradient-to-r from-neon-cyan/80 to-neon-cyan/40"
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

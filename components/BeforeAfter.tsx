"use client";

import { useEffect, useState } from "react";

type Props = {
  originalUrl: string | null;
  deployUrl: string;
  businessName: string;
  overallScore?: number;
};

export function BeforeAfter({
  originalUrl,
  deployUrl,
  businessName,
  overallScore,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className={`glass-card neon-glow-cyan mt-8 overflow-hidden p-6 md:p-8 ${
        revealed ? "animate-reveal-up" : "reveal-hidden"
      }`}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="stage-label mb-1">Transformation</p>
          <h2 className="font-display text-4xl uppercase tracking-wide text-gradient-purple-orange md:text-5xl">
            Before &amp; After
          </h2>
        </div>
        {overallScore != null && (
          <div className="flex items-center gap-3 rounded-full border border-neon-pink/50 bg-neon-pink/10 px-5 py-2">
            <span className="font-display text-3xl text-neon-pink">
              {overallScore}
            </span>
            <span className="text-stage-sm uppercase tracking-wider text-white/80">
              → Neon rebuild
            </span>
          </div>
        )}
      </div>

      <div className="relative grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <div
          className={`transition-all duration-700 ease-out ${
            revealed
              ? "translate-x-0 opacity-100"
              : "-translate-x-8 opacity-0"
          }`}
          style={{ transitionDelay: "120ms" }}
        >
          <PreviewPanel
            label="Before"
            sublabel="Original site"
            url={originalUrl}
            emptyMessage={`No live URL for ${businessName} — audit used limited data.`}
            variant="before"
          />
        </div>

        <div
          className={`hidden flex-col items-center justify-center lg:flex ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "400ms", transition: "opacity 0.6s ease" }}
          aria-hidden
        >
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8">
            <span className="font-display text-5xl text-neon-cyan animate-arrow-nudge">
              →
            </span>
            <span className="font-display text-sm uppercase tracking-[0.2em] text-white/50">
              Stylus
            </span>
          </div>
        </div>

        <div
          className={`transition-all duration-700 ease-out ${
            revealed ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
          }`}
          style={{ transitionDelay: "320ms" }}
        >
          <PreviewPanel
            label="After"
            sublabel="Live deploy"
            url={deployUrl}
            emptyMessage="Deploy pending…"
            variant="after"
          />
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({
  label,
  sublabel,
  url,
  emptyMessage,
  variant,
}: {
  label: string;
  sublabel: string;
  url: string | null;
  emptyMessage: string;
  variant: "before" | "after";
}) {
  const isAfter = variant === "after";
  const [frameLoaded, setFrameLoaded] = useState(false);

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-night/80 ${
        isAfter
          ? "border-neon-cyan/50 shadow-neon-cyan"
          : "border-white/15"
      }`}
    >
      <div
        className={`flex items-center justify-between border-b px-5 py-4 ${
          isAfter ? "border-neon-cyan/30 bg-neon-cyan/5" : "border-white/10"
        }`}
      >
        <div>
          <p
            className={`font-display text-lg uppercase tracking-[0.15em] ${
              isAfter ? "text-neon-cyan" : "text-white/45"
            }`}
          >
            {label}
          </p>
          <p className="text-stage font-semibold text-white">{sublabel}</p>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-neon-pink/40 px-3 py-1.5 text-sm font-semibold text-neon-pink transition hover:border-neon-cyan hover:text-neon-cyan"
          >
            Open ↗
          </a>
        )}
      </div>

      <div className="relative flex-1">
        {url ? (
          <>
            {!frameLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-night">
                <span className="font-display text-xl uppercase tracking-wider text-neon-cyan animate-pulse">
                  Loading preview…
                </span>
              </div>
            )}
            <iframe
              title={`${label} preview`}
              src={url}
              className={`h-80 w-full bg-white/5 transition-opacity duration-500 md:h-96 ${
                frameLoaded ? "opacity-100" : "opacity-0"
              }`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              loading="lazy"
              onLoad={() => setFrameLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-80 items-center justify-center px-8 text-center stage-body text-white/50 md:h-96">
            {emptyMessage}
          </div>
        )}
      </div>

      {url && (
        <p className="truncate border-t border-white/10 px-5 py-3 font-mono text-sm text-white/45">
          {url}
        </p>
      )}
    </div>
  );
}

"use client";

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
  return (
    <div className="glass-card mt-6 overflow-hidden p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-wide text-gradient-purple-orange">
          Before &amp; After
        </h2>
        {overallScore != null && (
          <span className="rounded-full border border-neon-pink/40 px-3 py-1 text-sm text-neon-pink">
            {overallScore}/100 → improved
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PreviewPanel
          label="Before"
          sublabel="Original site"
          url={originalUrl}
          emptyMessage={`No live URL for ${businessName} — audit ran on limited data.`}
          accent="border-white/15"
        />
        <PreviewPanel
          label="After"
          sublabel="Stylus deploy"
          url={deployUrl}
          emptyMessage="Deploy pending…"
          accent="border-neon-cyan/40 neon-glow-cyan"
          highlight
        />
      </div>
    </div>
  );
}

function PreviewPanel({
  label,
  sublabel,
  url,
  emptyMessage,
  accent,
  highlight = false,
}: {
  label: string;
  sublabel: string;
  url: string | null;
  emptyMessage: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-xl border ${accent} bg-night/60`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p
            className={`text-xs uppercase tracking-wider ${highlight ? "text-neon-cyan" : "text-white/40"}`}
          >
            {label}
          </p>
          <p className="text-sm font-medium text-white/80">{sublabel}</p>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neon-pink hover:text-neon-cyan"
          >
            Open ↗
          </a>
        )}
      </div>

      {url ? (
        <iframe
          title={`${label} preview`}
          src={url}
          className="h-72 w-full bg-white/5 md:h-80"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loading="lazy"
        />
      ) : (
        <div className="flex h-72 items-center justify-center px-6 text-center text-sm text-white/40 md:h-80">
          {emptyMessage}
        </div>
      )}

      {url && (
        <p className="truncate border-t border-white/10 px-4 py-2 font-mono text-xs text-white/35">
          {url}
        </p>
      )}
    </div>
  );
}

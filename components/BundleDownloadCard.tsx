"use client";

import { useState } from "react";

type Props = {
  variant: {
    index: number;
    label: string;
    archetype: string;
    library: string;
    previewHtml: string;
    rationale: string;
  };
  files: Record<string, string>;
  businessName: string;
};

export function BundleDownloadCard({ variant, files, businessName }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileCount = Object.keys(files).length;
  const rationalePreview =
    variant.rationale.length > 160
      ? `${variant.rationale.slice(0, 157)}…`
      : variant.rationale;

  async function handleDownload() {
    setDownloading(true);
    setError(null);

    try {
      const res = await fetch("/api/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          businessName,
          variantLabel: variant.label,
        }),
      });

      if (!res.ok) {
        setError("Download failed — try again");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${variant.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed — try again");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="glass-card neon-glow-cyan flex h-full flex-col p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl uppercase tracking-wide text-neon-cyan">
          {variant.label}
        </h3>
        <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs uppercase tracking-wider text-neon-cyan">
          {variant.library}
        </span>
        <span className="rounded-full border border-neon-purple/40 bg-neon-purple/10 px-3 py-1 text-xs uppercase tracking-wider text-neon-purple">
          {variant.archetype}
        </span>
      </div>

      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/75">
        {rationalePreview}
      </p>

      <p className="mb-4 text-xs uppercase tracking-widest text-white/50">
        {fileCount} files
      </p>

      <pre className="mb-6 overflow-x-auto rounded-lg border border-white/10 bg-night/60 px-4 py-3 font-mono text-xs text-neon-cyan/90">
        npm install && npm run dev
      </pre>

      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading || fileCount === 0}
        className="mt-auto rounded-xl border border-neon-cyan/50 bg-neon-cyan/10 px-6 py-3 font-display text-sm uppercase tracking-wider text-neon-cyan transition hover:bg-neon-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloading ? "Packaging…" : "Download .zip ⬇"}
      </button>

      {error ? (
        <p className="mt-3 text-center text-sm text-red-400">{error}</p>
      ) : null}

      <p className="mt-4 text-center text-xs text-white/40">
        Includes tokens.json · README · Deploy to Vercel
      </p>
    </div>
  );
}

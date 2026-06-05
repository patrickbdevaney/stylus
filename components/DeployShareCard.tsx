"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Props = {
  url: string;
};

export function DeployShareCard({ url }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setQrReady(false);

    void QRCode.toCanvas(canvas, url, {
      width: 160,
      margin: 2,
      color: { dark: "#00f0ff", light: "#0a0a12" },
    })
      .then(() => {
        if (!cancelled) setQrReady(true);
      })
      .catch(() => {
        if (!cancelled) setQrReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="glass-card neon-glow-cyan mt-6 animate-reveal-up p-6 md:p-8">
      <p className="stage-label mb-4 text-center">Share</p>
      <h3 className="mb-6 text-center font-display text-xl uppercase tracking-wide text-neon-cyan md:text-2xl">
        Scan to open live
      </h3>

      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-10">
        <canvas
          ref={canvasRef}
          className={`rounded-xl border border-neon-cyan/30 bg-night/80 ${
            qrReady ? "block" : "hidden"
          }`}
          aria-hidden={!qrReady}
        />

        <div className="flex w-full max-w-md flex-col items-center gap-4 md:items-stretch">
          <p className="break-all text-center font-mono text-sm text-white/80 md:text-left">
            {url}
          </p>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-xl border border-neon-cyan/50 bg-neon-cyan/10 px-8 py-3 font-display text-sm uppercase tracking-wider text-neon-cyan transition hover:bg-neon-cyan/20"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}

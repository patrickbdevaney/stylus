"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import pixelmatch from "pixelmatch";

const DIFF_W = 600;
const DIFF_H = 338;

type Props = {
  beforeSrc: string;
  afterSrc: string;
  businessName: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function drawToCanvas(img: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = DIFF_W;
  canvas.height = DIFF_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d unavailable");
  ctx.drawImage(img, 0, 0, DIFF_W, DIFF_H);
  return ctx.getImageData(0, 0, DIFF_W, DIFF_H);
}

export function VisualRegressionSlider({
  beforeSrc,
  afterSrc,
  businessName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const afterClipRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const sliderPctRef = useRef(50);
  const draggingRef = useRef(false);

  const diffCanvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<"slider" | "diff">("slider");
  const [diffAvailable, setDiffAvailable] = useState(false);
  const [variancePct, setVariancePct] = useState<number | null>(null);

  const applySliderVisual = useCallback((pct: number) => {
    const clipRight = 100 - pct;
    if (afterClipRef.current) {
      afterClipRef.current.style.clipPath = `inset(0 ${clipRight}% 0 0)`;
    }
    if (dividerRef.current) {
      dividerRef.current.style.left = `${pct}%`;
    }
  }, []);

  const updateSliderFromClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = Math.max(
        0,
        Math.min(100, ((clientX - rect.left) / rect.width) * 100),
      );
      sliderPctRef.current = pct;
      applySliderVisual(pct);
    },
    [applySliderVisual],
  );

  useEffect(() => {
    applySliderVisual(sliderPctRef.current);
  }, [applySliderVisual]);

  useEffect(() => {
    let cancelled = false;

    async function computeDiff() {
      try {
        const [beforeImg, afterImg] = await Promise.all([
          loadImage(beforeSrc),
          loadImage(afterSrc),
        ]);
        if (cancelled) return;

        const beforeData = drawToCanvas(beforeImg);
        const afterData = drawToCanvas(afterImg);
        const diffData = new Uint8ClampedArray(DIFF_W * DIFF_H * 4);

        const mismatch = pixelmatch(
          beforeData.data,
          afterData.data,
          diffData,
          DIFF_W,
          DIFF_H,
          { threshold: 0.1, diffColor: [255, 0, 0], diffMask: true },
        );

        if (cancelled) return;

        const variance = (mismatch / (DIFF_W * DIFF_H)) * 100;
        setVariancePct(variance);
        setDiffAvailable(true);

        const canvas = diffCanvasRef.current;
        if (canvas) {
          canvas.width = DIFF_W;
          canvas.height = DIFF_H;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#0a0a12";
            ctx.fillRect(0, 0, DIFF_W, DIFF_H);
            const diffImage = new ImageData(diffData, DIFF_W, DIFF_H);
            ctx.putImageData(diffImage, 0, 0);
          }
        }
      } catch {
        if (!cancelled) {
          setDiffAvailable(false);
          setVariancePct(null);
        }
      }
    }

    computeDiff();
    return () => {
      cancelled = true;
    };
  }, [beforeSrc, afterSrc]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== "slider") return;
    draggingRef.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    updateSliderFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || mode !== "slider") return;
    updateSliderFromClientX(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be released */
    }
  };

  return (
    <div className="glass-card mt-8 overflow-hidden rounded-2xl border border-[#00f0ff]/40 p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="stage-label mb-1">Visual regression</p>
          <h2 className="font-display text-2xl uppercase tracking-wide text-white md:text-3xl">
            {businessName}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {diffAvailable && variancePct != null && (
            <span className="rounded-full border border-white/10 bg-night/90 px-3 py-1.5 font-mono text-xs text-[#ff2d95] md:text-sm">
              Layout Variance: {variancePct.toFixed(2)}%
            </span>
          )}
          {diffAvailable && (
            <button
              type="button"
              onClick={() =>
                setMode((m) => (m === "slider" ? "diff" : "slider"))
              }
              className="rounded-full border border-[#ff2d95]/50 bg-[#ff2d95]/10 px-4 py-2 font-display text-sm uppercase tracking-wide text-[#ff2d95] transition hover:border-[#00f0ff] hover:text-[#00f0ff]"
            >
              {mode === "slider" ? "View Pixel Diff" : "View Slider"}
            </button>
          )}
        </div>
      </div>

      {mode === "slider" ? (
        <div
          ref={containerRef}
          className="relative aspect-video w-full cursor-ew-resize select-none overflow-hidden rounded-2xl border border-[#ff2d95]/35 bg-night/80 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="slider"
          aria-label={`Before and after comparison for ${businessName}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderPctRef.current)}
        >
          <img
            src={beforeSrc}
            alt={`${businessName} before`}
            crossOrigin="anonymous"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <div
            ref={afterClipRef}
            className="pointer-events-none absolute inset-0"
            style={{ clipPath: "inset(0 50% 0 0)" }}
          >
            <img
              src={afterSrc}
              alt={`${businessName} after`}
              crossOrigin="anonymous"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div
            ref={dividerRef}
            className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 -translate-x-1/2 bg-[#00f0ff]"
            style={{
              left: "50%",
              boxShadow: "0 0 12px #00f0ff",
            }}
          >
            <div
              className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#00f0ff] bg-night/90 font-display text-lg text-[#00f0ff] shadow-[0_0_12px_#00f0ff]"
              aria-hidden
            >
              ↔
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-night/80 px-2 py-1 font-display text-xs uppercase tracking-wide text-white/70">
            Before
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-night/80 px-2 py-1 font-display text-xs uppercase tracking-wide text-[#00f0ff]">
            After
          </div>
        </div>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#ff2d95]/35 bg-night">
          <canvas
            ref={diffCanvasRef}
            className="h-full w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}

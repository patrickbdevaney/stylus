"use client";

import { useState } from "react";
import type { SiteAudit, StreamEvent } from "@/lib/schema";
import { getDemoBusinesses } from "@/lib/demo/seed";
import {
  AuditStream,
  applyStreamEvent,
  consumeAuditStream,
  type StepState,
} from "@/components/AuditStream";
import { ScoreCard } from "@/components/ScoreCard";
import { BeforeAfter } from "@/components/BeforeAfter";

export default function Page() {
  const [input, setInput] = useState("");
  const [audit, setAudit] = useState<SiteAudit | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demos = getDemoBusinesses();

  function resetResults() {
    setAudit(null);
    setOriginalUrl(null);
    setDeployUrl(null);
    setSteps([]);
    setReasoning("");
    setError(null);
  }

  function handleStreamEvent(event: StreamEvent) {
    if (event.type === "audit") setAudit(event.data);
    if (event.type === "snapshot") setOriginalUrl(event.data.url);
    if (event.type === "deploy") setDeployUrl(event.data.url);

    setSteps((prevSteps) => {
      const next = applyStreamEvent(
        { steps: prevSteps, reasoning: "" },
        event,
      );
      return next.steps;
    });
    if (event.type === "reasoning") {
      setReasoning((r) => r + event.delta);
    }
  }

  async function runPipeline(opts: { input?: string; demoSlug?: string }) {
    setRunning(true);
    resetResults();

    try {
      await consumeAuditStream(opts, handleStreamEvent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!input.trim()) return;
    await runPipeline({ input: input.trim() });
  }

  async function handleDemo(slug: string) {
    await runPipeline({ demoSlug: slug });
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-hero-wash"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-neon-pink/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-20 h-96 w-96 rounded-full bg-neon-cyan/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12 text-center">
          <p className="mb-3 font-display text-sm uppercase tracking-[0.35em] text-neon-cyan">
            Miami · Autonomous Agent
          </p>
          <h1 className="font-display text-7xl uppercase leading-none tracking-wide text-gradient-pink-cyan md:text-8xl">
            Stylus
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">
            Input → fetch → audit → generate → deploy. One click, live URL in
            under 90 seconds.
          </p>
        </header>

        <div className="glass-card neon-glow-cyan p-6 md:p-8">
          <label
            htmlFor="business-input"
            className="mb-2 block text-sm font-medium text-neon-cyan"
          >
            Business name or URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="business-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Versailles Restaurant or https://..."
              disabled={running}
              className="flex-1 rounded-lg border border-neon-cyan/30 bg-night/80 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/50 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={running || !input.trim()}
              className="rounded-lg bg-gradient-to-r from-neon-pink to-neon-purple px-8 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50 neon-glow-pink"
            >
              {running ? "Running…" : "Run Stylus"}
            </button>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="mb-3 text-sm text-white/50">
              Demo businesses — offline fetch &amp; audit
            </p>
            <div className="flex flex-wrap gap-2">
              {demos.map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => handleDemo(d.slug)}
                  disabled={running}
                  className="rounded-full border border-neon-purple/40 px-4 py-1.5 text-sm text-neon-purple transition hover:border-neon-pink hover:text-neon-pink disabled:opacity-50"
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(steps.length > 0 || reasoning) && (
          <AuditStream steps={steps} reasoning={reasoning} />
        )}

        {audit && <ScoreCard audit={audit} />}

        {deployUrl && audit && (
          <BeforeAfter
            originalUrl={originalUrl}
            deployUrl={deployUrl}
            businessName={audit.businessName}
            overallScore={audit.overallScore}
          />
        )}

        {deployUrl && (
          <div className="mt-4 text-center">
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-gradient-to-r from-neon-cyan to-neon-purple px-10 py-3 font-semibold text-night transition hover:opacity-90 neon-glow-cyan"
            >
              Open live site ↗
            </a>
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-red-300">
            {error}
          </p>
        )}

        <footer className="mt-16 text-center text-sm text-white/30">
          South Beach at night — glow, neon, glass.
        </footer>
      </div>
    </main>
  );
}

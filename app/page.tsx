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

export default function Page() {
  const [input, setInput] = useState("");
  const [audit, setAudit] = useState<SiteAudit | null>(null);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demos = getDemoBusinesses();

  function resetResults() {
    setAudit(null);
    setSteps([]);
    setReasoning("");
    setDeployUrl(null);
    setError(null);
  }

  function handleStreamEvent(event: StreamEvent) {
    if (event.type === "audit") {
      setAudit(event.data);
    }
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

  async function runAudit(opts: { input?: string; demoSlug?: string }) {
    setAuditing(true);
    resetResults();

    try {
      await consumeAuditStream(opts, handleStreamEvent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setAuditing(false);
    }
  }

  async function handleAuditSubmit() {
    if (!input.trim()) return;
    await runAudit({ input: input.trim() });
  }

  async function handleDemoAudit(slug: string) {
    await runAudit({ demoSlug: slug });
  }

  async function handleDeploy() {
    if (!audit) return;
    setDeploying(true);
    setError(null);
    setDeployUrl(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deploy failed");
      setDeployUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
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

      <div className="relative mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 text-center">
          <p className="mb-3 font-display text-sm uppercase tracking-[0.35em] text-neon-cyan">
            Miami · Autonomous Agent
          </p>
          <h1 className="font-display text-7xl uppercase leading-none tracking-wide text-gradient-pink-cyan md:text-8xl">
            Stylus
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-white/60">
            Drop a business name or URL. Watch the audit stream, then deploy an
            improved neon site.
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
              onKeyDown={(e) => e.key === "Enter" && handleAuditSubmit()}
              placeholder="Versailles Restaurant or https://..."
              disabled={auditing}
              className="flex-1 rounded-lg border border-neon-cyan/30 bg-night/80 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/50 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAuditSubmit}
              disabled={auditing || !input.trim()}
              className="rounded-lg bg-gradient-to-r from-neon-pink to-neon-purple px-8 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50 neon-glow-pink"
            >
              {auditing ? "Auditing…" : "Run audit"}
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
                  onClick={() => handleDemoAudit(d.slug)}
                  disabled={auditing}
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

        {audit && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleDeploy}
              disabled={deploying}
              className="rounded-lg bg-gradient-to-r from-neon-cyan to-neon-purple px-10 py-3 font-semibold text-night transition hover:opacity-90 disabled:opacity-50 neon-glow-cyan"
            >
              {deploying ? "Deploying…" : "Deploy improved site"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-red-300">
            {error}
          </p>
        )}

        {deployUrl && (
          <div className="mt-6 glass-card p-6 text-center">
            <p className="mb-2 text-sm uppercase tracking-wider text-neon-cyan">
              Live URL
            </p>
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-lg font-semibold text-neon-pink underline decoration-neon-pink/40 underline-offset-4 hover:text-neon-cyan"
            >
              {deployUrl}
            </a>
          </div>
        )}

        <footer className="mt-16 text-center text-sm text-white/30">
          South Beach at night — glow, neon, glass.
        </footer>
      </div>
    </main>
  );
}

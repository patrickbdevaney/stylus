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
import { AgentGraph, type AgentNode, type AgentVerdict } from "@/components/AgentGraph";
import { ScoreCard } from "@/components/ScoreCard";
import { BeforeAfter } from "@/components/BeforeAfter";
import { VisualRegressionSlider } from "@/components/VisualRegressionSlider";

const INITIAL_AGENTS: AgentNode[] = [
  { name: "auditor", role: "Scores the site", state: "idle", detail: "" },
  { name: "researcher", role: "Brand context", state: "idle", detail: "" },
  { name: "copywriter", role: "Rewrites copy", state: "idle", detail: "" },
  { name: "critic", role: "Judges variants", state: "idle", detail: "" },
];

export default function Page() {
  const [input, setInput] = useState("");
  const [audit, setAudit] = useState<SiteAudit | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantWinner, setVariantWinner] = useState<{
    variantIndex: number;
    score: number;
    totalMs: number;
  } | null>(null);
  const [agents, setAgents] = useState<AgentNode[]>(INITIAL_AGENTS);
  const [handoffs, setHandoffs] = useState<{ from: string; to: string }[]>([]);
  const [agentVerdict, setAgentVerdict] = useState<AgentVerdict | null>(null);
  const [shots, setShots] = useState<{
    beforeUrl: string | null;
    afterUrl: string | null;
  } | null>(null);

  const demos = getDemoBusinesses();

  function resetResults() {
    setAudit(null);
    setOriginalUrl(null);
    setDeployUrl(null);
    setSteps([]);
    setReasoning("");
    setError(null);
    setVariantWinner(null);
    setAgents(INITIAL_AGENTS);
    setHandoffs([]);
    setAgentVerdict(null);
    setShots(null);
  }

  function upsertAgent(
    name: string,
    patch: Partial<AgentNode>,
  ) {
    setAgents((prev) => {
      const idx = prev.findIndex((a) => a.name === name);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch, name };
        return next;
      }
      return [...prev, { name, role: "", state: "idle", detail: "", ...patch }];
    });
  }

  function handleStreamEvent(event: StreamEvent) {
    if (event.type === "audit") setAudit(event.data);
    if (event.type === "snapshot") setOriginalUrl(event.data.url);
    if (event.type === "deploy") setDeployUrl(event.data.url);
    if (event.type === "shots") {
      setShots({
        beforeUrl: event.beforeUrl,
        afterUrl: event.afterUrl,
      });
    }
    if (event.type === "variant_winner") {
      setVariantWinner({
        variantIndex: event.variantIndex,
        score: event.score,
        totalMs: event.totalMs,
      });
    }
    if (event.type === "agent_spawn") {
      upsertAgent(event.agent, {
        role: event.role,
        state: "idle",
        detail: "",
      });
    }
    if (event.type === "agent_active") {
      upsertAgent(event.agent, {
        state: "active",
        detail: event.detail,
      });
    }
    if (event.type === "agent_done") {
      upsertAgent(event.agent, {
        state: "done",
        ms: event.ms,
        detail: event.output,
      });
    }
    if (event.type === "agent_handoff") {
      setHandoffs((h) => [...h, { from: event.from, to: event.to }]);
    }
    if (event.type === "agent_verdict") {
      setAgentVerdict({
        accepted: event.accepted,
        rejected: event.rejected,
        reason: event.reason,
      });
    }

    setSteps((prevSteps) => {
      const next = applyStreamEvent(
        {
          steps: prevSteps,
          reasoning: "",
          variantLog: [],
          variantWinner: null,
        },
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

  const showTrace = running || steps.length > 0 || reasoning.length > 0;
  const showAgentGraph =
    running ||
    agents.some((a) => a.state !== "idle") ||
    agentVerdict !== null;

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-hero-wash"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-neon-pink/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 bottom-10 h-[28rem] w-[28rem] rounded-full bg-neon-cyan/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-16">
        <header className="mb-10 text-center md:mb-14">
          <p className="stage-label mb-4 text-base tracking-[0.4em] md:text-lg">
            Miami · Autonomous Agent
          </p>
          <h1 className="font-display text-[5.5rem] uppercase leading-[0.9] tracking-wide text-gradient-pink-cyan md:text-[7rem] lg:text-[8rem]">
            Stylus
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-white/75 md:text-xl">
            Input → fetch → audit → generate → deploy
          </p>
          <p className="mx-auto mt-2 max-w-xl text-base text-white/50">
            One click · live URL in under 90 seconds
          </p>
        </header>

        {running && (
          <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl border border-neon-pink/40 bg-neon-pink/10 px-6 py-4 animate-fade-in">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-pink opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-neon-pink" />
            </span>
            <span className="font-display text-2xl uppercase tracking-wide text-white">
              Agent running
            </span>
          </div>
        )}

        <div className="glass-card neon-glow-cyan p-6 md:p-10">
          <label
            htmlFor="business-input"
            className="mb-3 block font-display text-xl uppercase tracking-wide text-neon-cyan md:text-2xl"
          >
            Business name or URL
          </label>
          <div className="flex flex-col gap-4 lg:flex-row">
            <input
              id="business-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Versailles Restaurant or https://..."
              disabled={running}
              className="flex-1 rounded-xl border-2 border-neon-cyan/35 bg-night/90 px-5 py-4 text-lg font-medium text-white placeholder:text-white/30 outline-none transition focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/40 disabled:opacity-50 md:text-xl"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={running || !input.trim()}
              className="rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple px-10 py-4 font-display text-2xl uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50 neon-glow-pink md:min-w-[200px]"
            >
              {running ? "Running…" : "Run Stylus"}
            </button>
          </div>

          <div className="mt-8 border-t border-white/10 pt-8">
            <p className="mb-4 font-display text-lg uppercase tracking-[0.12em] text-white/55">
              Demo — offline fetch &amp; audit
            </p>
            <div className="flex flex-wrap gap-3">
              {demos.map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => handleDemo(d.slug)}
                  disabled={running}
                  className="rounded-full border-2 border-neon-purple/45 px-5 py-2.5 text-base font-semibold text-neon-purple transition hover:border-neon-pink hover:bg-neon-pink/10 hover:text-neon-pink disabled:opacity-50 md:text-lg"
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showAgentGraph && (
          <AgentGraph
            agents={agents}
            handoffs={handoffs}
            verdict={agentVerdict}
          />
        )}

        {showTrace && (
          <AuditStream
            steps={steps}
            reasoning={reasoning}
            running={running}
            variantWinner={variantWinner}
          />
        )}

        {audit && <ScoreCard audit={audit} />}

        {shots?.beforeUrl && shots?.afterUrl && audit && (
          <VisualRegressionSlider
            beforeSrc={shots.beforeUrl}
            afterSrc={shots.afterUrl}
            businessName={audit.businessName}
          />
        )}

        {deployUrl && audit && (
          <BeforeAfter
            originalUrl={originalUrl}
            deployUrl={deployUrl}
            businessName={audit.businessName}
            overallScore={audit.overallScore}
          />
        )}

        {deployUrl && (
          <div className="mt-8 text-center animate-reveal-up">
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple px-12 py-4 font-display text-2xl uppercase tracking-wide text-night transition hover:brightness-110 neon-glow-cyan"
            >
              Open live site ↗
            </a>
          </div>
        )}

        {error && (
          <p className="mt-8 rounded-xl border-2 border-red-500/50 bg-red-500/15 px-6 py-4 text-center text-lg font-semibold text-red-200">
            {error}
          </p>
        )}

        <footer className="mt-20 text-center font-display text-base uppercase tracking-[0.25em] text-white/25">
          South Beach at night
        </footer>
      </div>
    </main>
  );
}

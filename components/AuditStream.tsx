"use client";

import { useEffect, useRef } from "react";
import type { PipelineStep, StreamEvent } from "@/lib/schema";

export const PIPELINE_STEPS: PipelineStep[] = [
  "resolve",
  "fetch",
  "audit",
  "generate",
  "deploy",
];

const STEP_LABELS: Record<PipelineStep, string> = {
  resolve: "Resolve",
  fetch: "Fetch & parse",
  audit: "LLM audit",
  generate: "Generate",
  deploy: "Deploy",
};

const STEP_NUMBERS: Record<PipelineStep, number> = {
  resolve: 1,
  fetch: 2,
  audit: 3,
  generate: 4,
  deploy: 5,
};

export type StepState = {
  step: PipelineStep;
  status: "pending" | "active" | "done";
  message: string;
};

type Props = {
  steps: StepState[];
  reasoning: string;
  running?: boolean;
};

export function AuditStream({ steps, reasoning, running }: Props) {
  const reasoningRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [reasoning]);

  if (!steps.length && !reasoning && !running) return null;

  const merged = PIPELINE_STEPS.map((step) => {
    const found = steps.find((s) => s.step === step);
    return (
      found ?? { step, status: "pending" as const, message: "" }
    );
  });

  const doneCount = merged.filter((s) => s.status === "done").length;
  const progress = running && doneCount === merged.length
    ? 95
    : Math.round((doneCount / merged.length) * 100);
  const activeStep = merged.find((s) => s.status === "active");

  return (
    <div className="glass-card neon-glow-purple mt-8 animate-reveal-up p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="stage-label mb-1">Live pipeline</p>
          <h2 className="font-display text-4xl uppercase tracking-wide text-white md:text-5xl">
            Agent Trace
          </h2>
        </div>
        {activeStep && (
          <p className="font-display text-2xl uppercase text-neon-pink md:text-3xl">
            {STEP_LABELS[activeStep.step]}…
          </p>
        )}
      </div>

      {/* Progress rail */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between font-display text-lg uppercase tracking-wider text-white/70">
          <span>Progress</span>
          <span className="text-neon-cyan">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              running && activeStep
                ? "progress-shimmer animate-shimmer"
                : "bg-gradient-to-r from-neon-pink via-neon-cyan to-neon-purple"
            }`}
            style={{ width: `${Math.max(progress, running ? 8 : 0)}%` }}
          />
        </div>
      </div>

      {/* Step track */}
      <ol className="relative mb-6 space-y-0">
        <div
          aria-hidden
          className="absolute bottom-4 left-[1.35rem] top-4 w-0.5 bg-gradient-to-b from-neon-pink/40 via-neon-cyan/30 to-white/10"
        />
        {merged.map((s, i) => (
          <li
            key={s.step}
            className={`relative flex items-start gap-4 py-3 transition-all duration-500 ${
              s.status === "pending" ? "opacity-40" : "opacity-100"
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <StepBadge step={s.step} status={s.status} />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className={`font-display text-xl uppercase tracking-wide md:text-2xl ${
                    s.status === "active"
                      ? "text-neon-pink"
                      : s.status === "done"
                        ? "text-neon-cyan"
                        : "text-white/50"
                  }`}
                >
                  {STEP_LABELS[s.step]}
                </span>
                {s.status === "active" && (
                  <span className="inline-flex gap-1 pt-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neon-pink [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neon-pink [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neon-pink [animation-delay:300ms]" />
                  </span>
                )}
              </div>
              {s.message && (
                <p className="mt-1 text-stage-sm text-white/75 md:text-base">
                  {s.message}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {reasoning && (
        <div
          className={`rounded-xl border bg-night/70 p-5 ${
            running
              ? "animate-step-glow border-neon-pink/50"
              : "border-neon-purple/30"
          }`}
        >
          <p className="mb-3 font-display text-lg uppercase tracking-[0.15em] text-neon-purple">
            Reasoning stream
          </p>
          <pre
            ref={reasoningRef}
            className="max-h-56 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-white/80 md:text-base md:leading-relaxed"
          >
            {reasoning}
            {running && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-neon-cyan" />
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

function StepBadge({
  step,
  status,
}: {
  step: PipelineStep;
  status: StepState["status"];
}) {
  const n = STEP_NUMBERS[step];

  if (status === "done") {
    return (
      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neon-cyan/20 ring-2 ring-neon-cyan/60">
        <span className="font-display text-xl text-neon-cyan">✓</span>
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-neon-pink/30" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-neon-pink to-neon-purple font-display text-xl text-white ring-2 ring-neon-pink animate-step-glow">
          {n}
        </span>
      </span>
    );
  }

  return (
    <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-night font-display text-xl text-white/35">
      {n}
    </span>
  );
}

export function applyStreamEvent(
  prev: { steps: StepState[]; reasoning: string },
  event: StreamEvent,
): { steps: StepState[]; reasoning: string } {
  const steps = [...prev.steps];
  let reasoning = prev.reasoning;

  if (event.type === "step") {
    const idx = steps.findIndex((s) => s.step === event.step);
    if (event.status === "start") {
      const entry: StepState = {
        step: event.step,
        status: "active",
        message: event.message,
      };
      if (idx >= 0) steps[idx] = entry;
      else steps.push(entry);
    } else {
      const entry: StepState = {
        step: event.step,
        status: "done",
        message: event.message,
      };
      if (idx >= 0) steps[idx] = entry;
      else steps.push(entry);
    }
  }

  if (event.type === "reasoning") {
    reasoning += event.delta;
  }

  return { steps, reasoning };
}

export async function consumeAuditStream(
  body: { input?: string; demoSlug?: string },
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const res = await fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Audit failed (${res.status})`,
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as StreamEvent;
        onEvent(event);
        if (event.type === "error") {
          throw new Error(event.message);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
          throw e;
        }
      }
    }
  }
}

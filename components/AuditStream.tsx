"use client";

import type { AuditStep, StreamEvent } from "@/lib/schema";

type StepState = {
  step: AuditStep;
  status: "pending" | "active" | "done";
  message: string;
};

const STEP_LABELS: Record<AuditStep, string> = {
  resolve: "Resolve",
  fetch: "Fetch & parse",
  audit: "LLM audit",
};

type Props = {
  steps: StepState[];
  reasoning: string;
};

export function AuditStream({ steps, reasoning }: Props) {
  if (!steps.length && !reasoning) return null;

  return (
    <div className="glass-card mt-6 p-6">
      <h2 className="mb-4 font-display text-2xl uppercase tracking-wide text-neon-cyan">
        Agent trace
      </h2>

      <ol className="mb-4 space-y-2">
        {steps.map((s) => (
          <li
            key={s.step}
            className="flex items-start gap-3 text-sm"
          >
            <StepIcon status={s.status} />
            <div>
              <span className="font-medium text-white/90">
                {STEP_LABELS[s.step]}
              </span>
              {s.message && (
                <span className="ml-2 text-white/50">— {s.message}</span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {reasoning && (
        <div className="rounded-lg border border-neon-purple/20 bg-night/60 p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-neon-purple">
            Reasoning
          </p>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/70">
            {reasoning}
          </pre>
        </div>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: StepState["status"] }) {
  if (status === "done") {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-cyan/20 text-neon-cyan">
        ✓
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="h-3 w-3 animate-pulse rounded-full bg-neon-pink shadow-neon-pink" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20" />
  );
}

export type { StepState };

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

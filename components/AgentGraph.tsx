"use client";

export type AgentNode = {
  name: string;
  role: string;
  state: "idle" | "active" | "done";
  detail: string;
  ms?: number;
};

export type AgentHandoff = { from: string; to: string };

export type AgentVerdict = {
  accepted: string;
  rejected: string[];
  reason: string;
};

type Props = {
  agents: AgentNode[];
  handoffs: AgentHandoff[];
  verdict: AgentVerdict | null;
};

const ORDER = ["auditor", "researcher", "copywriter", "critic"] as const;

const NODE_W = 152;
const NODE_H = 76;
const GAP = 28;
const PAD_X = 16;
const ROW_Y = 52;

function nodeX(index: number): number {
  return PAD_X + index * (NODE_W + GAP);
}

function centerX(index: number): number {
  return nodeX(index) + NODE_W / 2;
}

function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export function AgentGraph({ agents, handoffs, verdict }: Props) {
  const byName = Object.fromEntries(agents.map((a) => [a.name, a]));
  const ordered: AgentNode[] = ORDER.map(
    (name) =>
      byName[name] ?? {
        name,
        role: "",
        state: "idle" as const,
        detail: "",
      },
  );

  const animatedEdges = new Set(
    handoffs.map((h) => edgeKey(h.from, h.to)),
  );

  const svgWidth = PAD_X * 2 + ORDER.length * NODE_W + (ORDER.length - 1) * GAP;

  return (
    <div className="glass-card neon-glow-purple mt-8 animate-reveal-up p-4 md:p-6">
      <style>{`
        @keyframes agent-dash-flow {
          to { stroke-dashoffset: -28; }
        }
        .agent-edge-flow {
          stroke-dasharray: 8 6;
          animation: agent-dash-flow 0.9s linear infinite;
        }
      `}</style>

      <p className="stage-label mb-3">Multi-agent council</p>

      <svg
        viewBox={`0 0 ${svgWidth} 168`}
        className="mx-auto w-full max-h-[180px]"
        role="img"
        aria-label="Agent council graph"
      >
        <defs>
          <filter id="agent-pink-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {ORDER.map((_, i) => {
          if (i >= ORDER.length - 1) return null;
          const from = ORDER[i];
          const to = ORDER[i + 1];
          const key = edgeKey(from, to);
          const animate = animatedEdges.has(key);
          return (
            <line
              key={key}
              x1={centerX(i)}
              y1={ROW_Y + NODE_H / 2}
              x2={centerX(i + 1)}
              y2={ROW_Y + NODE_H / 2}
              stroke="#00f0ff"
              strokeWidth={2}
              strokeOpacity={animate ? 0.95 : 0.25}
              className={animate ? "agent-edge-flow" : undefined}
            />
          );
        })}

        {handoffs.map((h) => {
          const fromIdx = ORDER.indexOf(h.from as (typeof ORDER)[number]);
          const toIdx = ORDER.indexOf(h.to as (typeof ORDER)[number]);
          if (fromIdx < 0 || toIdx < 0 || toIdx <= fromIdx) return null;
          if (toIdx === fromIdx + 1) return null;
          const key = edgeKey(h.from, h.to);
          return (
            <line
              key={`skip-${key}`}
              x1={centerX(fromIdx)}
              y1={ROW_Y + NODE_H / 2}
              x2={centerX(toIdx)}
              y2={ROW_Y + NODE_H / 2}
              stroke="#00f0ff"
              strokeWidth={2}
              strokeOpacity={0.7}
              className="agent-edge-flow"
            />
          );
        })}

        {ordered.map((agent, i) => {
          const x = nodeX(i);
          const border =
            agent.state === "active"
              ? "border-[#ff2d95] animate-step-glow neon-glow-pink"
              : agent.state === "done"
                ? "border-[#00f0ff] neon-glow-cyan"
                : "border-white/20";
          const bg =
            agent.state === "idle"
              ? "bg-white/[0.03]"
              : "bg-white/[0.06]";

          return (
            <foreignObject
              key={agent.name}
              x={x}
              y={ROW_Y}
              width={NODE_W}
              height={NODE_H}
            >
              <div
                className={`flex h-full flex-col justify-center rounded-xl border-2 px-2 py-1.5 ${border} ${bg}`}
                style={
                  agent.state === "active"
                    ? { filter: "url(#agent-pink-glow)" }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display text-[10px] uppercase tracking-wide text-white md:text-xs">
                    {agent.name}
                  </span>
                  {agent.state === "done" && (
                    <span className="text-[#00f0ff] text-xs font-bold">✓</span>
                  )}
                </div>
                <span className="truncate text-[9px] text-white/50 md:text-[10px]">
                  {agent.role}
                </span>
                {agent.state === "done" && agent.ms != null && (
                  <span className="text-[9px] text-[#00f0ff] md:text-[10px]">
                    {agent.ms}ms
                  </span>
                )}
                {agent.state === "active" && agent.detail && (
                  <span className="truncate text-[9px] text-[#ff2d95] md:text-[10px]">
                    {agent.detail}
                  </span>
                )}
                {agent.state === "done" && agent.detail && (
                  <span className="truncate text-[9px] text-white/60 md:text-[10px]">
                    {agent.detail}
                  </span>
                )}
              </div>
            </foreignObject>
          );
        })}
      </svg>

      {verdict && (
        <div className="mt-3 rounded-xl border border-[#ff6b35]/50 bg-[#ff6b35]/10 px-4 py-3 font-display text-xs uppercase tracking-wide text-[#ff6b35] md:text-sm">
          {(() => {
            const confidenceMatch = verdict.accepted.match(
              /^confidence\s+(\d+)%$/i,
            );
            if (confidenceMatch) {
              return (
                <>
                  <div>Audit confidence: {confidenceMatch[1]}%</div>
                  <div className="mt-1 normal-case tracking-normal">
                    {verdict.reason}
                  </div>
                </>
              );
            }
            return (
              <>
                🏆 Critic chose {verdict.accepted} · rejected{" "}
                {verdict.rejected.length > 0
                  ? verdict.rejected.join(", ")
                  : "none"}{" "}
                · {verdict.reason}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

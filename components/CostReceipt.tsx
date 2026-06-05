"use client";

const AUDIT_RATE = 0.0006;

const RATE: Record<string, number> = {
  groq: 0.0,
  cerebras: 0.0,
  deepinfra: 0.0003,
};

function rateForProvider(name: string): number {
  const lower = name.toLowerCase();
  for (const [prefix, rate] of Object.entries(RATE)) {
    if (lower.startsWith(prefix)) return rate;
  }
  return 0.0;
}

function providerCostNote(name: string): string {
  const lower = name.toLowerCase();
  if (lower.startsWith("groq") || lower.startsWith("cerebras")) {
    return "$0.0000 free tier";
  }
  if (lower.startsWith("deepinfra")) return "est ~$0.0003";
  return "est $0.0000";
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

type Props = {
  providers: { name: string; ms: number }[];
  auditModel: string;
  totalMs: number;
};

export function CostReceipt({ providers, auditModel, totalMs }: Props) {
  const auditCost = AUDIT_RATE;
  const providerLines = providers.map((p) => ({
    ...p,
    cost: rateForProvider(p.name),
  }));
  const copyCost = providerLines.reduce((sum, p) => sum + p.cost, 0);
  const totalCost = auditCost + copyCost;

  return (
    <div className="glass-card neon-glow-cyan mt-8 animate-reveal-up p-6 md:p-8">
      <p className="stage-label mb-4 text-neon-cyan">Cost receipt</p>
      <pre className="font-mono text-sm leading-relaxed text-white/85 md:text-base">
        {`──────────────────────────────
STYLUS · MARGINAL COST RECEIPT
──────────────────────────────
audit     ${auditModel.padEnd(18)} ${formatUsd(auditCost)}  est ~$0.0006/call
`}
        {providerLines.length > 0
          ? providerLines
              .map(
                (p) =>
                  `copy      ${p.name.padEnd(14)} ${String(p.ms).padStart(5)}ms  ${formatUsd(p.cost)}  ${providerCostNote(p.name)}`,
              )
              .join("\n") + "\n"
          : ""}
        {`──────────────────────────────
total     ${formatUsd(totalCost).padStart(26)}
wall-time ${String(totalMs).padStart(5)}ms
──────────────────────────────
Marginal cost per site rebuild`}
      </pre>
    </div>
  );
}

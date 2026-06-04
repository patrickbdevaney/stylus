"use client";

import { useState } from "react";
import { getDemoBusinesses } from "@/lib/demo/seed";

export default function Page() {
  const [input, setInput] = useState("");
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demos = getDemoBusinesses();

  async function handleDeploy(businessName?: string) {
    setDeploying(true);
    setError(null);
    setDeployUrl(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName ?? (input || "Stylus Demo"),
        }),
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

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <header className="mb-12 text-center">
          <p className="mb-3 font-display text-sm uppercase tracking-[0.35em] text-neon-cyan">
            Miami · Autonomous Agent
          </p>
          <h1 className="font-display text-7xl uppercase leading-none tracking-wide text-gradient-pink-cyan md:text-8xl">
            Stylus
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-white/60">
            Drop a business name or URL. Get an improved neon site live in under
            90 seconds.
          </p>
        </header>

        <div className="glass-card neon-glow-cyan p-6 md:p-8">
          <label htmlFor="business-input" className="mb-2 block text-sm font-medium text-neon-cyan">
            Business name or URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="business-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Versailles Restaurant or https://..."
              className="flex-1 rounded-lg border border-neon-cyan/30 bg-night/80 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/50"
            />
            <button
              type="button"
              onClick={() => handleDeploy()}
              disabled={deploying}
              className="rounded-lg bg-gradient-to-r from-neon-pink to-neon-purple px-8 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50 neon-glow-pink"
            >
              {deploying ? "Deploying…" : "Deploy shell"}
            </button>
          </div>

          {demos.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="mb-3 text-sm text-white/50">Or try a demo business</p>
              <div className="flex flex-wrap gap-2">
                {demos.map((d) => (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => handleDeploy(d.name)}
                    className="rounded-full border border-neon-purple/40 px-4 py-1.5 text-sm text-neon-purple transition hover:border-neon-pink hover:text-neon-pink"
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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

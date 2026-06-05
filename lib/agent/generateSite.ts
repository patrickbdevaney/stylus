import { generateBestVariant } from "@/lib/agent/generateVariants";
import type { GeneratedCopy } from "@/lib/agent/generateCopy";
import type { GeneratedSite, SiteAudit } from "@/lib/schema";
import {
  fillTemplateFromAudit,
  renderEmptyShell,
  renderFromAudit,
  renderSinglePage,
} from "@/lib/template/singlePage";

type ProviderConfig = {
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string | undefined;
  timeout: number;
  extraHeaders?: Record<string, string>;
};

const TIER1_PROVIDERS: ProviderConfig[] = [
  {
    name: "groq-scout",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    apiKey: process.env.GROQ_API_KEY,
    timeout: 6000,
  },
  {
    name: "groq-qwen",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "qwen/qwen3-32b",
    apiKey: process.env.GROQ_API_KEY,
    timeout: 6000,
  },
  {
    name: "groq-llama",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY,
    timeout: 6000,
  },
  {
    name: "cerebras-glm",
    baseUrl: "https://api.cerebras.ai/v1",
    model: "zai-glm-4.7",
    apiKey: process.env.CEREBRAS_API_KEY,
    timeout: 6000,
  },
  {
    name: "cerebras-gpt",
    baseUrl: "https://api.cerebras.ai/v1",
    model: "gpt-oss-120b",
    apiKey: process.env.CEREBRAS_API_KEY,
    timeout: 6000,
  },
];

const TIER2_PROVIDERS: ProviderConfig[] = [
  {
    name: "deepinfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    model: "deepseek-ai/DeepSeek-V4-Flash",
    apiKey: process.env.DEEPINFRA_API_KEY,
    timeout: 10000,
  },
  {
    name: "or-owl",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/owl-alpha:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 12000,
    extraHeaders: {
      "HTTP-Referer": "https://stylus.vercel.app",
      "X-Title": "Stylus",
    },
  },
  {
    name: "or-nemotron",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 12000,
    extraHeaders: {
      "HTTP-Referer": "https://stylus.vercel.app",
      "X-Title": "Stylus",
    },
  },
  {
    name: "or-gpt120b",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-oss-120b:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 12000,
    extraHeaders: {
      "HTTP-Referer": "https://stylus.vercel.app",
      "X-Title": "Stylus",
    },
  },
  {
    name: "or-glm",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "z-ai/glm-4.5-air:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 12000,
    extraHeaders: {
      "HTTP-Referer": "https://stylus.vercel.app",
      "X-Title": "Stylus",
    },
  },
  {
    name: "or-gemma",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemma-4-31b-it:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 12000,
    extraHeaders: {
      "HTTP-Referer": "https://stylus.vercel.app",
      "X-Title": "Stylus",
    },
  },
  {
    name: "or-free",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/free",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 15000,
    extraHeaders: {
      "HTTP-Referer": "https://stylus.vercel.app",
      "X-Title": "Stylus",
    },
  },
];

type RawCopyJson = {
  hero?: string;
  tagline?: string;
  services?: { name?: string; description?: string }[];
  about?: string;
  cta?: string;
};

type GenerateCopyCallbacks = {
  onToken?: (token: string) => void;
  onCopyDone?: (provider: string, ms: number) => void;
  onProgress?: (msg: string) => void;
};

function hasApiKey(key: string | undefined): key is string {
  return typeof key === "string" && key.length > 0;
}

function parseCopyJson(content: string): RawCopyJson {
  try {
    return JSON.parse(content) as RawCopyJson;
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found in provider response");
    }
    return JSON.parse(content.slice(start, end + 1)) as RawCopyJson;
  }
}

function normalizeCopy(raw: RawCopyJson, provider: string, ms: number): GeneratedCopy {
  const services = (raw.services ?? [])
    .filter((s) => s.name && s.description)
    .map((s) => ({
      name: String(s.name),
      description: String(s.description),
    }));

  return {
    hero: String(raw.hero ?? "").trim(),
    tagline: String(raw.tagline ?? "").trim(),
    services,
    about: String(raw.about ?? "").trim(),
    cta: String(raw.cta ?? "Get in touch").trim(),
    provider,
    ms,
  };
}

function buildFallbackCopy(audit: SiteAudit, ms: number): GeneratedCopy {
  const fill = fillTemplateFromAudit(audit);
  return {
    hero: audit.businessName,
    tagline: fill.tagline,
    services: fill.services,
    about: fill.about,
    cta: "Get in touch",
    provider: "fallback",
    ms,
  };
}

function renderWithCopy(audit: SiteAudit, copy: GeneratedCopy): string {
  const fill = fillTemplateFromAudit(audit);
  return renderSinglePage({
    ...fill,
    tagline: copy.tagline ? `${copy.hero} — ${copy.tagline}` : copy.hero || fill.tagline,
    services: copy.services.length > 0 ? copy.services : fill.services,
    about: copy.about || fill.about,
    brandTier: audit.brandTier ?? "generic",
  });
}

function scoreCopy(copy: GeneratedCopy): number {
  let score = 0;
  if (copy.hero.length > 20) score += 1;
  if (copy.tagline.length > 30) score += 1;
  if (copy.services.length === 3) score += 1;
  if (copy.services.every((s) => s.description.length > 20)) score += 1;
  if (copy.about.length > 60) score += 1;
  if (copy.provider !== "fallback") score += 2;
  return score;
}

async function callProvider(
  p: ProviderConfig,
  audit: SiteAudit,
): Promise<GeneratedCopy> {
  if (!hasApiKey(p.apiKey)) {
    throw new Error(`Missing API key for ${p.name}`);
  }

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), p.timeout);

  try {
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.apiKey}`,
        ...p.extraHeaders,
      },
      body: JSON.stringify({
        model: p.model,
        stream: false,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "You write sharp, local website copy for Miami small businesses. Output ONLY valid JSON, no markdown, no explanation.",
          },
          {
            role: "user",
            content: `Business: ${audit.businessName}\nCategory: ${audit.category}\nTagline: ${audit.brand.tagline}\nTop fixes: ${audit.topFixes.join(", ")}\nScores: clarity ${audit.dimensions.clarity.score}/100, conversion ${audit.dimensions.conversion.score}/100, localSeo ${audit.dimensions.localSeo.score}/100\n\nReturn ONLY this JSON:\n{"hero":"one punchy sentence max 12 words mentioning Miami","tagline":"expanding sentence max 20 words","services":[{"name":"...","description":"one sentence"},{"name":"...","description":"one sentence"},{"name":"...","description":"one sentence"}],"about":"two sentences plain language","cta":"action phrase max 5 words"}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`${p.name} HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${p.name} returned empty content`);
    }

    const raw = parseCopyJson(content);
    return normalizeCopy(raw, p.name, Date.now() - start);
  } finally {
    clearTimeout(timer);
  }
}

async function generateLiveCopy(audit: SiteAudit): Promise<GeneratedCopy> {
  const start = Date.now();
  const tier1 = TIER1_PROVIDERS.filter((p) => hasApiKey(p.apiKey));

  if (tier1.length > 0) {
    try {
      return await Promise.any(tier1.map((p) => callProvider(p, audit)));
    } catch {
      // all tier-1 providers failed — fall through to tier 2
    }
  }

  for (const p of TIER2_PROVIDERS) {
    if (!hasApiKey(p.apiKey)) continue;
    try {
      return await callProvider(p, audit);
    } catch {
      continue;
    }
  }

  return buildFallbackCopy(audit, Date.now() - start);
}

async function emitHeroTokens(
  hero: string,
  provider: string,
  onToken?: (delta: string, provider: string) => void,
  delayMs = 20,
): Promise<void> {
  if (!onToken) return;
  const words = hero.split(/\s+/).filter(Boolean);
  for (const word of words) {
    onToken(`${word} `, provider);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export async function generateSite(audit: SiteAudit): Promise<GeneratedSite> {
  const html = renderFromAudit(audit);
  return { html, businessName: audit.businessName };
}

export async function generateSiteFromOpts(opts?: {
  audit?: SiteAudit;
  businessName?: string;
}): Promise<GeneratedSite> {
  if (opts?.audit) return generateSite(opts.audit);
  const businessName = opts?.businessName ?? "Stylus Demo";
  return { html: renderEmptyShell(businessName), businessName };
}

export async function generateSiteWithLiveCopy(
  audit: SiteAudit,
  callbacks?: GenerateCopyCallbacks,
): Promise<GeneratedSite> {
  if (process.env.LIVE_GENERATION !== "true") {
    return generateSite(audit);
  }

  const copy = await generateLiveCopy(audit);
  await emitHeroTokens(
    copy.hero,
    copy.provider,
    callbacks?.onToken
      ? (delta, provider) => callbacks.onToken?.(delta)
      : undefined,
  );
  callbacks?.onCopyDone?.(copy.provider, copy.ms);

  const html = renderWithCopy(audit, copy);
  return { html, businessName: audit.businessName };
}

export type AgentTrace = {
  onSpawn?: (agent: string, role: string) => void;
  onActive?: (agent: string, detail: string) => void;
  onAgentDone?: (agent: string, ms: number, output: string) => void;
  onHandoff?: (from: string, to: string) => void;
  onVerdict?: (
    agent: string,
    accepted: string,
    rejected: string[],
    reason: string,
  ) => void;
  onProviderResult?: (provider: string, ms: number, won: boolean) => void;
};

function emitCouncilSpawn(trace?: AgentTrace) {
  trace?.onSpawn?.("auditor", "Scores the site");
  trace?.onSpawn?.("researcher", "Brand context");
  trace?.onSpawn?.("copywriter", "Rewrites copy");
  trace?.onSpawn?.("critic", "Judges variants");
}

function wrapVariantProgress(
  trace: AgentTrace | undefined,
  onVariantProgress?: (msg: string) => void,
): (msg: string) => void {
  return (msg: string) => {
    const doneMatch = msg.match(/Variant (\d+) complete \(([^,]+), (\d+)ms\)/);
    if (doneMatch) {
      trace?.onAgentDone?.(
        "copywriter",
        Number(doneMatch[3]),
        `variant ${doneMatch[1]} (${doneMatch[2]})`,
      );
    }
    onVariantProgress?.(msg);
  };
}

export async function generateSiteWithVariants(
  audit: SiteAudit,
  onToken?: (delta: string, provider: string) => void,
  onCopyDone?: (provider: string, ms: number) => void,
  onVariantProgress?: (msg: string) => void,
  onVariantWinner?: (index: number, score: number, ms: number) => void,
  onProviderResult?: (provider: string, ms: number, won: boolean) => void,
  agentTrace?: AgentTrace,
): Promise<GeneratedSite> {
  const liveCopyCallbacks: GenerateCopyCallbacks | undefined =
    onToken || onCopyDone
      ? {
          onToken: onToken ? (delta) => onToken(delta, "") : undefined,
          onCopyDone,
        }
      : undefined;

  if (
    process.env.LIVE_GENERATION !== "true" ||
    process.env.VARIANT_MODE !== "true"
  ) {
    return generateSiteWithLiveCopy(audit, liveCopyCallbacks);
  }

  try {
    emitCouncilSpawn(agentTrace);
    agentTrace?.onActive?.(
      "copywriter",
      "Racing 3 variants across 6 models",
    );

    const variant = await generateBestVariant(
      audit,
      wrapVariantProgress(agentTrace, onVariantProgress),
      (provider, ms, won) => {
        onProviderResult?.(provider, ms, won);
        agentTrace?.onProviderResult?.(provider, ms, won);
      },
    );
    const score = scoreCopy(variant.copy);

    agentTrace?.onHandoff?.("copywriter", "critic");
    const rejected = [0, 1, 2]
      .filter((i) => i !== variant.variantIndex)
      .map(String);
    agentTrace?.onVerdict?.(
      "critic",
      `variant ${variant.variantIndex}`,
      rejected,
      `Chose highest score ${score}/7; rejected lower-scoring variants`,
    );

    onCopyDone?.(variant.copy.provider, variant.copy.ms);
    onVariantWinner?.(variant.variantIndex, score, variant.raceDurationMs);
    await emitHeroTokens(variant.copy.hero, variant.copy.provider, onToken, 15);

    return {
      html: variant.html,
      businessName: audit.businessName,
      copyProvider: variant.copy.provider,
      copyMs: variant.copy.ms,
    };
  } catch {
    return generateSiteWithLiveCopy(audit, liveCopyCallbacks);
  }
}

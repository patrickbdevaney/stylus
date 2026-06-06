import type { HeroType } from "@/lib/schema";
import { escapeHtml } from "@/lib/template/singlePage";
import {
  mapsUrl,
  phoneTel,
  spacingClasses,
  type SectionContent,
  type SectionResult,
  type SectionTokens,
} from "./types";

function heroCtaImports(tok: SectionTokens): string[] {
  if (tok.library === "shadcn") {
    return ['import { Button } from "@/components/ui/button";'];
  }
  if (tok.library === "aceternity") {
    return ['import { MovingBorderButton } from "@/components/ui/moving-border";'];
  }
  return [];
}

function heroCtaHtml(content: SectionContent, tok: SectionTokens): string {
  const action = escapeHtml(content.primaryAction);
  if (content.phone) {
    const tel = escapeHtml(phoneTel(content.phone));
    const phone = escapeHtml(content.phone);
    return `<a href="tel:${tel}" style="display:inline-block;margin-top:1.5rem;padding:0.875rem 1.75rem;border-radius:0.75rem;background:${tok.primary};color:${tok.background};font-weight:600;text-decoration:none;">${action}</a>
<a href="#contact" style="display:block;margin-top:1rem;color:${tok.secondary};text-decoration:underline;">${phone}</a>`;
  }
  return `<a href="#contact" style="display:inline-block;margin-top:1.5rem;padding:0.875rem 1.75rem;border-radius:0.75rem;background:${tok.primary};color:${tok.background};font-weight:600;text-decoration:none;">${action}</a>`;
}

function heroCtaTsx(content: SectionContent, tok: SectionTokens): string {
  const action = JSON.stringify(content.primaryAction);
  if (tok.library === "shadcn") {
    return `<Button asChild className="mt-6">
        <a href="#contact">{${action}}</a>
      </Button>`;
  }
  if (tok.library === "daisyui") {
    return `<a href="#contact" className="btn btn-primary mt-6">{${action}}</a>`;
  }
  if (tok.library === "aceternity") {
    return `<MovingBorderButton href="#contact" className="mt-6">
        {${action}}
      </MovingBorderButton>`;
  }
  return `<a href="#contact" className="mt-6 inline-flex rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-background)] transition-all duration-300">{${action}}</a>`;
}

function buildCentered(
  content: SectionContent,
  tok: SectionTokens,
): SectionResult {
  const sp = spacingClasses(tok);
  const html = `<section style="min-height:90vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 2rem;background:radial-gradient(circle at 50% 40%, ${tok.primary}33, ${tok.background});color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <h1 style="font-family:${tok.displayFont},serif;font-size:clamp(2.5rem,8vw,5rem);margin:0 0 1rem;line-height:1.05;">${escapeHtml(content.businessName)}</h1>
  <p style="max-width:36rem;font-size:1.25rem;opacity:0.9;margin:0;">${escapeHtml(content.tagline)}</p>
  ${heroCtaHtml(content, tok)}
</section>`;

  const tsx = `export function HeroSection() {
  return (
    <section className="flex min-h-[90vh] flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--color-primary)_20%,transparent),var(--color-background))] text-center ${sp.section}">
      <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold leading-tight text-[var(--color-text)] md:text-7xl">
        ${JSON.stringify(content.businessName)}
      </h1>
      <p className="mt-4 max-w-xl text-xl text-[var(--color-text)] opacity-90">
        ${JSON.stringify(content.tagline)}
      </p>
      ${heroCtaTsx(content, tok)}
      ${content.phone ? `<a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="mt-4 text-[var(--color-secondary)] underline transition-all duration-300">
        ${JSON.stringify(content.phone)}
      </a>` : ""}
    </section>
  );
}
`;

  return { html, tsx, imports: heroCtaImports(tok) };
}

function buildSplit(content: SectionContent, tok: SectionTokens): SectionResult {
  const sp = spacingClasses(tok);
  const contactLines: string[] = [];
  if (content.phone) {
    contactLines.push(
      `<p><a href="tel:${escapeHtml(phoneTel(content.phone))}" style="color:${tok.primary};text-decoration:none;font-weight:600;">${escapeHtml(content.phone)}</a></p>`,
    );
  }
  if (content.address) {
    contactLines.push(`<p>${escapeHtml(content.address)}</p>`);
  }
  contactLines.push(`<p style="opacity:0.75;font-size:0.9rem;">Open for Miami locals</p>`);

  const html = `<section style="padding:4rem 2rem;color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:3rem;align-items:center;max-width:72rem;margin:0 auto;">
    <div>
      <h1 style="font-family:${tok.displayFont},serif;font-size:clamp(2rem,5vw,3.5rem);margin:0 0 1rem;">${escapeHtml(content.businessName)}</h1>
      <p style="font-size:1.125rem;opacity:0.9;margin:0 0 1.5rem;">${escapeHtml(content.tagline)}</p>
      <a href="#contact" style="display:inline-block;padding:0.75rem 1.5rem;border-radius:0.75rem;background:${tok.primary};color:${tok.background};text-decoration:none;font-weight:600;">${escapeHtml(content.primaryAction)}</a>
    </div>
    <div style="padding:2rem;border-radius:1rem;border:1px solid ${tok.secondary}44;background:${tok.background}cc;backdrop-filter:blur(12px);">
      ${contactLines.join("\n      ")}
    </div>
  </div>
</section>`;

  const cardClass =
    tok.library === "daisyui"
      ? "card bg-base-200/40 shadow-xl backdrop-blur-md"
      : "rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]/80 p-8 shadow-lg backdrop-blur-md";

  const tsx = `export function HeroSection() {
  return (
    <section className="${sp.section}">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--color-text)] md:text-5xl">
            ${JSON.stringify(content.businessName)}
          </h1>
          <p className="mt-4 text-lg text-[var(--color-text)] opacity-90">
            ${JSON.stringify(content.tagline)}
          </p>
          <a href="#contact" className="mt-6 inline-flex rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-background)] transition-all duration-300">
            ${JSON.stringify(content.primaryAction)}
          </a>
        </div>
        <div className="${cardClass}">
          ${content.phone ? `<p><a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="font-semibold text-[var(--color-primary)]">${JSON.stringify(content.phone)}</a></p>` : ""}
          ${content.address ? `<p className="mt-2 text-[var(--color-text)]">${JSON.stringify(content.address)}</p>` : ""}
          <p className="mt-4 text-sm text-[var(--color-text)] opacity-75">Open for Miami locals</p>
        </div>
      </div>
    </section>
  );
}
`;

  return { html, tsx, imports: [] };
}

function buildFullbleed(content: SectionContent, tok: SectionTokens): SectionResult {
  const overlay =
    tok.colorMode === "dark"
      ? `linear-gradient(180deg, ${tok.background}ee 0%, ${tok.primary}44 50%, ${tok.background} 100%)`
      : `linear-gradient(180deg, ${tok.background} 0%, ${tok.secondary}22 100%)`;
  const richMotion = tok.motionLevel === "rich";

  const html = `<section style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;background:${overlay};color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <h1 style="font-family:${tok.displayFont},serif;font-size:clamp(3rem,10vw,6rem);margin:0;background:linear-gradient(135deg, ${tok.primary}, ${tok.secondary});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${escapeHtml(content.businessName)}</h1>
  <p style="max-width:32rem;margin:1.5rem auto 0;font-size:1.125rem;opacity:0.85;">${escapeHtml(content.tagline)}</p>
  <a href="#contact" style="display:inline-block;margin-top:2rem;padding:0.875rem 2rem;border:1px solid ${tok.secondary};border-radius:9999px;color:${tok.text};text-decoration:none;">${escapeHtml(content.primaryAction)}</a>
  ${content.phone ? `<p style="margin-top:1rem;"><a href="tel:${escapeHtml(phoneTel(content.phone))}" style="color:${tok.secondary};">${escapeHtml(content.phone)}</a></p>` : ""}
</section>`;

  const motionImports = richMotion
    ? ['import { motion, useReducedMotion } from "framer-motion";']
    : [];
  const headline = JSON.stringify(content.businessName);
  const tagline = JSON.stringify(content.tagline);
  const action = JSON.stringify(content.primaryAction);

  const h1Inner = richMotion
    ? `{reduceMotion ? (
        <h1 className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-5xl font-bold text-transparent md:text-7xl" style={{ fontFamily: "var(--font-display)" }}>
          ${headline}
        </h1>
      ) : (
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-5xl font-bold text-transparent md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ${headline}
        </motion.h1>
      )}`
    : `<h1 className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-5xl font-bold text-transparent md:text-7xl" style={{ fontFamily: "var(--font-display)" }}>
        ${headline}
      </h1>`;

  const tsx = richMotion
    ? `"use client";

import { motion, useReducedMotion } from "framer-motion";

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-screen items-center justify-center text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-background)] via-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] to-[var(--color-background)]" />
      <div className="relative z-10 px-6">
        ${h1Inner}
        <p className="mx-auto mt-6 max-w-lg text-lg text-[var(--color-text)] opacity-85">{${tagline}}</p>
        <a href="#contact" className="mt-8 inline-flex rounded-full border border-[var(--color-secondary)] px-8 py-3 text-[var(--color-text)] transition-all duration-300">{${action}}</a>
        ${content.phone ? `<a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="mt-4 block text-[var(--color-secondary)]">{${JSON.stringify(content.phone)}}</a>` : ""}
      </div>
    </section>
  );
}
`
    : `export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-background)] via-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] to-[var(--color-background)]" />
      <div className="relative z-10 px-6">
        ${h1Inner}
        <p className="mx-auto mt-6 max-w-lg text-lg text-[var(--color-text)] opacity-85">{${tagline}}</p>
        <a href="#contact" className="mt-8 inline-flex rounded-full border border-[var(--color-secondary)] px-8 py-3 text-[var(--color-text)] transition-all duration-300">{${action}}</a>
        ${content.phone ? `<a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="mt-4 block text-[var(--color-secondary)]">{${JSON.stringify(content.phone)}}</a>` : ""}
      </div>
    </section>
  );
}
`;

  return { html, tsx, imports: motionImports };
}

function buildStatement(content: SectionContent, tok: SectionTokens): SectionResult {
  const sp = spacingClasses(tok);
  const html = `<section style="min-height:60vh;display:flex;flex-direction:column;justify-content:flex-end;padding:0 2rem 4rem;color:${tok.text};font-family:${tok.bodyFont},sans-serif;background:${tok.background};">
  <h1 style="font-family:${tok.displayFont},serif;font-size:clamp(4rem,14vw,10rem);line-height:0.95;margin:0;">${escapeHtml(content.businessName)}</h1>
  <p style="margin:1.5rem 0 0;font-size:1.25rem;max-width:32rem;opacity:0.85;">${escapeHtml(content.tagline)}</p>
  <a href="#contact" style="margin-top:2rem;color:${tok.primary};text-decoration:underline;font-size:1.125rem;">${escapeHtml(content.primaryAction)}</a>
  ${content.phone ? `<a href="tel:${escapeHtml(phoneTel(content.phone))}" style="display:block;margin-top:1rem;color:${tok.text};opacity:0.8;">${escapeHtml(content.phone)}</a>` : ""}
</section>`;

  const tsx = `export function HeroSection() {
  return (
    <section className="flex min-h-[60vh] flex-col justify-end ${sp.section} pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-7xl font-bold leading-none text-[var(--color-text)] lg:text-[10rem]">
        ${JSON.stringify(content.businessName)}
      </h1>
      <p className="mt-6 max-w-lg text-xl text-[var(--color-text)] opacity-85">
        ${JSON.stringify(content.tagline)}
      </p>
      <a href="#contact" className="mt-8 text-lg text-[var(--color-primary)] underline transition-all duration-300">
        ${JSON.stringify(content.primaryAction)}
      </a>
      ${content.phone ? `<a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="mt-4 text-[var(--color-text)] opacity-80">{${JSON.stringify(content.phone)}}</a>` : ""}
    </section>
  );
}
`;

  return { html, tsx, imports: [] };
}

export function buildHero(
  type: HeroType,
  content: SectionContent,
  tok: SectionTokens,
): SectionResult {
  switch (type) {
    case "centered":
      return buildCentered(content, tok);
    case "split":
      return buildSplit(content, tok);
    case "fullbleed":
      return buildFullbleed(content, tok);
    case "statement":
      return buildStatement(content, tok);
    default:
      return buildCentered(content, tok);
  }
}

import type { ServicesType } from "@/lib/schema";
import { escapeHtml } from "@/lib/template/singlePage";
import {
  spacingClasses,
  type SectionContent,
  type SectionResult,
  type SectionTokens,
} from "./types";

function shouldUseStats(content: SectionContent): boolean {
  if (content.reviewCount !== null || content.yearsOperating !== null) {
    return true;
  }
  return content.services.length >= 3;
}

function buildGrid(content: SectionContent, tok: SectionTokens): SectionResult {
  const sp = spacingClasses(tok);
  const richMotion = tok.motionLevel === "rich" && tok.library === "aceternity";

  const cardsHtml = content.services
    .map(
      (service) =>
        `<article style="padding:1.5rem;border-radius:1rem;border:1px solid ${tok.secondary}33;background:${tok.background}cc;min-height:12rem;">
  <h3 style="font-family:${tok.displayFont},serif;margin:0 0 0.75rem;color:${tok.primary};">${escapeHtml(service.name)}</h3>
  <p style="margin:0;opacity:0.85;line-height:1.6;">${escapeHtml(service.description)}</p>
</article>`,
    )
    .join("\n");

  const html = `<section id="services" style="padding:4rem 2rem;color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <h2 style="font-family:${tok.displayFont},serif;font-size:2rem;margin:0 0 2rem;text-align:center;">Services</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;max-width:72rem;margin:0 auto;">
    ${cardsHtml}
  </div>
</section>`;

  const cardTsx = (service: { name: string; description: string }, index: number) => {
    const name = JSON.stringify(service.name);
    const desc = JSON.stringify(service.description);
    if (tok.library === "shadcn") {
      return `<Card key={${index}} className="h-full">
          <CardHeader>
            <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-primary)]">{${name}}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--color-text)] opacity-85">{${desc}}</p>
          </CardContent>
        </Card>`;
    }
    if (tok.library === "daisyui") {
      return `<div key={${index}} className="card bg-base-200/30 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-[var(--color-primary)]">{${name}}</h3>
            <p>{${desc}}</p>
          </div>
        </div>`;
    }
    if (richMotion) {
      return `<motion.div
          key={${index}}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: ${index} * 0.1, duration: 0.5 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
        >
          <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-primary)]">{${name}}</h3>
          <p className="mt-3 text-[var(--color-text)] opacity-85">{${desc}}</p>
        </motion.div>`;
    }
    return `<div key={${index}} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-primary)]">{${name}}</h3>
        <p className="mt-3 text-[var(--color-text)] opacity-85">{${desc}}</p>
      </div>`;
  };

  const imports: string[] = [];
  if (tok.library === "shadcn") {
    imports.push(
      'import { Card, CardContent, CardHeader } from "@/components/ui/card";',
    );
  }
  if (richMotion) {
    imports.push(
      'import { motion, useReducedMotion } from "framer-motion";',
    );
  }

  if (richMotion) {
    const tsx = `"use client";

import { motion, useReducedMotion } from "framer-motion";

export function ServicesSection() {
  const reduceMotion = useReducedMotion();
  const services = ${JSON.stringify(content.services)};

  return (
    <section id="services" className="${sp.section}">
      <h2 className="mb-10 text-center font-[family-name:var(--font-display)] text-3xl text-[var(--color-text)]">Services</h2>
      <div className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(280px,1fr))] ${sp.gap}">
        {services.map((service, index) => {
          if (reduceMotion) {
            return (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-primary)]">{service.name}</h3>
                <p className="mt-3 text-[var(--color-text)] opacity-85">{service.description}</p>
              </div>
            );
          }
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
            >
              <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-primary)]">{service.name}</h3>
              <p className="mt-3 text-[var(--color-text)] opacity-85">{service.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
`;
    return { html, tsx, imports };
  }

  const cardsJoined = content.services
    .map((service, index) => cardTsx(service, index))
    .join("\n        ");

  const tsx = `${tok.library === "shadcn" ? 'import { Card, CardContent, CardHeader } from "@/components/ui/card";\n\n' : ""}export function ServicesSection() {
  return (
    <section id="services" className="${sp.section}">
      <h2 className="mb-10 text-center font-[family-name:var(--font-display)] text-3xl text-[var(--color-text)]">Services</h2>
      <div className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(280px,1fr))] ${sp.gap}">
        ${cardsJoined}
      </div>
    </section>
  );
}
`;

  return { html, tsx, imports };
}

function buildStrips(content: SectionContent, tok: SectionTokens): SectionResult {
  const sp = spacingClasses(tok);
  const services = content.services.slice(0, 4);

  const stripsHtml = services
    .map((service, index) => {
      const align = index % 2 === 0 ? "flex-start" : "flex-end";
      const textAlign = index % 2 === 0 ? "left" : "right";
      return `<div style="display:flex;justify-content:${align};padding:2rem 0;border-bottom:1px solid ${tok.secondary}22;">
  <div style="max-width:36rem;text-align:${textAlign};border-left:4px solid ${tok.primary};padding-left:1.25rem;${index % 2 === 1 ? `border-left:none;border-right:4px solid ${tok.primary};padding-left:0;padding-right:1.25rem;` : ""}">
    <h3 style="font-size:1.5rem;margin:0 0 0.5rem;font-family:${tok.displayFont},serif;">${escapeHtml(service.name)}</h3>
    <p style="margin:0;opacity:0.85;">${escapeHtml(service.description)}</p>
  </div>
</div>`;
    })
    .join("\n");

  const html = `<section id="services" style="padding:4rem 2rem;color:${tok.text};font-family:${tok.bodyFont},sans-serif;max-width:56rem;margin:0 auto;">
  <h2 style="font-family:${tok.displayFont},serif;font-size:2rem;margin:0 0 1rem;">What we offer</h2>
  ${stripsHtml}
</section>`;

  const stripRows = services
    .map((service, index) => {
      const reverse = index % 2 === 1 ? " lg:flex-row-reverse" : "";
      return `<div className="flex flex-col gap-6 py-8 lg:flex-row${reverse} lg:items-center lg:justify-between">
          <div className="${index % 2 === 0 ? "border-l-4" : "border-r-4"} border-[var(--color-primary)] ${index % 2 === 0 ? "pl-6" : "pr-6 text-right"} max-w-xl">
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">${JSON.stringify(service.name)}</h3>
            <p className="mt-2 text-[var(--color-text)] opacity-85">${JSON.stringify(service.description)}</p>
          </div>
        </div>`;
    })
    .join("\n        ");

  const tsx = `export function ServicesSection() {
  return (
    <section id="services" className="${sp.section}">
      <div className="mx-auto max-w-4xl divide-y divide-[var(--color-border)]">
        <h2 className="pb-6 font-[family-name:var(--font-display)] text-3xl text-[var(--color-text)]">What we offer</h2>
        ${stripRows}
      </div>
    </section>
  );
}
`;

  return { html, tsx, imports: [] };
}

function buildMosaic(content: SectionContent, tok: SectionTokens): SectionResult {
  const sp = spacingClasses(tok);
  const padCycle = ["p-4", "p-6", "p-8"];
  const seed = content.businessName.length % 3;

  const itemsHtml = content.services
    .map((service, index) => {
      const pad = ["1rem", "1.5rem", "2rem"][(seed + index) % 3];
      const nameSize = index === 0 ? "1.25rem" : "1rem";
      return `<article style="break-inside:avoid;padding:${pad};margin-bottom:1rem;border-radius:0.75rem;background:${tok.background};border:1px solid ${tok.secondary}22;">
  <h3 style="font-family:${tok.displayFont},serif;font-size:${nameSize};margin:0 0 0.5rem;color:${tok.primary};">${escapeHtml(service.name)}</h3>
  <p style="margin:0;opacity:0.85;font-size:0.95rem;">${escapeHtml(service.description)}</p>
</article>`;
    })
    .join("\n");

  const html = `<section id="services" style="padding:4rem 2rem;color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <h2 style="font-family:${tok.displayFont},serif;font-size:2rem;margin:0 0 2rem;">Services</h2>
  <div style="columns:1;column-gap:1.5rem;">
    ${itemsHtml}
  </div>
</section>`;

  const itemsTsx = content.services
    .map((service, index) => {
      const pad = padCycle[(seed + index) % 3];
      const nameClass = index === 0 ? "text-lg" : "text-base";
      return `<article key={${index}} className="mb-4 break-inside-avoid rounded-xl border border-[var(--color-border)] ${pad}">
          <h3 className="font-[family-name:var(--font-display)] ${nameClass} text-[var(--color-primary)]">${JSON.stringify(service.name)}</h3>
          <p className="mt-2 text-sm text-[var(--color-text)] opacity-85">${JSON.stringify(service.description)}</p>
        </article>`;
    })
    .join("\n        ");

  const tsx = `export function ServicesSection() {
  return (
    <section id="services" className="${sp.section}">
      <h2 className="mb-8 font-[family-name:var(--font-display)] text-3xl text-[var(--color-text)]">Services</h2>
      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
        ${itemsTsx}
      </div>
    </section>
  );
}
`;

  return { html, tsx, imports: [] };
}

function buildStats(content: SectionContent, tok: SectionTokens): SectionResult {
  const sp = spacingClasses(tok);
  const stats: Array<{ value: string; label: string }> = [];

  if (content.reviewCount !== null) {
    stats.push({
      value: content.reviewCount.toLocaleString(),
      label: "reviews",
    });
  }
  if (content.yearsOperating !== null) {
    stats.push({
      value: String(content.yearsOperating),
      label: "years serving Miami",
    });
  }
  stats.push({
    value: String(content.services.length),
    label: "services offered",
  });

  while (stats.length < 3 && content.services.length > 0) {
    const service = content.services[stats.length - 1];
    if (!service) break;
    stats.push({ value: service.name, label: "specialty" });
  }

  const statsHtml = stats
    .map(
      (stat) =>
        `<div style="text-align:center;padding:1.5rem 2rem;">
  <div style="font-family:${tok.displayFont},serif;font-size:3rem;font-weight:700;color:${tok.primary};">${escapeHtml(stat.value)}</div>
  <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.15em;opacity:0.7;margin-top:0.5rem;">${escapeHtml(stat.label)}</div>
</div>`,
    )
    .join("\n");

  const html = `<section id="services" style="padding:4rem 2rem;color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;max-width:56rem;margin:0 auto;">
    ${statsHtml}
  </div>
</section>`;

  const statsTsx = stats
    .map(
      (stat) =>
        `<div className="px-8 py-6 text-center">
          <div className="font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--color-primary)]">${JSON.stringify(stat.value)}</div>
          <div className="mt-2 text-sm uppercase tracking-widest text-[var(--color-text)] opacity-70">${JSON.stringify(stat.label)}</div>
        </div>`,
    )
    .join("\n        ");

  const tsx = `export function ServicesSection() {
  return (
    <section id="services" className="${sp.section}">
      <div className="mx-auto flex max-w-4xl flex-wrap justify-center ${sp.gap}">
        ${statsTsx}
      </div>
    </section>
  );
}
`;

  return { html, tsx, imports: [] };
}

export function buildServices(
  type: ServicesType,
  content: SectionContent,
  tok: SectionTokens,
): SectionResult {
  if (type === "stats" && !shouldUseStats(content)) {
    return buildGrid(content, tok);
  }

  switch (type) {
    case "grid":
      return buildGrid(content, tok);
    case "strips":
      return buildStrips(content, tok);
    case "mosaic":
      return buildMosaic(content, tok);
    case "stats":
      return buildStats(content, tok);
    default:
      return buildGrid(content, tok);
  }
}

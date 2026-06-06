import type { ContactType } from "@/lib/schema";
import { escapeHtml } from "@/lib/template/singlePage";
import {
  mapsUrl,
  phoneTel,
  spacingClasses,
  type SectionContent,
  type SectionResult,
  type SectionTokens,
} from "./types";

function buildMinimal(content: SectionContent, tok: SectionTokens): SectionResult {
  const sp = spacingClasses(tok);
  const lines: string[] = [];

  if (content.phone) {
    lines.push(
      `<a href="tel:${escapeHtml(phoneTel(content.phone))}" style="display:block;font-size:1.75rem;font-weight:700;color:${tok.primary};text-decoration:none;margin-bottom:1rem;">${escapeHtml(content.phone)}</a>`,
    );
  }
  if (content.address) {
    lines.push(
      `<p style="margin:0 0 0.75rem;opacity:0.9;">${escapeHtml(content.address)}</p>`,
    );
  }
  if (content.email) {
    lines.push(
      `<a href="mailto:${escapeHtml(content.email)}" style="color:${tok.secondary};">${escapeHtml(content.email)}</a>`,
    );
  }

  const html = `<section id="contact" style="padding:4rem 2rem;text-align:center;color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <h2 style="font-family:${tok.displayFont},serif;font-size:2rem;margin:0 0 2rem;">Contact</h2>
  ${lines.join("\n  ")}
</section>`;

  const tsx = `export function ContactSection() {
  return (
    <section id="contact" className="${sp.section} text-center">
      <h2 className="mb-8 font-[family-name:var(--font-display)] text-3xl text-[var(--color-text)]">Contact</h2>
      ${content.phone ? `<a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="block text-2xl font-bold text-[var(--color-primary)] transition-all duration-300">
        ${JSON.stringify(content.phone)}
      </a>` : ""}
      ${content.address ? `<p className="mt-4 text-[var(--color-text)] opacity-90">${JSON.stringify(content.address)}</p>` : ""}
      ${content.email ? `<a href={${JSON.stringify(`mailto:${content.email}`)}} className="mt-3 inline-block text-[var(--color-secondary)] transition-all duration-300">
        ${JSON.stringify(content.email)}
      </a>` : ""}
    </section>
  );
}
`;

  return { html, tsx, imports: [] };
}

function buildCard(content: SectionContent, tok: SectionTokens): SectionResult {
  const sp = spacingClasses(tok);
  const fields: string[] = [];
  if (content.phone) {
    fields.push(
      `<p>📞 <a href="tel:${escapeHtml(phoneTel(content.phone))}" style="color:${tok.primary};text-decoration:none;">${escapeHtml(content.phone)}</a></p>`,
    );
  }
  if (content.address) {
    fields.push(`<p>📍 ${escapeHtml(content.address)}</p>`);
  }
  if (content.email) {
    fields.push(
      `<p>✉️ <a href="mailto:${escapeHtml(content.email)}" style="color:${tok.secondary};">${escapeHtml(content.email)}</a></p>`,
    );
  }

  const html = `<section id="contact" style="padding:4rem 2rem;color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <div style="max-width:28rem;margin:0 auto;padding:2rem;border-radius:1rem;border:1px solid ${tok.secondary}33;background:${tok.background}cc;backdrop-filter:blur(12px);">
    <h2 style="font-family:${tok.displayFont},serif;margin:0 0 1.5rem;">Get in touch</h2>
    ${fields.join("\n    ")}
    <a href="#contact" style="display:inline-block;margin-top:1.5rem;padding:0.75rem 1.5rem;border-radius:0.75rem;background:${tok.primary};color:${tok.background};text-decoration:none;font-weight:600;">Get in touch</a>
  </div>
</section>`;

  const cardWrapper =
    tok.library === "shadcn"
      ? `<Card className="mx-auto max-w-md">
        <CardHeader>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Get in touch</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-[var(--color-text)]">
          ${content.phone ? `<p>📞 <a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="text-[var(--color-primary)]">${JSON.stringify(content.phone)}</a></p>` : ""}
          ${content.address ? `<p>📍 ${JSON.stringify(content.address)}</p>` : ""}
          ${content.email ? `<p>✉️ <a href={${JSON.stringify(`mailto:${content.email}`)}} className="text-[var(--color-secondary)]">${JSON.stringify(content.email)}</a></p>` : ""}
          <a href="#contact" className="mt-4 inline-flex rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-background)] transition-all duration-300">
            Get in touch
          </a>
        </CardContent>
      </Card>`
      : tok.library === "daisyui"
        ? `<div className="card mx-auto max-w-md bg-base-200/40 shadow-xl backdrop-blur-md">
        <div className="card-body">
          <h2 className="card-title font-[family-name:var(--font-display)]">Get in touch</h2>
          ${content.phone ? `<p>📞 <a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="link link-primary">${JSON.stringify(content.phone)}</a></p>` : ""}
          ${content.address ? `<p>📍 ${JSON.stringify(content.address)}</p>` : ""}
          ${content.email ? `<p>✉️ <a href={${JSON.stringify(`mailto:${content.email}`)}} className="link">${JSON.stringify(content.email)}</a></p>` : ""}
          <a href="#contact" className="btn btn-primary mt-4">Get in touch</a>
        </div>
      </div>`
        : `<div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Get in touch</h2>
        <div className="mt-4 space-y-3 text-[var(--color-text)]">
          ${content.phone ? `<p>📞 <a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="text-[var(--color-primary)]">${JSON.stringify(content.phone)}</a></p>` : ""}
          ${content.address ? `<p>📍 ${JSON.stringify(content.address)}</p>` : ""}
          ${content.email ? `<p>✉️ <a href={${JSON.stringify(`mailto:${content.email}`)}} className="text-[var(--color-secondary)]">${JSON.stringify(content.email)}</a></p>` : ""}
        </div>
        <a href="#contact" className="mt-6 inline-flex rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-background)] transition-all duration-300">
          Get in touch
        </a>
      </div>`;

  const imports =
    tok.library === "shadcn"
      ? ['import { Card, CardContent, CardHeader } from "@/components/ui/card";']
      : [];

  const tsx = `${tok.library === "shadcn" ? 'import { Card, CardContent, CardHeader } from "@/components/ui/card";\n\n' : ""}export function ContactSection() {
  return (
    <section id="contact" className="${sp.section}">
      ${cardWrapper}
    </section>
  );
}
`;

  return { html, tsx, imports };
}

function buildMapForward(content: SectionContent, tok: SectionTokens): SectionResult {
  if (!content.address) {
    return buildMinimal(content, tok);
  }

  const sp = spacingClasses(tok);
  const directionsUrl = mapsUrl(content.address);

  const html = `<section id="contact" style="padding:4rem 2rem;text-align:center;color:${tok.text};font-family:${tok.bodyFont},sans-serif;">
  <a href="${escapeHtml(directionsUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:1.25rem 2.5rem;border-radius:9999px;background:${tok.primary};color:${tok.background};font-size:1.25rem;font-weight:700;text-decoration:none;">Get directions →</a>
  ${content.phone ? `<p style="margin-top:1.5rem;"><a href="tel:${escapeHtml(phoneTel(content.phone))}" style="color:${tok.secondary};font-size:1.125rem;">${escapeHtml(content.phone)}</a></p>` : ""}
  <p style="margin-top:1rem;opacity:0.8;">${escapeHtml(content.address)}</p>
</section>`;

  const tsx = `export function ContactSection() {
  return (
    <section id="contact" className="${sp.section} text-center">
      <a
        href={${JSON.stringify(directionsUrl)}}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-full bg-[var(--color-primary)] px-10 py-5 text-xl font-bold text-[var(--color-background)] transition-all duration-300"
      >
        Get directions →
      </a>
      ${content.phone ? `<a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="mt-6 block text-lg text-[var(--color-secondary)] transition-all duration-300">
        ${JSON.stringify(content.phone)}
      </a>` : ""}
      <p className="mt-4 text-[var(--color-text)] opacity-80">${JSON.stringify(content.address)}</p>
    </section>
  );
}
`;

  return { html, tsx, imports: [] };
}

export function buildContact(
  type: ContactType,
  content: SectionContent,
  tok: SectionTokens,
): SectionResult {
  switch (type) {
    case "minimal":
      return buildMinimal(content, tok);
    case "card":
      return buildCard(content, tok);
    case "map-forward":
      return buildMapForward(content, tok);
    default:
      return buildMinimal(content, tok);
  }
}

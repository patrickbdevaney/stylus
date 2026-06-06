import type { NavType } from "@/lib/schema";
import { escapeHtml } from "@/lib/template/singlePage";
import {
  phoneTel,
  type SectionContent,
  type SectionResult,
  type SectionTokens,
} from "./types";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
] as const;

function navLinksHtml(tok: SectionTokens): string {
  return NAV_LINKS.map(
    (link) =>
      `<a href="${link.href}" style="color:${tok.text};text-decoration:none;opacity:0.85;margin:0 0.75rem;">${link.label}</a>`,
  ).join("\n    ");
}

function navLinksTsx(): string {
  return NAV_LINKS.map(
    (link) =>
      `<a href="${link.href}" className="text-[var(--color-text)] opacity-85 transition-all duration-300 hover:opacity-100">${link.label}</a>`,
  ).join("\n          ");
}

function navShellClass(): string {
  return "sticky top-0 z-10 border-b border-[var(--color-border)] backdrop-blur-md bg-[color-mix(in_srgb,var(--color-background)_90%,transparent)]";
}

function buildMinimal(content: SectionContent, tok: SectionTokens): SectionResult {
  const html = `<nav style="position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;border-bottom:1px solid ${tok.secondary}22;background:color-mix(in srgb, ${tok.background} 90%, transparent);backdrop-filter:blur(12px);font-family:${tok.bodyFont},sans-serif;">
  <span style="font-family:${tok.displayFont},serif;font-weight:700;color:${tok.text};">${escapeHtml(content.businessName)}</span>
  <div>
    ${navLinksHtml(tok)}
  </div>
</nav>`;

  const tsx = `export function NavBar() {
  return (
    <nav className="${navShellClass()} flex items-center justify-between px-6 py-4">
      <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-text)]">
        ${JSON.stringify(content.businessName)}
      </span>
      <div className="flex gap-4 text-sm">
        ${navLinksTsx()}
      </div>
    </nav>
  );
}
`;

  return { html, tsx, imports: [] };
}

function buildStickyCta(content: SectionContent, tok: SectionTokens): SectionResult {
  const ctaHtml = content.phone
    ? `<a href="tel:${escapeHtml(phoneTel(content.phone))}" style="padding:0.5rem 1.25rem;border-radius:9999px;background:${tok.primary};color:${tok.background};text-decoration:none;font-weight:600;">${escapeHtml(content.phone)}</a>`
    : `<a href="#contact" style="padding:0.5rem 1.25rem;border-radius:9999px;background:${tok.primary};color:${tok.background};text-decoration:none;font-weight:600;">Contact us</a>`;

  const html = `<nav style="position:sticky;top:0;z-index:10;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:1rem 2rem;border-bottom:1px solid ${tok.secondary}22;background:color-mix(in srgb, ${tok.background} 90%, transparent);backdrop-filter:blur(12px);font-family:${tok.bodyFont},sans-serif;">
  <span style="font-family:${tok.displayFont},serif;font-weight:700;color:${tok.text};">${escapeHtml(content.businessName)}</span>
  <div style="display:none;gap:1.5rem;justify-content:center;" class="nav-links">
    ${navLinksHtml(tok)}
  </div>
  ${ctaHtml}
</nav>`;

  const ctaTsx = content.phone
    ? `<a href={${JSON.stringify(`tel:${phoneTel(content.phone)}`)}} className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-background)] transition-all duration-300">
        ${JSON.stringify(content.phone)}
      </a>`
    : `<a href="#contact" className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-background)] transition-all duration-300">
        Contact us
      </a>`;

  const tsx = `export function NavBar() {
  return (
    <nav className="${navShellClass()} grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
      <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-text)]">
        ${JSON.stringify(content.businessName)}
      </span>
      <div className="hidden gap-6 md:flex">
        ${navLinksTsx()}
      </div>
      <div className="justify-self-end">
        ${ctaTsx}
      </div>
    </nav>
  );
}
`;

  return { html, tsx, imports: [] };
}

function buildLogoCentered(content: SectionContent, tok: SectionTokens): SectionResult {
  const html = `<nav style="position:sticky;top:0;z-index:10;padding:1.25rem 2rem;text-align:center;border-bottom:1px solid ${tok.secondary}22;background:color-mix(in srgb, ${tok.background} 90%, transparent);backdrop-filter:blur(12px);font-family:${tok.bodyFont},sans-serif;">
  <div style="font-family:${tok.displayFont},serif;font-size:1.5rem;font-weight:700;color:${tok.text};">${escapeHtml(content.businessName)}</div>
  <div style="margin-top:0.75rem;">
    ${navLinksHtml(tok)}
  </div>
</nav>`;

  const tsx = `export function NavBar() {
  return (
    <nav className="${navShellClass()} px-6 py-5 text-center">
      <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
        ${JSON.stringify(content.businessName)}
      </div>
      <div className="mt-3 flex justify-center gap-6 text-sm">
        ${navLinksTsx()}
      </div>
    </nav>
  );
}
`;

  return { html, tsx, imports: [] };
}

export function buildNav(
  type: NavType,
  content: SectionContent,
  tok: SectionTokens,
): SectionResult {
  switch (type) {
    case "minimal":
      return buildMinimal(content, tok);
    case "sticky-cta":
      return buildStickyCta(content, tok);
    case "logo-centered":
      return buildLogoCentered(content, tok);
    default:
      return buildMinimal(content, tok);
  }
}

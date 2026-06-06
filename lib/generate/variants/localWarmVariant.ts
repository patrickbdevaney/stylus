import { buildBaseScaffold } from "@/lib/generate/scaffold";
import { tokensToCssVars, tokensToW3C } from "@/lib/generate/tokens";
import type {
  BrandTokens,
  DesignBrief,
  EnrichmentContext,
  GeneratedVariant,
  SiteAudit,
} from "@/lib/schema";
import { renderFromAudit } from "@/lib/template/singlePage";

type GradientAngle = "150deg" | "135deg" | "120deg";

function localSeed(audit: SiteAudit, tokens: BrandTokens): number {
  const primary = tokens.colors.find((c) => c.role === "primary")?.value ?? "#ff6b35";
  let seed = audit.businessName.length;
  for (let i = 0; i < audit.businessName.length; i++) {
    seed = (seed * 31 + audit.businessName.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < primary.length; i++) {
    seed = (seed * 19 + primary.charCodeAt(i)) | 0;
  }
  return Math.abs(seed);
}

function pickGradientAngle(seed: number): GradientAngle {
  const options: GradientAngle[] = ["150deg", "135deg", "120deg"];
  return options[seed % options.length];
}

function phoneTel(phone: string): string {
  return phone.replace(/\D/g, "");
}

function whatsAppUrl(phone: string): string {
  return `https://wa.me/${phoneTel(phone)}`;
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function schemaTypeForCategory(category: string): string {
  const map: Record<string, string> = {
    restaurant: "Restaurant",
    food: "Restaurant",
    cafe: "CafeOrCoffeeShop",
    coffee: "CafeOrCoffeeShop",
    shop: "Store",
    retail: "Store",
    service: "LocalBusiness",
  };
  const lower = category.toLowerCase();
  if (map[lower]) return map[lower];
  for (const key of Object.keys(map)) {
    if (lower.includes(key)) return map[key];
  }
  return "LocalBusiness";
}

function hexToHue(hex: string): number | null {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6 && normalized.length !== 3) return null;
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const r = Number.parseInt(full.slice(0, 2), 16) / 255;
  const g = Number.parseInt(full.slice(2, 4), 16) / 255;
  const b = Number.parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / delta + (max === r && g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / delta + 2) * 60;
  else h = ((r - g) / delta + 4) * 60;
  return h;
}

function isCoolPrimary(hex: string): boolean {
  const hue = hexToHue(hex);
  if (hue === null) return false;
  return hue >= 180 && hue <= 300;
}

function warmHeroStops(primary: string, angle: GradientAngle): string {
  const warmBlend = isCoolPrimary(primary)
    ? `linear-gradient(${angle}, #ff8c42 0%, #ffb347 35%, color-mix(in srgb, ${primary} 55%, #ff8c42) 100%)`
    : `linear-gradient(${angle}, color-mix(in srgb, ${primary} 85%, #ff8c42) 0%, #ffb347 45%, #fff7ed 100%)`;
  return warmBlend;
}

function ctaLabel(audit: SiteAudit, seed: number): string {
  const lower = audit.category.toLowerCase();
  const options =
    lower.includes("restaurant") ||
    lower.includes("cafe") ||
    lower.includes("bar") ||
    lower.includes("food")
      ? ["Call now", "Reserve a table", "Visit us today"]
      : ["Call now", "Visit us today", "Get directions"];

  return options[seed % options.length] ?? "Call now";
}

function serviceEntries(audit: SiteAudit): Array<{ name: string; reason: string }> {
  const reasons = Object.values(audit.dimensions).map((dimension) => dimension.reason);
  return audit.brand.services.slice(0, 6).map((service, index) => ({
    name: service,
    reason: reasons[index % reasons.length] ?? "Friendly service you can count on.",
  }));
}

function patchPackageJson(files: Record<string, string>): void {
  const pkg = JSON.parse(files["package.json"]) as {
    dependencies: Record<string, string>;
  };
  pkg.dependencies.daisyui = "4.12.10";
  files["package.json"] = JSON.stringify(pkg, null, 2);
}

function patchTailwindTheme(
  files: Record<string, string>,
  tokens: BrandTokens,
): void {
  const primary =
    tokens.colors.find((color) => color.role === "primary")?.value ?? "#ff6b35";
  const secondary =
    tokens.colors.find((color) => color.role === "secondary")?.value ?? "#ffb347";
  const background =
    tokens.colors.find((color) => color.role === "background")?.value ?? "#fffaf5";
  const text =
    tokens.colors.find((color) => color.role === "text")?.value ?? "#2b2118";

  files["tailwind.config.ts"] = `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        warmlocal: {
          primary: "${primary}",
          secondary: "${secondary}",
          accent: "${secondary}",
          neutral: "${text}",
          "base-100": "${background}",
          "base-200": "#fff1e6",
          "base-300": "#ffe4cc",
          info: "#2563eb",
          success: "#16a34a",
          warning: "#f59e0b",
          error: "#dc2626",
        },
      },
    ],
  },
};

export default config;
`;
}

function buildNavBar(audit: SiteAudit): string {
  return `export function NavBar() {
  return (
    <header className="navbar bg-base-200 px-4 shadow-sm">
      <div className="flex-1">
        <a className="text-lg font-semibold text-primary">${JSON.stringify(audit.businessName)}</a>
      </div>
      <div className="flex-none gap-2">
        <a href="#services" className="btn btn-ghost btn-sm hidden sm:inline-flex">
          Services
        </a>
        <a href="#contact" className="btn btn-ghost btn-sm hidden sm:inline-flex">
          Contact
        </a>
        ${
          audit.brand.phone
            ? `<a href=${JSON.stringify(`tel:${phoneTel(audit.brand.phone)}`)} className="btn btn-primary btn-sm">
          Call
        </a>`
            : ""
        }
      </div>
    </header>
  );
}
`;
}

function buildHeroSection(
  audit: SiteAudit,
  brief: DesignBrief,
  cta: string,
  angle: GradientAngle,
  primary: string,
): string {
  const heroBackground = warmHeroStops(primary, angle);

  return `export function HeroSection() {
  return (
    <section
      className="hero min-h-[78vh] bg-base-100"
      style={{ backgroundImage: ${JSON.stringify(heroBackground)} }}
    >
      <div className="hero-overlay bg-black/10" />
      <div className="hero-content px-4 py-16 text-center text-neutral">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] opacity-80">
            ${JSON.stringify(audit.category)}
          </p>
          <h1 className="mb-4 text-4xl font-bold md:text-6xl">
            ${JSON.stringify(audit.businessName)}
          </h1>
          <p className="mb-8 text-lg opacity-90 md:text-xl">
            ${JSON.stringify(brief.voice)}
          </p>
          ${
            audit.brand.phone
              ? `<a
            href=${JSON.stringify(`tel:${phoneTel(audit.brand.phone)}`)}
            className="btn btn-primary btn-lg w-full max-w-md text-lg shadow-lg transition-transform hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
          >
            ${JSON.stringify(cta)}
          </a>`
              : `<a href="#contact" className="btn btn-primary btn-lg">${JSON.stringify(cta)}</a>`
          }
          ${
            audit.brand.address
              ? `<div className="mt-4 inline-flex rounded-full bg-base-100/80 px-4 py-2 text-sm shadow">
            📍 ${JSON.stringify(audit.brand.address)}
          </div>`
              : ""
          }
        </div>
      </div>
    </section>
  );
}
`;
}

function buildServiceCard(): string {
  return `type ServiceCardProps = {
  title: string;
  body: string;
  className: string;
};

export function ServiceCard({ title, body, className }: ServiceCardProps) {
  return (
    <article className={\`card card-compact shadow-md transition-shadow duration-200 hover:shadow-lg motion-reduce:transition-none \${className}\`}>
      <div className="card-body">
        <h3 className="card-title text-primary">{title}</h3>
        <p className="text-sm leading-relaxed opacity-80">{body}</p>
      </div>
    </article>
  );
}
`;
}

function buildServicesSection(entries: Array<{ name: string; reason: string }>): string {
  return `import { ServiceCard } from "@/components/ServiceCard";

const services = [
${entries
  .map(
    (entry, index) =>
      `  { title: ${JSON.stringify(entry.name)}, body: ${JSON.stringify(entry.reason)}, className: ${JSON.stringify(index % 2 === 0 ? "bg-base-100" : "bg-base-200")} },`,
  )
  .join("\n")}
];

export function ServicesSection() {
  return (
    <section id="services" className="bg-base-100 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:text-left">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-secondary">What we offer</p>
          <h2 className="text-3xl font-bold text-primary md:text-4xl">Services</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.title}
              title={service.title}
              body={service.body}
              className={service.className}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function buildReviewBadge(enrichment?: EnrichmentContext): string | null {
  if (enrichment?.googleRating == null && enrichment?.googleReviewCount == null) {
    return null;
  }

  const rating = enrichment.googleRating ?? 0;
  const count = enrichment.googleReviewCount ?? 0;
  const show = rating > 0 || count > 0;
  if (!show) return null;

  return `export function ReviewBadge() {
  return (
    <div className="flex justify-center py-6">
      <div className="badge badge-lg gap-2 bg-base-200 px-4 py-4 text-base text-neutral shadow">
        <span aria-hidden>★</span>
        <span className="font-semibold">${rating.toFixed(1)}</span>
        <span className="opacity-70">${count > 0 ? `${count.toLocaleString()} reviews` : "Rated on Google"}</span>
      </div>
    </div>
  );
}
`;
}

function buildContactSection(audit: SiteAudit): string {
  const address = audit.brand.address ?? "Miami, FL";
  const hours = "Open daily · Miami local hours";

  return `export function ContactSection() {
  return (
    <section id="contact" className="bg-base-200 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-primary md:text-4xl">Visit or call</h2>
        </div>
        <div className="stats stats-vertical w-full shadow lg:stats-horizontal">
          ${
            audit.brand.phone
              ? `<div className="stat place-items-center">
            <div className="stat-title">Phone</div>
            <div className="stat-value text-lg">
              <a href=${JSON.stringify(`tel:${phoneTel(audit.brand.phone)}`)} className="link link-primary">
                ${JSON.stringify(audit.brand.phone)}
              </a>
            </div>
          </div>`
              : ""
          }
          <div className="stat place-items-center">
            <div className="stat-title">Hours</div>
            <div className="stat-value text-lg">${JSON.stringify(hours)}</div>
          </div>
          <div className="stat place-items-center">
            <div className="stat-title">Address</div>
            <div className="stat-value text-base">${JSON.stringify(address)}</div>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href=${JSON.stringify(mapsUrl(address))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-primary"
          >
            Open in Google Maps
          </a>
          ${
            audit.brand.phone
              ? `<a
            href=${JSON.stringify(whatsAppUrl(audit.brand.phone))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Message on WhatsApp
          </a>`
              : ""
          }
        </div>
      </div>
    </section>
  );
}
`;
}

function buildPage(audit: SiteAudit, hasReviewBadge: boolean): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": schemaTypeForCategory(audit.category),
    name: audit.businessName,
    description: audit.brand.tagline,
    telephone: audit.brand.phone ?? undefined,
    email: audit.brand.email ?? undefined,
    address: audit.brand.address
      ? {
          "@type": "PostalAddress",
          streetAddress: audit.brand.address,
          addressLocality: "Miami",
          addressRegion: "FL",
          addressCountry: "US",
        }
      : undefined,
    url: "https://stylus.vercel.app",
    areaServed: "Miami, FL",
  };

  return `import { ContactSection } from "@/components/ContactSection";
import { HeroSection } from "@/components/HeroSection";
import { NavBar } from "@/components/NavBar";
${hasReviewBadge ? 'import { ReviewBadge } from "@/components/ReviewBadge";\n' : ""}import { ServicesSection } from "@/components/ServicesSection";

const jsonLd = ${JSON.stringify(jsonLd, null, 2)};

export default function Page() {
  return (
    <div data-theme="warmlocal">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <main>
        <HeroSection />
        ${hasReviewBadge ? "<ReviewBadge />" : ""}
        <ServicesSection />
        <ContactSection />
      </main>
      <footer className="footer footer-center bg-base-300 p-6 text-base-content">
        <aside>
          <p>© {new Date().getFullYear()} ${JSON.stringify(audit.businessName)} · Miami, FL</p>
        </aside>
      </footer>
    </div>
  );
}
`;
}

function buildGlobalsCss(tokens: BrandTokens, angle: GradientAngle): string {
  const primary =
    tokens.colors.find((color) => color.role === "primary")?.value ?? "#ff6b35";

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

${tokensToCssVars(tokens)}

:root {
  --hero-angle: ${angle};
  --warm-hero: ${warmHeroStops(primary, angle)};
}

@layer base {
  body {
    font-family: var(--font-body, "Inter", system-ui, sans-serif);
    background-color: var(--color-background);
    color: var(--color-text);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
  }
}
`;
}

function buildLayout(audit: SiteAudit): string {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(audit.businessName)},
  description: ${JSON.stringify(audit.brand.tagline)},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="warmlocal">
      <body className="min-h-screen bg-base-100 text-neutral antialiased">{children}</body>
    </html>
  );
}
`;
}

export async function buildLocalWarmVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
  enrichment?: EnrichmentContext,
): Promise<GeneratedVariant> {
  const seed = localSeed(audit, tokens);
  const angle = pickGradientAngle(seed);
  const cta = ctaLabel(audit, seed);
  const primary =
    tokens.colors.find((color) => color.role === "primary")?.value ?? "#ff6b35";
  const entries = serviceEntries(audit);
  const reviewBadge = buildReviewBadge(enrichment);

  const warmBrief: DesignBrief = {
    ...brief,
    archetype: "warm-local",
  };

  const files = buildBaseScaffold({
    businessName: audit.businessName,
    library: "daisyui",
    tokens,
    brief: warmBrief,
  });

  patchPackageJson(files);
  patchTailwindTheme(files, tokens);

  files["app/layout.tsx"] = buildLayout(audit);
  files["components/NavBar.tsx"] = buildNavBar(audit);
  files["components/HeroSection.tsx"] = buildHeroSection(
    audit,
    brief,
    cta,
    angle,
    primary,
  );
  files["components/ServiceCard.tsx"] = buildServiceCard();
  files["components/ServicesSection.tsx"] = buildServicesSection(entries);
  files["components/ContactSection.tsx"] = buildContactSection(audit);
  if (reviewBadge) {
    files["components/ReviewBadge.tsx"] = reviewBadge;
  }
  files["app/page.tsx"] = buildPage(audit, reviewBadge !== null);
  files["app/globals.css"] = buildGlobalsCss(tokens, angle);

  return {
    files,
    library: "daisyui",
    archetype: "warm-local",
    businessName: audit.businessName,
    variantLabel: "Local",
    differentiationRationale: `${brief.differentiationVector} DaisyUI's warm, approachable components and mobile-first tap-to-call layout maximize walk-in and phone conversion for local businesses.`,
    tokensJson: tokensToW3C(tokens),
    previewHtml: renderFromAudit({ ...audit, brandTier: "iconic" }),
  };
}

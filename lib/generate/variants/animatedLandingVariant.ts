import { buildBaseScaffold } from "@/lib/generate/scaffold";
import { tokensToCssVars, tokensToW3C } from "@/lib/generate/tokens";
import type {
  BrandTokens,
  DesignBrief,
  GeneratedVariant,
  SiteAudit,
} from "@/lib/schema";
import { renderFromAudit } from "@/lib/template/singlePage";

type SpotlightPosition = "top-left" | "top-center" | "top-right";
type GradientDirection = "135deg" | "45deg" | "225deg";

function animatedSeed(audit: SiteAudit, tokens: BrandTokens): number {
  const primary = tokens.colors[0]?.value ?? "#ff2d95";
  let seed = audit.businessName.length;
  for (let i = 0; i < audit.businessName.length; i++) {
    seed = (seed * 31 + audit.businessName.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < primary.length; i++) {
    seed = (seed * 17 + primary.charCodeAt(i)) | 0;
  }
  return Math.abs(seed);
}

function pickSpotlight(seed: number): SpotlightPosition {
  const options: SpotlightPosition[] = ["top-left", "top-center", "top-right"];
  return options[seed % options.length];
}

function pickGradient(seed: number): GradientDirection {
  const options: GradientDirection[] = ["135deg", "45deg", "225deg"];
  return options[(seed >> 1) % options.length];
}

function pickHeroAlign(seed: number): "center" | "left" {
  return (seed >> 2) % 2 === 0 ? "center" : "left";
}

function phoneTel(phone: string): string {
  return phone.replace(/\D/g, "");
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

function serviceEntries(audit: SiteAudit): Array<{ name: string; reason: string }> {
  const reasons = Object.values(audit.dimensions).map((dimension) => dimension.reason);
  return audit.brand.services.slice(0, 6).map((service, index) => ({
    name: service,
    reason: reasons[index % reasons.length] ?? "Built for impact and clarity.",
  }));
}

function spotlightClass(position: SpotlightPosition): string {
  if (position === "top-left") return "spotlight-top-left";
  if (position === "top-right") return "spotlight-top-right";
  return "spotlight-top-center";
}

function patchPackageJson(files: Record<string, string>): void {
  const pkg = JSON.parse(files["package.json"]) as {
    dependencies: Record<string, string>;
  };
  pkg.dependencies["framer-motion"] = "11.3.8";
  pkg.dependencies.clsx = "2.1.1";
  pkg.dependencies["tailwind-merge"] = "2.4.0";
  files["package.json"] = JSON.stringify(pkg, null, 2);
}

function buildUtils(): string {
  return `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
}

function buildMovingBorderButton(): string {
  return `import * as React from "react";
import { cn } from "@/lib/utils";

type MovingBorderButtonProps = {
  children: React.ReactNode;
  href?: string;
  className?: string;
};

export function MovingBorderButton({
  children,
  href,
  className,
}: MovingBorderButtonProps) {
  const inner = (
    <span className="relative z-10 block rounded-[calc(var(--radius-md)-2px)] bg-[var(--color-background)] px-8 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text)]">
      {children}
    </span>
  );

  const wrapperClass = cn(
    "moving-border-button relative inline-flex rounded-[var(--radius-md)] p-[2px]",
    className,
  );

  if (href) {
    return (
      <a href={href} className={wrapperClass}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" className={wrapperClass}>
      {inner}
    </button>
  );
}
`;
}

function buildSpotlightHero(
  audit: SiteAudit,
  brief: DesignBrief,
  cta: string,
  ctaHref: string,
  spotlight: SpotlightPosition,
  gradient: GradientDirection,
  align: "center" | "left",
): string {
  const alignClass =
    align === "center"
      ? "items-center text-center"
      : "items-start text-left";

  return `"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MovingBorderButton } from "@/components/ui/MovingBorderButton";

export function SpotlightHero() {
  const reduced = useReducedMotion();
  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <section
      className={\`spotlight-hero ${spotlightClass(spotlight)} relative flex min-h-screen flex-col justify-center px-6 py-24 ${alignClass}\`}
      style={{ ["--gradient-angle" as string]: "${gradient}" }}
    >
      <motion.div
        className={\`relative z-10 mx-auto flex max-w-5xl flex-col gap-8 ${alignClass}\`}
        {...motionProps}
      >
        <p className="text-xs uppercase tracking-[0.45em] text-[var(--color-secondary)]">
          ${JSON.stringify(audit.category)}
        </p>
        <h1 className="gradient-heading max-w-4xl text-5xl font-bold leading-[1.05] md:text-7xl lg:text-8xl">
          ${JSON.stringify(audit.businessName)}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-text)]/80 md:text-xl">
          ${JSON.stringify(brief.voice)}
        </p>
        <div className="pt-2">
          <MovingBorderButton href=${JSON.stringify(ctaHref)}>
            ${JSON.stringify(cta)}
          </MovingBorderButton>
        </div>
      </motion.div>
    </section>
  );
}
`;
}

function buildAnimatedCard(): string {
  return `import { cn } from "@/lib/utils";

type AnimatedCardProps = {
  title: string;
  body: string;
  className?: string;
};

export function AnimatedCard({ title, body, className }: AnimatedCardProps) {
  return (
    <article
      className={cn(
        "glass-card rounded-[var(--radius-lg)] border border-white/10 p-6 shadow-[0_0_40px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      <h3 className="mb-3 text-xl font-semibold gradient-heading">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--color-text)]/75">{body}</p>
    </article>
  );
}
`;
}

function buildBackgroundBeams(): string {
  return `export function BackgroundBeams() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-40"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="beam-path beam-path-a"
          d="M0 120 C 300 40, 600 220, 900 80 S 1200 180, 1200 180"
          stroke="url(#beamGradient)"
          strokeWidth="1.5"
        />
        <path
          className="beam-path beam-path-b"
          d="M0 420 C 250 520, 550 300, 850 460 S 1200 560, 1200 560"
          stroke="url(#beamGradient)"
          strokeWidth="1.5"
        />
        <path
          className="beam-path beam-path-c"
          d="M0 680 C 320 600, 640 760, 960 640 S 1200 700, 1200 700"
          stroke="url(#beamGradient)"
          strokeWidth="1.5"
        />
        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
            <stop offset="50%" stopColor="var(--color-secondary)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
`;
}

function buildHeroSection(): string {
  return `import { SpotlightHero } from "@/components/ui/SpotlightHero";

export function HeroSection() {
  return <SpotlightHero />;
}
`;
}

function buildServicesSection(entries: Array<{ name: string; reason: string }>): string {
  return `"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCard } from "@/components/ui/AnimatedCard";

const items = [
${entries
  .map(
    (entry) =>
      `  { title: ${JSON.stringify(entry.name)}, body: ${JSON.stringify(entry.reason)} },`,
  )
  .join("\n")}
];

export function ServicesSection() {
  const reduced = useReducedMotion();
  const containerProps = reduced
    ? {}
    : {
        initial: "hidden",
        whileInView: "show",
        viewport: { once: true, amount: 0.15 },
        variants: {
          hidden: {},
          show: { transition: { staggerChildren: 0.12 } },
        },
      };

  const itemProps = reduced
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 28 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
          },
        },
      };

  return (
    <section id="services" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[var(--color-secondary)]">
            Capabilities
          </p>
          <h2 className="gradient-heading text-4xl font-bold md:text-5xl">Services</h2>
        </div>
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          {...containerProps}
        >
          {items.map((item) => (
            <motion.div key={item.title} {...itemProps}>
              <AnimatedCard title={item.title} body={item.body} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
`;
}

function buildContactSection(audit: SiteAudit): string {
  const address = audit.brand.address ?? "Miami, FL";

  return `export function ContactSection() {
  return (
    <section id="contact" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <div className="glass-card rounded-[var(--radius-lg)] border border-white/10 p-10 text-center shadow-[0_0_60px_rgba(0,0,0,0.35)]">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[var(--color-secondary)]">
            Connect
          </p>
          <h2 className="mb-8 gradient-heading text-4xl font-bold md:text-5xl">Contact</h2>
          <div className="space-y-5 text-lg text-[var(--color-text)]/85">
            <p>${JSON.stringify(address)}</p>
            ${
              audit.brand.phone
                ? `<p>
              <a href=${JSON.stringify(`tel:${phoneTel(audit.brand.phone)}`)} className="font-medium text-[var(--color-secondary)] hover:opacity-80">
                ${JSON.stringify(audit.brand.phone)}
              </a>
            </p>`
                : ""
            }
            ${
              audit.brand.email
                ? `<p>
              <a href=${JSON.stringify(`mailto:${audit.brand.email}`)} className="font-medium text-[var(--color-secondary)] hover:opacity-80">
                ${JSON.stringify(audit.brand.email)}
              </a>
            </p>`
                : ""
            }
            <p>
              <a
                href=${JSON.stringify(mapsUrl(address))}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
              >
                Open in Google Maps →
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
`;
}

function buildPage(audit: SiteAudit): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": schemaTypeForCategory(audit.category),
    name: audit.businessName,
    description: audit.brand.tagline,
    telephone: audit.brand.phone ?? undefined,
    email: audit.brand.email ?? undefined,
    url: "https://stylus.vercel.app",
    areaServed: "Miami, FL",
  };

  return `import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { ContactSection } from "@/components/ContactSection";
import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";

const jsonLd = ${JSON.stringify(jsonLd, null, 2)};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text)]">
        <BackgroundBeams />
        <HeroSection />
        <ServicesSection />
        <ContactSection />
        <footer className="relative border-t border-white/10 px-6 py-8 text-center text-sm text-[var(--color-text)]/45">
          © {new Date().getFullYear()} ${JSON.stringify(audit.businessName)} · Miami, FL
        </footer>
      </div>
    </>
  );
}
`;
}

function buildGlobalsCss(tokens: BrandTokens, gradient: GradientDirection): string {
  const background =
    tokens.colors.find((color) => color.role === "background")?.value ?? "#0a0a12";

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");

${tokensToCssVars(tokens)}

:root {
  --color-background: ${background};
  --gradient-angle: ${gradient};
}

@layer base {
  body {
    font-family: var(--font-body, "Inter", sans-serif);
    background-color: var(--color-background);
    color: var(--color-text);
  }
}

.gradient-heading {
  background: linear-gradient(var(--gradient-angle), var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
}

.spotlight-top-left {
  background:
    radial-gradient(ellipse 80% 55% at 15% 0%, color-mix(in srgb, var(--color-primary) 28%, transparent), transparent 70%),
    var(--color-background);
}

.spotlight-top-center {
  background:
    radial-gradient(ellipse 80% 55% at 50% 0%, color-mix(in srgb, var(--color-primary) 28%, transparent), transparent 70%),
    var(--color-background);
}

.spotlight-top-right {
  background:
    radial-gradient(ellipse 80% 55% at 85% 0%, color-mix(in srgb, var(--color-primary) 28%, transparent), transparent 70%),
    var(--color-background);
}

.moving-border-button::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  background: conic-gradient(
    from 0deg,
    var(--color-primary),
    var(--color-secondary),
    var(--color-primary)
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: rotate-border 4s linear infinite;
}

@keyframes rotate-border {
  to {
    transform: rotate(360deg);
  }
}

.beam-path {
  stroke-dasharray: 1200;
  stroke-dashoffset: 1200;
  animation: beam-draw 8s ease-in-out infinite;
}

.beam-path-b {
  animation-delay: 1.5s;
}

.beam-path-c {
  animation-delay: 3s;
}

@keyframes beam-draw {
  0%, 100% {
    stroke-dashoffset: 1200;
    opacity: 0.25;
  }
  50% {
    stroke-dashoffset: 0;
    opacity: 0.85;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .moving-border-button::before {
    animation: none;
  }

  .beam-path {
    animation: none;
    stroke-dashoffset: 0;
  }
}
`;
}

function ctaLabel(audit: SiteAudit, seed: number): string {
  const lower = audit.category.toLowerCase();
  const options =
    lower.includes("restaurant") ||
    lower.includes("cafe") ||
    lower.includes("bar")
      ? ["Book now", "Call now", "Get started"]
      : ["Get started", "Launch", "Explore"];

  return options[seed % options.length] ?? audit.brand.tagline;
}

export async function buildAnimatedLandingVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
): Promise<GeneratedVariant> {
  const seed = animatedSeed(audit, tokens);
  const spotlight = pickSpotlight(seed);
  const gradient = pickGradient(seed);
  const align = pickHeroAlign(seed);
  const cta = ctaLabel(audit, seed);
  const ctaHref =
    audit.brand.phone && /call/i.test(cta)
      ? `tel:${phoneTel(audit.brand.phone)}`
      : "#contact";
  const entries = serviceEntries(audit);

  const animatedBrief: DesignBrief = {
    ...brief,
    archetype:
      brief.archetype === "playful" || brief.archetype === "tech"
        ? brief.archetype
        : "tech",
  };

  const files = buildBaseScaffold({
    businessName: audit.businessName,
    library: "aceternity",
    tokens,
    brief: animatedBrief,
  });

  patchPackageJson(files);

  files["lib/utils.ts"] = buildUtils();
  files["components/ui/MovingBorderButton.tsx"] = buildMovingBorderButton();
  files["components/ui/SpotlightHero.tsx"] = buildSpotlightHero(
    audit,
    brief,
    cta,
    ctaHref,
    spotlight,
    gradient,
    align,
  );
  files["components/ui/AnimatedCard.tsx"] = buildAnimatedCard();
  files["components/ui/BackgroundBeams.tsx"] = buildBackgroundBeams();
  files["components/HeroSection.tsx"] = buildHeroSection();
  files["components/ServicesSection.tsx"] = buildServicesSection(entries);
  files["components/ContactSection.tsx"] = buildContactSection(audit);
  files["app/page.tsx"] = buildPage(audit);
  files["app/globals.css"] = buildGlobalsCss(tokens, gradient);

  return {
    files,
    library: "aceternity",
    archetype: "tech",
    businessName: audit.businessName,
    variantLabel: "Animated",
    differentiationRationale: `${brief.differentiationVector} Framer Motion animation and dark glassmorphism deliver high visual impact for tech and experience-driven brands.`,
    tokensJson: tokensToW3C(tokens),
    previewHtml: renderFromAudit({ ...audit, brandTier: "generic" }),
  };
}

import { buildBaseScaffold } from "@/lib/generate/scaffold";
import { tokensToCssVars, tokensToW3C } from "@/lib/generate/tokens";
import type {
  BrandTokens,
  DesignBrief,
  GeneratedVariant,
  SiteAudit,
} from "@/lib/schema";
import { renderFromAudit } from "@/lib/template/singlePage";

function editorialSeed(audit: SiteAudit): number {
  let seed = audit.businessName.length + audit.overallScore;
  for (let i = 0; i < audit.businessName.length; i++) {
    seed = (seed * 31 + audit.businessName.charCodeAt(i)) | 0;
  }
  return Math.abs(seed);
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

function phoneTel(phone: string): string {
  return phone.replace(/\D/g, "");
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function fontFamily(
  tokens: BrandTokens,
  role: "display" | "body",
  fallback: string,
): string {
  const match = tokens.fonts.find((font) => font.role === role);
  return match?.family ?? fallback;
}

function googleFontImport(tokens: BrandTokens): string {
  const display = fontFamily(tokens, "display", "Playfair Display");
  const body = fontFamily(tokens, "body", "Inter");
  const families: string[] = [];

  if (!/georgia|times|courier|system-ui/i.test(display)) {
    families.push(
      `family=${encodeURIComponent(display.replace(/ /g, "+"))}:wght@400;700`,
    );
  }
  if (body !== display && !/georgia|times|courier|system-ui/i.test(body)) {
    families.push(
      `family=${encodeURIComponent(body.replace(/ /g, "+"))}:wght@400;500;600`,
    );
  }

  if (families.length === 0) {
    return `@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap");`;
  }

  return `@import url("https://fonts.googleapis.com/css2?family=${families.join("&family=")}&display=swap");`;
}

function ctaLabel(audit: SiteAudit, seed: number): string {
  const lower = audit.category.toLowerCase();
  const options =
    lower.includes("restaurant") ||
    lower.includes("cafe") ||
    lower.includes("bar") ||
    lower.includes("food")
      ? ["Reserve a table", "Call now", "Order online"]
      : lower.includes("shop") || lower.includes("retail")
        ? ["Visit the store", "Call now", "Browse products"]
        : ["Get in touch", "Call now", "Learn more"];

  return options[seed % options.length] ?? audit.brand.tagline;
}

function serviceEntries(audit: SiteAudit): Array<{ name: string; reason: string }> {
  const reasons = Object.values(audit.dimensions).map((dimension) => dimension.reason);
  return audit.brand.services.slice(0, 6).map((service, index) => ({
    name: service,
    reason: reasons[index % reasons.length] ?? "Quality you can count on.",
  }));
}

function buildUtils(): string {
  return `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
}

function buildButton(): string {
  return `import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-[var(--color-background)] hover:opacity-90",
        outline:
          "border border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10",
        ghost:
          "text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10",
        link:
          "text-[var(--color-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
`;
}

function buildCard(): string {
  return `import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[var(--radius-md)] border border-[var(--color-border)]/20 bg-[var(--color-background)]/80 text-[var(--color-text)] shadow-sm transition-shadow duration-200 motion-reduce:transition-none",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-[family-name:var(--font-display)] text-xl font-semibold leading-none tracking-tight text-[var(--color-primary)]",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 text-sm leading-relaxed opacity-90", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
`;
}

function buildNavBar(audit: SiteAudit): string {
  const phoneBlock = audit.brand.phone
    ? `<a
          href=${JSON.stringify(`tel:${phoneTel(audit.brand.phone)}`)}
          className="hidden rounded-full border border-[var(--color-primary)]/30 px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition-colors duration-200 hover:bg-[var(--color-primary)]/10 motion-reduce:transition-none sm:inline-flex"
        >
          ${JSON.stringify(audit.brand.phone)}
        </a>`
    : "";

  return `import Link from "next/link";

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)]/15 bg-[var(--color-background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-wide text-[var(--color-primary)]"
        >
          ${JSON.stringify(audit.businessName)}
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link href="#services" className="text-[var(--color-text)]/80 transition-opacity hover:opacity-100">
            Services
          </Link>
          <Link href="#about" className="text-[var(--color-text)]/80 transition-opacity hover:opacity-100">
            About
          </Link>
          <Link href="#contact" className="text-[var(--color-text)]/80 transition-opacity hover:opacity-100">
            Contact
          </Link>
        </nav>
        ${phoneBlock}
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
  centered: boolean,
): string {
  const layoutClass = centered
    ? "items-center text-center"
    : "items-start text-left";
  const ctaHref =
    audit.brand.phone && /call/i.test(cta)
      ? `tel:${phoneTel(audit.brand.phone)}`
      : "#contact";
  const phoneCta = `<a
            href=${JSON.stringify(ctaHref)}
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-8 text-base font-medium text-[var(--color-background)] transition-opacity duration-200 hover:opacity-90 motion-reduce:transition-none"
          >
            ${JSON.stringify(cta)}
          </a>`;

  return `import Link from "next/link";

export function HeroSection() {
  return (
    <section className="border-b border-[var(--color-border)]/10 bg-[var(--color-background)] px-6 py-24 md:py-32 lg:py-40">
      <div className={\`mx-auto flex max-w-5xl flex-col gap-8 ${layoutClass}\`}>
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-secondary)]">
          ${JSON.stringify(audit.category)}
        </p>
        <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] text-[var(--color-primary)] md:text-7xl lg:text-8xl">
          ${JSON.stringify(audit.businessName)}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-text)]/85 md:text-xl">
          ${JSON.stringify(brief.voice)}
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          ${phoneCta}
          <Link
            href="#services"
            className="text-sm font-medium text-[var(--color-primary)] underline-offset-4 transition-opacity duration-200 hover:underline motion-reduce:transition-none"
          >
            Learn more ↓
          </Link>
        </div>
        ${
          audit.brand.phone
            ? `<p className="text-sm text-[var(--color-text)]/60">
            <a href=${JSON.stringify(`tel:${phoneTel(audit.brand.phone)}`)} className="hover:text-[var(--color-primary)]">
              Tap to call ${JSON.stringify(audit.brand.phone)}
            </a>
          </p>`
            : ""
        }
      </div>
    </section>
  );
}
`;
}

function buildServicesSection(
  entries: Array<{ name: string; reason: string }>,
  gridLayout: boolean,
): string {
  const cards = entries
    .map(
      (entry) => gridLayout
        ? `<Card className="border-l-4 border-l-[var(--color-primary)]">
            <CardHeader>
              <CardTitle>${JSON.stringify(entry.name)}</CardTitle>
            </CardHeader>
            <CardContent>${JSON.stringify(entry.reason)}</CardContent>
          </Card>`
        : `<Card className="border-l-4 border-l-[var(--color-primary)]">
            <div className="flex flex-col gap-3 p-6 md:flex-row md:items-start md:gap-8">
              <CardTitle className="min-w-[10rem]">${JSON.stringify(entry.name)}</CardTitle>
              <CardContent className="p-0">${JSON.stringify(entry.reason)}</CardContent>
            </div>
          </Card>`,
    )
    .join("\n        ");

  const layoutClass = gridLayout
    ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
    : "flex flex-col gap-6";

  return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function ServicesSection() {
  return (
    <section id="services" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--color-secondary)]">
            What we offer
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--color-primary)] md:text-5xl">
            Services
          </h2>
        </div>
        <div className="${layoutClass}">
        ${cards}
        </div>
      </div>
    </section>
  );
}
`;
}

function buildContactSection(audit: SiteAudit): string {
  const address = audit.brand.address ?? "Miami, FL";
  const mapsLink = mapsUrl(address);

  return `export function ContactSection() {
  return (
    <section id="contact" className="border-t border-[var(--color-border)]/10 bg-[var(--color-background)] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--color-secondary)]">
          Visit us
        </p>
        <h2 className="mb-10 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--color-primary)] md:text-5xl">
          Contact
        </h2>
        <div className="space-y-6 text-lg leading-relaxed text-[var(--color-text)]/90">
          <p>${JSON.stringify(address)}</p>
          ${
            audit.brand.phone
              ? `<p>
            <a
              href=${JSON.stringify(`tel:${phoneTel(audit.brand.phone)}`)}
              className="font-medium text-[var(--color-primary)] transition-opacity hover:opacity-80"
            >
              ${JSON.stringify(audit.brand.phone)}
            </a>
          </p>`
              : ""
          }
          ${
            audit.brand.email
              ? `<p>
            <a
              href=${JSON.stringify(`mailto:${audit.brand.email}`)}
              className="font-medium text-[var(--color-primary)] transition-opacity hover:opacity-80"
            >
              ${JSON.stringify(audit.brand.email)}
            </a>
          </p>`
              : ""
          }
          <p>
            <a
              href=${JSON.stringify(mapsLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              Open in Google Maps →
            </a>
          </p>
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
    address: audit.brand.address
      ? {
          "@type": "PostalAddress",
          streetAddress: audit.brand.address,
          addressLocality: "Miami",
          addressRegion: "FL",
          addressCountry: "US",
        }
      : undefined,
    telephone: audit.brand.phone ?? undefined,
    email: audit.brand.email ?? undefined,
    url: "https://stylus.vercel.app",
    priceRange: "$$",
    areaServed: "Miami, FL",
  };

  return `import { ContactSection } from "@/components/ContactSection";
import { HeroSection } from "@/components/HeroSection";
import { NavBar } from "@/components/NavBar";
import { ServicesSection } from "@/components/ServicesSection";

const jsonLd = ${JSON.stringify(jsonLd, null, 2)};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <main>
        <HeroSection />
        <section id="about" className="px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-lg leading-relaxed text-[var(--color-text)]/80">
              ${JSON.stringify(audit.brand.tagline)}
            </p>
          </div>
        </section>
        <ServicesSection />
        <ContactSection />
      </main>
      <footer className="border-t border-[var(--color-border)]/10 px-6 py-8 text-center text-sm text-[var(--color-text)]/50">
        © {new Date().getFullYear()} ${JSON.stringify(audit.businessName)} · Miami, FL
      </footer>
    </>
  );
}
`;
}

function buildGlobalsCss(tokens: BrandTokens): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

${googleFontImport(tokens)}

${tokensToCssVars(tokens)}

:root {
  --color-border: color-mix(in srgb, var(--color-primary) 24%, var(--color-text));
}

@layer base {
  body {
    font-family: var(--font-body);
    background-color: var(--color-background);
    color: var(--color-text);
  }

  h1, h2, h3, h4 {
    font-family: var(--font-display);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
}

export async function buildEditorialVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
): Promise<GeneratedVariant> {
  const seed = editorialSeed(audit);
  const heroCentered = seed % 2 === 0;
  const servicesGrid = (seed >> 1) % 2 === 0;
  const cta = ctaLabel(audit, seed);
  const entries = serviceEntries(audit);

  const editorialBrief: DesignBrief = {
    ...brief,
    archetype:
      brief.archetype === "luxury" || brief.archetype === "editorial"
        ? brief.archetype
        : "editorial",
  };

  const files = buildBaseScaffold({
    businessName: audit.businessName,
    library: "shadcn",
    tokens,
    brief: editorialBrief,
  });

  files["lib/utils.ts"] = buildUtils();
  files["components/ui/Button.tsx"] = buildButton();
  files["components/ui/Card.tsx"] = buildCard();
  files["components/NavBar.tsx"] = buildNavBar(audit);
  files["components/HeroSection.tsx"] = buildHeroSection(
    audit,
    brief,
    cta,
    heroCentered,
  );
  files["components/ServicesSection.tsx"] = buildServicesSection(
    entries,
    servicesGrid,
  );
  files["components/ContactSection.tsx"] = buildContactSection(audit);
  files["app/page.tsx"] = buildPage(audit);
  files["app/globals.css"] = buildGlobalsCss(tokens);

  return {
    files,
    library: "shadcn",
    archetype: "editorial",
    businessName: audit.businessName,
    variantLabel: "Editorial",
    differentiationRationale: `${brief.differentiationVector} shadcn/ui with serif typography delivers editorial restraint and long-term maintainability.`,
    tokensJson: tokensToW3C(tokens),
    previewHtml: renderFromAudit(audit),
  };
}

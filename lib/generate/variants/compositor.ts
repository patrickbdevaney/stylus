import {
  buildContact,
  buildHero,
  buildNav,
  buildServices,
  tokensToSectionTokens,
  type SectionContent,
  type SectionTokens,
} from "@/lib/generate/sections";
import { buildBaseScaffold } from "@/lib/generate/scaffold";
import { tokensToCssVars, tokensToW3C } from "@/lib/generate/tokens";
import {
  GeneratedVariantSchema,
  type BrandTokens,
  type DesignBrief,
  type EnrichmentContext,
  type GeneratedVariant,
  type SiteAudit,
} from "@/lib/schema";
import { escapeHtml } from "@/lib/template/singlePage";

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

function schemaJsonLd(content: SectionContent): string {
  const jsonLdRaw: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaTypeForCategory(content.category),
    name: content.businessName,
    description: content.tagline,
    address: content.address
      ? {
          "@type": "PostalAddress",
          streetAddress: content.address,
          addressLocality: "Miami",
          addressRegion: "FL",
          addressCountry: "US",
        }
      : undefined,
    telephone: content.phone ?? undefined,
    email: content.email ?? undefined,
    url: "https://stylus.vercel.app",
    priceRange: "$$",
    areaServed: "Miami, FL",
    sameAs: [],
  };

  const jsonLd = Object.fromEntries(
    Object.entries(jsonLdRaw).filter(([, value]) => value !== undefined),
  );

  return JSON.stringify(jsonLd, null, 2);
}

function previewCss(tokens: BrandTokens, tok: SectionTokens): string {
  return `${tokensToCssVars(tokens)}
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: ${JSON.stringify(tok.bodyFont)}, var(--font-body), system-ui, sans-serif;
  background: var(--color-background, ${tok.background});
  color: var(--color-text, ${tok.text});
  line-height: 1.6;
}
a { color: inherit; }
h1, h2, h3 { font-family: ${JSON.stringify(tok.displayFont)}, var(--font-display), serif; }
nav { width: 100%; }
section { max-width: 72rem; margin-left: auto; margin-right: auto; }
footer { max-width: 72rem; margin-left: auto; margin-right: auto; }
`;
}

function injectJsonLd(layoutSource: string, jsonLd: string): string {
  const script = `<script type="application/ld+json">${jsonLd}</script>`;
  return layoutSource.replace("</head>", `        ${script}\n      </head>`);
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
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-[var(--color-background)] hover:opacity-90",
        outline:
          "border border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10",
      },
      size: {
        default: "h-11 px-6 py-2",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: cn(classes, (children as React.ReactElement<{ className?: string }>).props.className),
      });
    }
    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    );
  },
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
      "rounded-[var(--radius-md)] border border-[var(--color-border)]/20 bg-[var(--color-background)]/80 text-[var(--color-text)] shadow-sm",
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

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 text-sm leading-relaxed opacity-90", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardContent };
`;
}

function buildMovingBorder(): string {
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

function buildSectionContent(
  audit: SiteAudit,
  brief: DesignBrief,
  enrichment?: EnrichmentContext,
): SectionContent {
  const serviceNames =
    audit.brand.services.length > 0
      ? audit.brand.services
      : ["Our Services", "About Us", "Contact"];

  return {
    businessName: audit.businessName,
    tagline: audit.brand.tagline,
    phone: audit.brand.phone,
    address: audit.brand.address,
    email: audit.brand.email,
    primaryAction: brief.primaryAction,
    services: serviceNames.map((name, index) => ({
      name,
      description:
        audit.topFixes[index % audit.topFixes.length] ??
        "Quality service for Miami.",
    })),
    about: `${audit.businessName} — ${audit.brand.tagline}. ${brief.voice}.`,
    category: audit.category,
    reviewCount: enrichment?.googleReviewCount ?? null,
    yearsOperating: enrichment?.yearsOperating ?? null,
  };
}

export function composeVariant(
  audit: SiteAudit,
  tokens: BrandTokens,
  brief: DesignBrief,
  enrichment?: EnrichmentContext,
): GeneratedVariant {
  const tok = tokensToSectionTokens(tokens, brief);
  const content = buildSectionContent(audit, brief, enrichment);

  const nav = buildNav(brief.navType, content, tok);
  const hero = buildHero(brief.heroType, content, tok);
  const services = buildServices(brief.servicesType, content, tok);
  const contact = buildContact(brief.contactType, content, tok);

  const jsonLd = schemaJsonLd(content);

  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(content.tagline)}">
<title>${escapeHtml(content.businessName)} | ${escapeHtml(content.category)}</title>
<style>
${previewCss(tokens, tok)}
</style>
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
${nav.html}
${hero.html}
${services.html}
${contact.html}
<footer style="text-align:center;padding:2rem;opacity:.5;font-size:.85rem">
  © ${new Date().getFullYear()} ${escapeHtml(content.businessName)} · Miami, FL
</footer>
</body>
</html>`;

  const baseFiles = buildBaseScaffold({
    businessName: audit.businessName,
    library: brief.library,
    tokens,
    brief,
  });

  const allImports = [
    ...nav.imports,
    ...hero.imports,
    ...services.imports,
    ...contact.imports,
  ].filter((value, index, array) => array.indexOf(value) === index);

  const pageTsx = `"use client";
${allImports.join("\n")}
import { NavBar } from "@/components/NavBar";
import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";
import { ContactSection } from "@/components/ContactSection";

export default function Home() {
  return (
    <main>
      <NavBar />
      <HeroSection />
      <ServicesSection />
      <ContactSection />
    </main>
  );
}
`;

  const files: Record<string, string> = {
    ...baseFiles,
    "app/page.tsx": pageTsx,
    "app/layout.tsx": injectJsonLd(baseFiles["app/layout.tsx"] ?? "", jsonLd),
    "components/NavBar.tsx": nav.tsx,
    "components/HeroSection.tsx": hero.tsx,
    "components/ServicesSection.tsx": services.tsx,
    "components/ContactSection.tsx": contact.tsx,
    "tokens.json": tokensToW3C(tokens),
  };

  if (brief.library === "shadcn") {
    files["lib/utils.ts"] = buildUtils();
    files["components/ui/button.tsx"] = buildButton();
    files["components/ui/card.tsx"] = buildCard();
  }

  if (brief.library === "aceternity" && brief.motionLevel === "rich") {
    files["lib/utils.ts"] = buildUtils();
    files["components/ui/moving-border.tsx"] = buildMovingBorder();
    files["components/ui/background-beams.tsx"] = buildBackgroundBeams();
  }

  return GeneratedVariantSchema.parse({
    files,
    library: brief.library,
    archetype: brief.archetype,
    businessName: audit.businessName,
    variantLabel: brief.variantLabel,
    differentiationRationale: brief.differentiationVector,
    tokensJson: tokensToW3C(tokens),
    previewHtml,
  });
}

import type { SiteAudit } from "@/lib/schema";

const DEFAULT_PALETTE = ["#ff2d95", "#00f0ff", "#9d4edd", "#ff6b35", "#f0f0f0"];

export type TemplateFill = {
  businessName: string;
  category: string;
  tagline: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  services: { name: string; description: string }[];
  about: string;
  palette: string[];
  brandTier?: "iconic" | "established" | "generic";
  schemaType?: string;
};

function tierStructuralCss(): string {
  return `
    nav {
      position: sticky; top: 0; z-index: 10;
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.5rem;
      background: color-mix(in srgb, var(--bg) 92%, transparent);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    nav .logo {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--primary);
    }
    nav a { color: var(--secondary); text-decoration: none; font-size: 0.9rem; margin-left: 1.25rem; }
    nav .call-nav {
      margin-left: 1.25rem; padding: 0.4rem 1rem; border-radius: 4px;
      background: var(--primary); color: var(--bg); font-weight: 600;
    }
    .hero-badge {
      display: inline-block; padding: 0.35rem 1rem; border-radius: 999px;
      margin-bottom: 1.25rem; border: 1px solid var(--border);
      color: var(--secondary); font-size: 0.8rem;
      text-transform: uppercase; letter-spacing: 0.12em;
    }
    .about { padding: 5rem 1.5rem; }
    .about h2 {
      font-family: var(--font-display); font-size: 2rem;
      color: var(--primary); margin-bottom: 1.5rem; text-align: center;
    }
    .about-text {
      text-align: center; max-width: 640px; margin: 0 auto;
      opacity: 0.9; line-height: 1.7;
    }
    .map-link {
      display: inline-block; margin: 1rem 0; padding: 0.75rem 1.5rem;
      border-radius: 4px; border: 1px solid var(--secondary);
      color: var(--secondary); text-decoration: none; font-weight: 600;
    }
    .sticky-call {
      display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
      padding: 1rem; text-align: center; font-weight: 700;
      background: var(--primary); color: var(--bg); text-decoration: none;
    }
    @media (max-width: 600px) {
      nav .nav-links { display: none; }
      .sticky-call { display: block; }
      body { padding-bottom: 5rem; }
    }
  `;
}

function tierCss(fill: TemplateFill): string {
  const palette = fill.palette.length >= 2 ? fill.palette : DEFAULT_PALETTE;
  const primary = palette[0] ?? "#ff2d6b";
  const secondary = palette[1] ?? "#00ffe7";
  const tertiary = palette[2] ?? "#ffe600";
  const bg = palette[3] ?? "#0a0a0f";
  const text = palette[4] ?? "#f0f0f0";
  const tier = fill.brandTier ?? "generic";

  const base = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-body);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }
    .hero { min-height: 90vh; display: flex; flex-direction: column;
            justify-content: center; align-items: center; text-align: center;
            padding: 4rem 1.5rem; }
    .hero h1 { font-family: var(--font-display); font-size: clamp(2.5rem,7vw,5rem);
               color: var(--primary); margin-bottom: 1rem; }
    .hero p  { font-size: clamp(1rem,2.5vw,1.4rem); color: var(--text);
               max-width: 600px; opacity: 0.9; }
    .cta-btn { display: inline-block; margin-top: 2rem;
               padding: 1rem 2.5rem; border-radius: 4px;
               background: var(--primary); color: var(--bg);
               font-family: var(--font-display); font-size: 1.1rem;
               font-weight: 700; text-decoration: none;
               transition: opacity .2s; }
    .cta-btn:hover { opacity: .85; }
    .services { padding: 5rem 1.5rem; }
    .services h2 { font-family: var(--font-display); font-size: 2rem;
                   color: var(--primary); margin-bottom: 2rem; text-align: center; }
    .services-grid { display: grid; gap: 1.5rem;
                     grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .service-card { background: var(--card-bg); border-radius: 8px;
                    padding: 1.5rem; border: 1px solid var(--border); }
    .service-card h3 { color: var(--secondary); margin-bottom: .5rem; }
    .contact { padding: 4rem 1.5rem; text-align: center; }
    .contact h2 { font-family: var(--font-display); color: var(--primary);
                  margin-bottom: 1.5rem; }
    footer { text-align: center; padding: 2rem; font-size: .85rem; opacity: .5; }
    ${tierStructuralCss()}
  `;

  if (tier === "iconic") {
    return `
      :root {
        --primary:   ${primary};
        --secondary: ${secondary};
        --tertiary:  ${tertiary};
        --bg:        ${bg};
        --text:      ${text};
        --card-bg:   color-mix(in srgb, ${bg} 85%, ${primary});
        --border:    color-mix(in srgb, ${primary} 25%, transparent);
        --font-display: 'Playfair Display', 'Georgia', 'Times New Roman', serif;
        --font-body:    'Lora', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
      }
      ${base}
      body { background: var(--bg); }
      .hero { background: linear-gradient(160deg, var(--bg) 60%,
              color-mix(in srgb, var(--primary) 12%, var(--bg))); }
      .hero h1 {
        text-shadow: none;
        letter-spacing: .02em;
        border-bottom: 3px solid var(--primary);
        padding-bottom: .5rem;
      }
      .cta-btn { border-radius: 2px; letter-spacing: .08em; text-transform: uppercase; }
      .service-card { border-left: 4px solid var(--primary); border-radius: 2px; }
    `;
  }

  if (tier === "established") {
    return `
      :root {
        --primary:   ${primary};
        --secondary: ${secondary};
        --tertiary:  ${tertiary};
        --bg:        ${bg};
        --text:      ${text};
        --card-bg:   color-mix(in srgb, ${bg} 90%, ${primary});
        --border:    color-mix(in srgb, ${primary} 30%, transparent);
        --font-display: 'Inter', 'Helvetica Neue', Arial, sans-serif;
        --font-body:    'Inter', 'Helvetica Neue', Arial, sans-serif;
      }
      ${base}
      body {
        background: var(--bg);
        background-image:
          linear-gradient(30deg, color-mix(in srgb, var(--primary) 5%, transparent) 12.5%, transparent 12.5%, transparent 50%),
          linear-gradient(150deg, color-mix(in srgb, var(--secondary) 5%, transparent) 12.5%, transparent 12.5%, transparent 50%);
        background-size: 24px 44px;
      }
      .hero {
        background: linear-gradient(135deg, var(--bg),
                    color-mix(in srgb, var(--primary) 15%, var(--bg)));
      }
      .hero h1 {
        text-shadow: 0 0 30px color-mix(in srgb, var(--primary) 40%, transparent);
        letter-spacing: -.01em;
      }
      .cta-btn { border-radius: 6px; }
      .service-card {
        border-top: 3px solid var(--primary);
        box-shadow: 0 4px 20px color-mix(in srgb, var(--primary) 10%, transparent);
      }
    `;
  }

  return `
    :root {
      --primary:   ${primary};
      --secondary: ${secondary};
      --tertiary:  ${tertiary};
      --bg:        #0a0a0f;
      --text:      #f0f0f0;
      --card-bg:   #12121a;
      --border:    color-mix(in srgb, var(--primary) 35%, transparent);
      --font-display: 'Courier New', Courier, monospace;
      --font-body:    'Inter', 'Helvetica Neue', Arial, sans-serif;
    }
    ${base}
    body {
      background: var(--bg);
      background-image:
        linear-gradient(rgba(255,45,107,.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,45,107,.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .hero {
      background: radial-gradient(ellipse at 50% 0%,
        color-mix(in srgb, var(--primary) 18%, transparent) 0%,
        transparent 70%);
    }
    .hero h1 {
      text-shadow: 0 0 20px var(--primary), 0 0 60px var(--primary);
      letter-spacing: .04em;
    }
    .cta-btn {
      box-shadow: 0 0 20px var(--primary);
      border-radius: 3px;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .cta-btn:hover { box-shadow: 0 0 35px var(--primary); }
    .service-card {
      border: 1px solid var(--border);
      box-shadow: 0 0 15px color-mix(in srgb, var(--primary) 8%, transparent);
    }
    .service-card h3 {
      text-shadow: 0 0 8px var(--secondary);
    }
  `;
}

function tierFonts(tier: string | undefined): string {
  if (tier === "iconic") {
    return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:ital,wght@0,400;1,400&display=swap" rel="stylesheet">`;
  }
  if (tier === "established") {
    return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">`;
  }
  return "";
}

/** Deterministic template-fill from audit — no LLM, bounded and fast. */
export function fillTemplateFromAudit(audit: SiteAudit): TemplateFill {
  const services = (audit.brand.services.length
    ? audit.brand.services
    : ["Our Services", "About Us", "Contact"]
  ).map((name, i) => ({
    name,
    description: serviceDescription(name, audit, i),
  }));

  return {
    businessName: audit.businessName,
    category: audit.category,
    tagline: audit.brand.tagline,
    phone: audit.brand.phone,
    address: audit.brand.address,
    email: audit.brand.email,
    services,
    about: buildAboutCopy(audit),
    palette:
      audit.brand.palette.length >= 2 ? audit.brand.palette : DEFAULT_PALETTE,
    brandTier: audit.brandTier ?? "generic",
  };
}

function buildAboutCopy(audit: SiteAudit): string {
  const fixHint = audit.topFixes[0]
    ? ` We're focused on ${audit.topFixes[0].charAt(0).toLowerCase()}${audit.topFixes[0].slice(1)}`
    : "";
  return `${audit.businessName} is a ${audit.category.toLowerCase()} rooted in Miami — ${audit.brand.tagline}.${fixHint}. Locally owned, community driven, and built for the way Miami moves.`;
}

function serviceDescription(
  name: string,
  audit: SiteAudit,
  index: number,
): string {
  const fromFix = audit.topFixes[index % audit.topFixes.length];
  if (fromFix && index < audit.topFixes.length) {
    return fromFix.endsWith(".") ? fromFix : `${fromFix}.`;
  }
  return `Trusted ${name.toLowerCase()} for Miami locals and visitors alike.`;
}

export function renderFromAudit(audit: SiteAudit): string {
  return renderSinglePage(fillTemplateFromAudit(audit), audit);
}

function minimalAuditFromFill(fill: TemplateFill): SiteAudit {
  const dim = (score: number, reason: string) => ({ score, reason });
  return {
    businessName: fill.businessName,
    category: fill.category,
    overallScore: 50,
    dimensions: {
      clarity: dim(50, "Shell"),
      trust: dim(50, "Shell"),
      mobile: dim(50, "Shell"),
      speed: dim(50, "Shell"),
      conversion: dim(50, "Shell"),
      localSeo: dim(50, "Shell"),
    },
    topFixes: ["Contact us for details."],
    brand: {
      tagline: fill.tagline,
      phone: fill.phone,
      address: fill.address,
      email: fill.email,
      palette: fill.palette,
      services: fill.services.map((s) => s.name),
    },
    brandTier: fill.brandTier ?? "generic",
  };
}

export function renderEmptyShell(businessName = "Stylus Demo"): string {
  const fill: TemplateFill = {
    businessName,
    category: "Local business",
    tagline: "Miami's finest — coming soon",
    phone: null,
    address: null,
    email: null,
    services: [
      { name: "Services", description: "Quality you can count on." },
      { name: "About Us", description: "Proudly serving Miami." },
      { name: "Contact", description: "Reach out anytime." },
    ],
    about: `Welcome to ${businessName}. Proudly serving Miami with passion and style.`,
    palette: DEFAULT_PALETTE,
    brandTier: "generic",
  };
  return renderSinglePage(fill, minimalAuditFromFill(fill));
}

function schemaTypeForCategory(category: string, fallback?: string): string {
  const map: Record<string, string> = {
    restaurant: "Restaurant",
    food: "Restaurant",
    cafe: "CafeOrCoffeeShop",
    coffee: "CafeOrCoffeeShop",
    shop: "Store",
    retail: "Store",
    service: "LocalBusiness",
  };
  const lower = category?.toLowerCase() ?? "";
  if (map[lower]) return map[lower];
  for (const key of Object.keys(map)) {
    if (lower.includes(key)) return map[key];
  }
  return fallback || "LocalBusiness";
}

export function renderSinglePage(fill: TemplateFill, audit: SiteAudit): string {
  const tier = fill.brandTier ?? "generic";
  const palette = fill.palette.length >= 2 ? fill.palette : DEFAULT_PALETTE;
  const themeColor = palette[0] ?? "#ff2d6b";

  const telHref = fill.phone ? phoneTel(fill.phone) : null;

  const serviceItems = fill.services
    .map(
      (s) =>
        `<div class="service-card"><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description)}</p></div>`,
    )
    .join("\n");

  const heroCta = telHref
    ? `<a href="tel:${escapeHtml(telHref)}" class="cta-btn">Tap to call ${escapeHtml(fill.phone!)}</a>`
    : `<a href="#contact" class="cta-btn">Get in touch</a>`;

  const mapBlock = fill.address
    ? `<a href="${escapeHtml(mapsUrl(fill.address))}" target="_blank" rel="noopener" class="map-link">Get directions →</a>
       <p class="address">${escapeHtml(fill.address)}</p>`
    : `<p class="address">Miami, FL</p>`;

  const stickyCall = telHref
    ? `<a href="tel:${escapeHtml(telHref)}" class="sticky-call" aria-label="Call ${escapeHtml(fill.businessName)}">📞 Call now</a>`
    : "";

  const jsonLdRaw: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaTypeForCategory(
      fill.category || "local-business",
      fill.schemaType,
    ),
    name: fill.businessName,
    description: fill.tagline,
    address: fill.address
      ? {
          "@type": "PostalAddress",
          streetAddress: fill.address,
          addressLocality: "Miami",
          addressRegion: "FL",
          addressCountry: "US",
        }
      : undefined,
    telephone: fill.phone ?? undefined,
    email: fill.email ?? undefined,
    url: "https://stylus.vercel.app",
    priceRange: "$$",
    areaServed: "Miami, FL",
    sameAs: [],
  };

  const jsonLd = Object.fromEntries(
    Object.entries(jsonLdRaw).filter(([, v]) => v !== undefined),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(fill.tagline)}">
<meta property="og:title" content="${escapeHtml(fill.businessName)}">
<meta property="og:description" content="${escapeHtml(fill.tagline)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="${themeColor}">
<title>${escapeHtml(fill.businessName)} | ${escapeHtml(fill.category)} · Miami</title>
${tierFonts(tier)}
<style>${tierCss(fill)}</style>
<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
</head>
<body>
<nav>
  <span class="logo">${escapeHtml(fill.businessName)}</span>
  <div class="nav-links">
    <a href="#services">Services</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
    ${telHref ? `<a href="tel:${escapeHtml(telHref)}" class="call-nav">${escapeHtml(fill.phone!)}</a>` : ""}
  </div>
</nav>
<section class="hero">
  <span class="hero-badge">${escapeHtml(fill.category)} · Miami</span>
  <h1>${escapeHtml(fill.businessName)}</h1>
  <p>${escapeHtml(fill.tagline)}</p>
  ${heroCta}
</section>
<section id="services" class="services">
  <div class="container">
    <h2>Our Services</h2>
    <div class="services-grid">${serviceItems}</div>
  </div>
</section>
<section id="about" class="about">
  <div class="container">
    <h2>About Us</h2>
    <p class="about-text">${escapeHtml(fill.about)}</p>
  </div>
</section>
<section id="contact" class="contact">
  <h2>Get In Touch</h2>
  ${telHref ? `<p><a href="tel:${escapeHtml(telHref)}">${escapeHtml(fill.phone!)}</a></p>` : ""}
  ${fill.email ? `<p><a href="mailto:${escapeHtml(fill.email)}">${escapeHtml(fill.email)}</a></p>` : ""}
  ${mapBlock}
</section>
<footer>&copy; ${new Date().getFullYear()} ${escapeHtml(fill.businessName)} · Miami, FL</footer>
${stickyCall}
</body>
</html>`;
}

function phoneTel(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import type { SiteAudit } from "@/lib/schema";

const DEFAULT_PALETTE = ["#ff2d95", "#00f0ff", "#9d4edd", "#ff6b35"];

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
};

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
    palette: audit.brand.palette.length >= 2 ? audit.brand.palette : DEFAULT_PALETTE,
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
  return renderSinglePage(fillTemplateFromAudit(audit));
}

export function renderEmptyShell(businessName = "Stylus Demo"): string {
  return renderSinglePage({
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
  });
}

export function renderSinglePage(fill: TemplateFill): string {
  const [pink, cyan, purple, orange] = [
    ...fill.palette,
    ...DEFAULT_PALETTE,
  ].slice(0, 4);

  const telHref = fill.phone ? phoneTel(fill.phone) : null;

  const serviceItems = fill.services
    .map(
      (s) =>
        `<div class="card"><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description)}</p></div>`,
    )
    .join("\n");

  const heroCta = telHref
    ? `<a href="tel:${escapeHtml(telHref)}" class="cta">Tap to call ${escapeHtml(fill.phone!)}</a>`
    : `<a href="#contact" class="cta">Get in touch</a>`;

  const mapBlock = fill.address
    ? `<a href="${escapeHtml(mapsUrl(fill.address))}" target="_blank" rel="noopener" class="map-link">Get directions →</a>
       <p class="address">${escapeHtml(fill.address)}</p>`
    : `<p class="address">Miami, FL</p>`;

  const stickyCall = telHref
    ? `<a href="tel:${escapeHtml(telHref)}" class="sticky-call" aria-label="Call ${escapeHtml(fill.businessName)}">📞 Call now</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(fill.tagline)}">
<title>${escapeHtml(fill.businessName)} | ${escapeHtml(fill.category)} · Miami</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --night:#0a0a12;--pink:${pink};--cyan:${cyan};--purple:${purple};--orange:${orange};
  --glass:rgba(255,255,255,0.04);--border:rgba(0,240,255,0.25);
}
html{scroll-behavior:smooth}
body{
  font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
  background:var(--night);color:#e8e8f0;line-height:1.6;padding-bottom:4rem;
  background-image:
    linear-gradient(rgba(0,240,255,0.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,240,255,0.03) 1px,transparent 1px);
  background-size:40px 40px;
}
.palm{
  position:fixed;bottom:0;right:-20px;width:180px;height:220px;opacity:0.06;pointer-events:none;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'%3E%3Cpath fill='%2300f0ff' d='M50 120V60M50 60c-20-30-35-25-40-10 15-5 25 0 40 10M50 60c20-30 35-25 40-10-15-5-25 0-40 10M50 45c-10-25-25-20-30-5 10-3 18 0 30 5M50 45c10-25 25-20 30-5-10-3-18 0-30 5'/%3E%3C/svg%3E") no-repeat center/contain;
}
nav{
  position:sticky;top:0;z-index:10;
  display:flex;justify-content:space-between;align-items:center;
  padding:1rem 1.5rem;
  background:rgba(10,10,18,0.9);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.logo{font-weight:800;font-size:1.1rem;letter-spacing:0.05em;
  background:linear-gradient(90deg,var(--pink),var(--cyan));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
nav a{color:var(--cyan);text-decoration:none;font-size:0.9rem;margin-left:1.25rem}
nav .call-nav{
  margin-left:1.25rem;padding:0.4rem 1rem;border-radius:999px;
  background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;font-weight:600;
}
.hero{
  min-height:75vh;display:flex;flex-direction:column;justify-content:center;align-items:center;
  text-align:center;padding:4rem 1.5rem 5rem;
  background:linear-gradient(135deg,rgba(255,45,149,0.14) 0%,rgba(0,240,255,0.08) 45%,rgba(157,78,221,0.12) 100%);
  position:relative;overflow:hidden;
}
.hero::before{
  content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 0%,rgba(255,45,149,0.15),transparent 60%);
  pointer-events:none;
}
.hero-badge{
  display:inline-block;padding:0.35rem 1rem;border-radius:999px;margin-bottom:1.25rem;
  border:1px solid var(--border);color:var(--cyan);font-size:0.8rem;
  text-transform:uppercase;letter-spacing:0.12em;
}
.hero h1{
  position:relative;
  font-size:clamp(2.2rem,8vw,4.25rem);font-weight:900;text-transform:uppercase;
  letter-spacing:0.02em;line-height:1.05;margin-bottom:1rem;
  text-shadow:0 0 40px rgba(255,45,149,0.35);
}
.hero p{font-size:clamp(1rem,3vw,1.3rem);color:#a0a0b8;max-width:36rem;margin-bottom:2rem;position:relative}
.cta{
  position:relative;
  display:inline-block;padding:1rem 2.5rem;border-radius:999px;
  background:linear-gradient(135deg,var(--pink),var(--purple));
  color:#fff;font-weight:700;font-size:1.05rem;text-decoration:none;
  box-shadow:0 0 28px rgba(255,45,149,0.45);transition:transform 0.2s,box-shadow 0.2s;
}
.cta:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(255,45,149,0.55)}
section{padding:4rem 1.5rem;max-width:960px;margin:0 auto}
section h2{
  font-size:1.75rem;font-weight:800;margin-bottom:2rem;text-align:center;
  background:linear-gradient(90deg,var(--cyan),var(--orange));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.25rem}
.card{
  padding:1.5rem;border-radius:12px;
  background:var(--glass);border:1px solid var(--border);
  box-shadow:0 0 20px rgba(0,240,255,0.08);
  transition:border-color 0.2s,box-shadow 0.2s;
}
.card:hover{border-color:rgba(255,45,149,0.4);box-shadow:0 0 24px rgba(255,45,149,0.12)}
.card h3{color:var(--cyan);margin-bottom:0.5rem;font-size:1.1rem}
.card p{color:#8888a0;font-size:0.95rem;line-height:1.55}
.about-text{text-align:center;color:#a0a0b8;max-width:640px;margin:0 auto;font-size:1.05rem;line-height:1.7}
.contact{text-align:center}
.contact p{margin:0.5rem 0;color:#a0a0b8}
.contact a{color:var(--cyan);text-decoration:none}
.map-link{
  display:inline-block;margin:1rem 0;padding:0.75rem 1.5rem;border-radius:999px;
  border:1px solid var(--cyan);color:var(--cyan);text-decoration:none;font-weight:600;
}
.map-link:hover{background:rgba(0,240,255,0.1)}
.address{font-size:1.05rem}
.sticky-call{
  display:none;position:fixed;bottom:0;left:0;right:0;z-index:20;
  padding:1rem;text-align:center;font-weight:700;font-size:1.1rem;
  background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;text-decoration:none;
  box-shadow:0 -4px 24px rgba(255,45,149,0.4);
}
footer{
  text-align:center;padding:2rem 1.5rem 3rem;color:#55556a;font-size:0.85rem;
  border-top:1px solid rgba(255,255,255,0.06);
}
@media(max-width:600px){
  nav .nav-links{display:none}
  .hero h1{font-size:2rem}
  .sticky-call{display:block}
  body{padding-bottom:5rem}
}
@media(min-width:601px){nav .call-nav{display:inline-block}}
</style>
</head>
<body>
<div class="palm" aria-hidden="true"></div>
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
<section id="services">
  <h2>Our Services</h2>
  <div class="grid">${serviceItems}</div>
</section>
<section id="about">
  <h2>About Us</h2>
  <p class="about-text">${escapeHtml(fill.about)}</p>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

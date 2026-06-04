import type { SiteAudit } from "@/lib/schema";

const DEFAULT_PALETTE = ["#ff2d95", "#00f0ff", "#9d4edd", "#ff6b35"];

type TemplateInput = {
  businessName: string;
  tagline?: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  services?: string[];
  palette?: string[];
};

export function renderShellSite(input: TemplateInput): string {
  const {
    businessName,
    tagline = "Miami's finest — coming soon",
    phone = null,
    address = null,
    email = null,
    services = ["Service One", "Service Two", "Service Three"],
    palette = DEFAULT_PALETTE,
  } = input;

  const [pink, cyan, purple, orange] = palette;

  const serviceItems = services
    .map(
      (s) =>
        `<div class="card"><h3>${escapeHtml(s)}</h3><p>Quality you can count on.</p></div>`,
    )
    .join("\n");

  const phoneCta = phone
    ? `<a href="tel:${escapeHtml(phone)}" class="cta">${escapeHtml(phone)}</a>`
    : `<span class="cta cta-muted">Call us today</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(businessName)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --night:#0a0a12;--pink:${pink};--cyan:${cyan};--purple:${purple};--orange:${orange};
  --glass:rgba(255,255,255,0.04);--border:rgba(0,240,255,0.25);
}
html{scroll-behavior:smooth}
body{
  font-family:system-ui,-apple-system,sans-serif;
  background:var(--night);color:#e8e8f0;line-height:1.6;
  background-image:
    linear-gradient(rgba(0,240,255,0.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,240,255,0.03) 1px,transparent 1px);
  background-size:40px 40px;
}
nav{
  position:sticky;top:0;z-index:10;
  display:flex;justify-content:space-between;align-items:center;
  padding:1rem 1.5rem;
  background:rgba(10,10,18,0.85);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.logo{font-weight:800;font-size:1.1rem;letter-spacing:0.05em;
  background:linear-gradient(90deg,var(--pink),var(--cyan));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
nav a{color:var(--cyan);text-decoration:none;font-size:0.9rem;margin-left:1.25rem}
.hero{
  min-height:70vh;display:flex;flex-direction:column;justify-content:center;align-items:center;
  text-align:center;padding:4rem 1.5rem;
  background:linear-gradient(135deg,rgba(255,45,149,0.12) 0%,rgba(0,240,255,0.08) 50%,rgba(157,78,221,0.1) 100%);
  position:relative;overflow:hidden;
}
.hero::after{
  content:"";position:absolute;bottom:-2px;left:0;right:0;height:120px;
  background:linear-gradient(transparent,var(--night));pointer-events:none;
}
.hero h1{
  font-size:clamp(2.5rem,8vw,4.5rem);font-weight:900;text-transform:uppercase;
  letter-spacing:0.02em;line-height:1.05;margin-bottom:1rem;
  text-shadow:0 0 30px rgba(255,45,149,0.4);
}
.hero p{font-size:clamp(1rem,3vw,1.35rem);color:#a0a0b8;max-width:36rem;margin-bottom:2rem}
.cta{
  display:inline-block;padding:1rem 2.5rem;border-radius:999px;
  background:linear-gradient(135deg,var(--pink),var(--purple));
  color:#fff;font-weight:700;font-size:1.1rem;text-decoration:none;
  box-shadow:0 0 25px rgba(255,45,149,0.45);transition:transform 0.2s,box-shadow 0.2s;
}
.cta:hover{transform:translateY(-2px);box-shadow:0 0 35px rgba(255,45,149,0.6)}
.cta-muted{opacity:0.7;cursor:default}
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
}
.card h3{color:var(--cyan);margin-bottom:0.5rem;font-size:1.1rem}
.card p{color:#8888a0;font-size:0.95rem}
.contact{text-align:center}
.contact p{margin:0.5rem 0;color:#a0a0b8}
.contact a{color:var(--cyan);text-decoration:none}
footer{
  text-align:center;padding:2rem 1.5rem;color:#55556a;font-size:0.85rem;
  border-top:1px solid rgba(255,255,255,0.06);
}
@media(max-width:600px){nav a{display:none}.hero h1{font-size:2.2rem}}
</style>
</head>
<body>
<nav>
  <span class="logo">${escapeHtml(businessName)}</span>
  <div><a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a></div>
</nav>
<section class="hero">
  <h1>${escapeHtml(businessName)}</h1>
  <p>${escapeHtml(tagline)}</p>
  ${phoneCta}
</section>
<section id="services">
  <h2>Our Services</h2>
  <div class="grid">${serviceItems}</div>
</section>
<section id="about">
  <h2>About Us</h2>
  <p style="text-align:center;color:#a0a0b8;max-width:640px;margin:0 auto">
    Proudly serving Miami with passion and style. Your neighborhood destination for quality and trust.
  </p>
</section>
<section id="contact" class="contact">
  <h2>Get In Touch</h2>
  ${phone ? `<p><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>` : ""}
  ${address ? `<p>${escapeHtml(address)}</p>` : ""}
  ${email ? `<p><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : ""}
  ${!phone && !address && !email ? "<p>Contact details coming soon.</p>" : ""}
</section>
<footer>&copy; ${new Date().getFullYear()} ${escapeHtml(businessName)} · Miami, FL</footer>
</body>
</html>`;
}

export function renderFromAudit(audit: SiteAudit): string {
  return renderShellSite({
    businessName: audit.businessName,
    tagline: audit.brand.tagline,
    phone: audit.brand.phone,
    address: audit.brand.address,
    email: audit.brand.email,
    services: audit.brand.services.length ? audit.brand.services : undefined,
    palette: audit.brand.palette,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal shell for scaffold deploy smoke tests. */
export function renderEmptyShell(businessName = "Stylus Demo"): string {
  return renderShellSite({ businessName });
}

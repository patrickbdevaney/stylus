import type { SiteSnapshot } from "@/lib/schema";

const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)[0-9]{3}[-.\s]?[0-9]{4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function extractContact(text: string): SiteSnapshot["contact"] {
  const phones = text.match(PHONE_RE) ?? [];
  const emails = text.match(EMAIL_RE) ?? [];
  return {
    phone: phones[0]?.replace(/\s+/g, " ").trim() ?? null,
    email: emails[0] ?? null,
    address: null,
  };
}

export function buildDegradedSnapshot(
  businessName: string,
  url: string | null,
  partial?: Partial<Omit<SiteSnapshot, "businessName" | "url" | "degraded">>,
): SiteSnapshot {
  return {
    businessName,
    url,
    degraded: true,
    title: partial?.title ?? null,
    description: partial?.description ?? null,
    headings: partial?.headings ?? [],
    contact: partial?.contact ?? { phone: null, address: null, email: null },
    rawText:
      partial?.rawText ??
      `Business: ${businessName}. Limited site data available — audit will use inferred defaults.`,
    screenshot: partial?.screenshot ?? null,
  };
}

export function countUsableFields(s: SiteSnapshot): number {
  let n = 0;
  if (s.title) n++;
  if (s.description) n++;
  if (s.headings.length) n++;
  if (s.contact.phone) n++;
  if (s.contact.email) n++;
  if (s.contact.address) n++;
  if (s.rawText.length > 80) n++;
  return n;
}

export function isUsableSnapshot(s: SiteSnapshot): boolean {
  return countUsableFields(s) >= 2;
}

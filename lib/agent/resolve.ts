import type { ResolveResult } from "@/lib/schema";
import { findDemoByName } from "@/lib/demo/seed";

const URL_PATTERN =
  /^(https?:\/\/)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+([/?#].*)?$/i;

function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  return URL_PATTERN.test(trimmed);
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function nameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    const base = hostname.split(".")[0] ?? hostname;
    return base
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return url;
  }
}

export async function resolve(input: string): Promise<ResolveResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { url: null, businessName: "Unknown Business", resolved: false };
  }

  if (isLikelyUrl(trimmed)) {
    try {
      const url = new URL(normalizeUrl(trimmed)).href;
      return {
        url,
        businessName: nameFromUrl(url),
        resolved: true,
      };
    } catch {
      return { url: null, businessName: trimmed, resolved: false };
    }
  }

  const demo = findDemoByName(trimmed);
  if (demo?.snapshot.url) {
    return {
      url: demo.snapshot.url,
      businessName: demo.name,
      resolved: true,
    };
  }

  return { url: null, businessName: trimmed, resolved: false };
}

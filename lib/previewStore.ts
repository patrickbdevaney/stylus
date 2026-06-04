import { randomUUID } from "crypto";

const previews = new Map<string, { html: string; created: number }>();

const TTL_MS = 60 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const id of Array.from(previews.keys())) {
    const entry = previews.get(id);
    if (entry && now - entry.created > TTL_MS) previews.delete(id);
  }
}

export function storePreviewHtml(html: string): string {
  prune();
  const id = randomUUID().slice(0, 12);
  previews.set(id, { html, created: Date.now() });
  return id;
}

export function getPreviewHtml(id: string): string | null {
  const entry = previews.get(id);
  if (!entry) return null;
  if (Date.now() - entry.created > TTL_MS) {
    previews.delete(id);
    return null;
  }
  return entry.html;
}

export function previewUrl(id: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/site/${id}`;
}

import { randomUUID } from "crypto";
import { get as blobGet, put } from "@vercel/blob";

export function isBlobAvailable(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function storePreviewHtml(html: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set — cannot store preview");
  }
  const id = randomUUID().slice(0, 12);
  await put(`previews/${id}.html`, html, {
    access: "public",
    contentType: "text/html; charset=utf-8",
    addRandomSuffix: false,
  });
  return id;
}

export async function getPreviewHtml(id: string): Promise<string | null> {
  try {
    const result = await blobGet(`previews/${id}.html`, { access: "public" });
    if (!result) return null;
    const res = await fetch(result.blob.url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function previewUrl(id: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/site/${id}`;
}

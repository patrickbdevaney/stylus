import { getPreviewHtml } from "@/lib/previewStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const html = getPreviewHtml(params.id);
  if (!html) {
    return new Response("Preview expired or not found", { status: 404 });
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

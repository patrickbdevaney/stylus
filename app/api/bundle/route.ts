export const runtime = "nodejs";

type BundleRequest = {
  files: Record<string, string>;
  businessName: string;
  variantLabel: string;
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isValidBundleRequest(body: unknown): body is BundleRequest {
  if (!body || typeof body !== "object") return false;

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.businessName !== "string" || candidate.businessName.length === 0) {
    return false;
  }
  if (typeof candidate.variantLabel !== "string" || candidate.variantLabel.length === 0) {
    return false;
  }
  if (!candidate.files || typeof candidate.files !== "object") return false;

  const entries = Object.entries(candidate.files as Record<string, unknown>);
  if (entries.length === 0) return false;

  return entries.every(
    ([path, contents]) =>
      typeof path === "string" &&
      path.length > 0 &&
      typeof contents === "string",
  );
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isValidBundleRequest(body)) {
    return new Response(JSON.stringify({ error: "Invalid bundle request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { files, businessName, variantLabel } = body;
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folderName = `${slugify(businessName)}-${slugify(variantLabel)}`;
  const folder = zip.folder(folderName);

  if (!folder) {
    return new Response(JSON.stringify({ error: "Could not create zip folder" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  for (const [path, contents] of Object.entries(files)) {
    folder.file(path, contents);
  }

  const blob = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const filename = `${folderName}.zip`;

  return new Response(new Uint8Array(blob), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

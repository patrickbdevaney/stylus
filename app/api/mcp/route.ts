import { NextResponse } from "next/server";
import { resolve } from "@/lib/agent/resolve";
import { fetchSite } from "@/lib/agent/fetchSite";
import { auditSite } from "@/lib/agent/auditSite";
import { generateSiteWithVariants } from "@/lib/agent/generateSite";
import { deploySite } from "@/lib/agent/deploySite";
import { previewUrl, storePreviewHtml } from "@/lib/previewStore";

export const runtime = "nodejs";

const REDEVELOP_TOOL = {
  name: "redevelop_smb_site",
  description:
    "Audit a Miami small-business website and deploy a modernized version. Returns audit scores and a live URL.",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string" as const,
        description: "Business website URL",
      },
    },
    required: ["url"] as const,
  },
};

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  method?: string;
  params?: unknown;
  id?: JsonRpcId;
};

type ToolsCallParams = {
  name?: string;
  arguments?: { url?: string };
};

function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code, message, data },
  });
}

async function runRedevelopPipeline(
  url: string,
  origin?: string,
): Promise<{ audit: Awaited<ReturnType<typeof auditSite>>; deployUrl: string }> {
  const resolved = await resolve(url);
  const snapshot = await fetchSite(resolved);
  const audit = await auditSite(snapshot);
  const generated = await generateSiteWithVariants(audit);

  try {
    const deploy = await deploySite(generated);
    return { audit, deployUrl: deploy.url };
  } catch (deployErr) {
    if (origin) {
      const id = await storePreviewHtml(generated.html);
      return { audit, deployUrl: previewUrl(id, origin) };
    }
    throw deployErr;
  }
}

export async function GET() {
  return NextResponse.json({
    name: "stylus",
    version: "1.0",
    protocol: "mcp",
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as JsonRpcRequest;
  const id: JsonRpcId = body.id ?? null;
  const method = body.method;

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: [REDEVELOP_TOOL] });
  }

  if (method === "tools/call") {
    const params = body.params as ToolsCallParams | undefined;
    if (params?.name !== "redevelop_smb_site") {
      return jsonRpcError(id, -32601, "Unknown tool");
    }

    const url =
      typeof params.arguments?.url === "string"
        ? params.arguments.url.trim()
        : "";

    if (!url) {
      return jsonRpcError(id, -32602, "Invalid params: url required");
    }

    try {
      const origin = new URL(req.url).origin;
      const { audit, deployUrl } = await runRedevelopPipeline(url, origin);

      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: `Audited ${audit.businessName}: ${audit.overallScore}/100. Deployed: ${deployUrl}`,
          },
        ],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Pipeline execution failed";
      return jsonRpcError(id, -32603, message);
    }
  }

  return jsonRpcError(id, -32601, `Method not found: ${method ?? "unknown"}`);
}

import { NextResponse } from "next/server";
import { resolve } from "@/lib/agent/resolve";
import { fetchSite } from "@/lib/agent/fetchSite";
import { auditSite } from "@/lib/agent/auditSite";
import { generateSiteWithVariants } from "@/lib/agent/generateSite";
import { deploySite } from "@/lib/agent/deploySite";
import { previewUrl, storePreviewHtml } from "@/lib/previewStore";
import type { SiteAudit } from "@/lib/schema";

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

const AUDIT_TOOL = {
  name: "audit_smb_site",
  description:
    "Audit a Miami small-business website only (no generate or deploy). Returns dimension scores.",
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

const MCP_TOOLS = [REDEVELOP_TOOL, AUDIT_TOOL] as const;

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

function formatAuditText(audit: SiteAudit): string {
  const d = audit.dimensions;
  return `Audited ${audit.businessName}: ${audit.overallScore}/100. Dimensions: clarity ${d.clarity.score}, trust ${d.trust.score}, mobile ${d.mobile.score}, speed ${d.speed.score}, conversion ${d.conversion.score}, localSeo ${d.localSeo.score}`;
}

async function runAuditPipeline(url: string): Promise<SiteAudit> {
  const resolved = await resolve(url);
  const snapshot = await fetchSite(resolved);
  return auditSite(snapshot);
}

async function runRedevelopPipeline(
  url: string,
  origin?: string,
): Promise<{ audit: SiteAudit; deployUrl: string }> {
  const resolved = await resolve(url);
  const snapshot = await fetchSite(resolved);
  const audit = await auditSite(snapshot);
  const generated = await generateSiteWithVariants(audit);

  try {
    const deploy = await deploySite(generated);
    return { audit, deployUrl: deploy.url };
  } catch (deployErr) {
    if (origin) {
      const id = await storePreviewHtml(generated.previewHtml);
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
    tools: MCP_TOOLS,
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as JsonRpcRequest;
  const id: JsonRpcId = body.id ?? null;
  const method = body.method;

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: [...MCP_TOOLS] });
  }

  if (method === "tools/call") {
    const params = body.params as ToolsCallParams | undefined;
    const toolName = params?.name;

    const url =
      typeof params?.arguments?.url === "string"
        ? params.arguments.url.trim()
        : "";

    if (!url) {
      return jsonRpcError(id, -32602, "Invalid params: url required");
    }

    if (toolName === "audit_smb_site") {
      try {
        const audit = await runAuditPipeline(url);
        return jsonRpcResult(id, {
          content: [{ type: "text", text: formatAuditText(audit) }],
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Audit pipeline failed";
        return jsonRpcError(id, -32603, message);
      }
    }

    if (toolName === "redevelop_smb_site") {
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

    return jsonRpcError(id, -32601, "Unknown tool");
  }

  return jsonRpcError(id, -32601, `Method not found: ${method ?? "unknown"}`);
}

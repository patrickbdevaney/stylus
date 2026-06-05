import { NextResponse } from "next/server";
import {
  buildSeedPayload,
  parseTavilyToPayload,
  SeoGapResponseSchema,
} from "@/lib/seoGap";

export const runtime = "nodejs";

const TAVILY_TIMEOUT_MS = 8000;

type RequestBody = {
  businessName?: string;
  category?: string;
};

async function fetchTavily(
  category: string,
  apiKey: string,
): Promise<Response> {
  return fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: `top ${category} competitors in Wynwood Miami`,
      search_depth: "basic",
      max_results: 5,
      include_answer: true,
    }),
    signal: AbortSignal.timeout(TAVILY_TIMEOUT_MS),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const businessName =
    typeof body.businessName === "string" ? body.businessName.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "Local business";

  if (!businessName) {
    return NextResponse.json(
      { error: "businessName required" },
      { status: 400 },
    );
  }

  const useSeed =
    process.env.DEMO_MODE === "true" || !process.env.TAVILY_API_KEY;

  if (useSeed) {
    const seed = buildSeedPayload(businessName, category);
    return NextResponse.json(SeoGapResponseSchema.parse(seed));
  }

  try {
    const res = await fetchTavily(category, process.env.TAVILY_API_KEY!);
    if (!res.ok) {
      return NextResponse.json(buildSeedPayload(businessName, category));
    }

    const json = (await res.json()) as {
      answer?: string;
      results?: { title?: string; url?: string; content?: string }[];
    };

    const payload = parseTavilyToPayload(businessName, category, json);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(buildSeedPayload(businessName, category));
  }
}

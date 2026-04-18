import { NextResponse } from "next/server";
import {
  normalizeBiasAnalysis,
  parseModelAnalysisString,
} from "@/lib/parse-analysis";

/** Vercel / long inference — adjust if your host uses different limits */
export const maxDuration = 120;

const DEFAULT_INFERENCE_URL =
  "https://news-bias-server-896252675202.asia-south1.run.app/analyze";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function inferenceUrl(): string {
  return (
    process.env.NEWS_BIAS_INFERENCE_URL?.trim() || DEFAULT_INFERENCE_URL
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: corsHeaders }
    );
  }

  const text =
    typeof body === "object" &&
    body !== null &&
    "text" in body &&
    typeof (body as { text?: unknown }).text === "string"
      ? (body as { text: string }).text.trim()
      : "";

  if (!text) {
    return NextResponse.json(
      { error: "Request body must include a non-empty \"text\" field." },
      { status: 400, headers: corsHeaders }
    );
  }

  const upstream = inferenceUrl();
  let upstreamJson: unknown;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 110_000);
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    });
    clearTimeout(t);

    const rawText = await res.text();
    try {
      upstreamJson = JSON.parse(rawText) as unknown;
    } catch {
      return NextResponse.json(
        {
          error: "Inference server returned non-JSON.",
        },
        { status: 502, headers: corsHeaders }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Inference server error (${res.status}).`,
        },
        { status: 502, headers: corsHeaders }
      );
    }
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "Inference request timed out."
        : "Could not reach the inference server.";
    return NextResponse.json(
      { error: msg },
      { status: 502, headers: corsHeaders }
    );
  }

  const analysisField =
    typeof upstreamJson === "object" &&
    upstreamJson !== null &&
    "analysis" in upstreamJson &&
    typeof (upstreamJson as { analysis?: unknown }).analysis === "string"
      ? (upstreamJson as { analysis: string }).analysis
      : null;

  if (!analysisField) {
    return NextResponse.json(
      { error: "Inference response missing an \"analysis\" string." },
      { status: 502, headers: corsHeaders }
    );
  }

  try {
    const parsed = parseModelAnalysisString(analysisField);
    const normalized = normalizeBiasAnalysis(parsed);
    return NextResponse.json(normalized, { headers: corsHeaders });
  } catch (e) {
    const hint =
      e instanceof Error ? e.message : "Failed to parse model output.";
    return NextResponse.json(
      {
        error: `Could not parse model JSON: ${hint}`,
      },
      { status: 502, headers: corsHeaders }
    );
  }
}

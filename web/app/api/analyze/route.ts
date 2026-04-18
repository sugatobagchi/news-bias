import { NextResponse } from "next/server";
import type {
  AnalyzeRequestBody,
  AnalyzeResponse,
  BiasCategoryResult,
} from "@/lib/analysis-types";

function mockAnalysis(input: string, mode: AnalyzeRequestBody["mode"]): AnalyzeResponse {
  const preview =
    input.trim().slice(0, 120) + (input.trim().length > 120 ? "…" : "");
  const categories: BiasCategoryResult[] = [
    {
      id: "framing",
      label: "Framing",
      score: 62,
      lean: "left",
      note: "Issue is framed around systemic causes rather than individual fault.",
    },
    {
      id: "tone",
      label: "Tone & loaded language",
      score: 48,
      lean: "mixed",
      note: "Some emotionally charged terms; mostly descriptive.",
    },
    {
      id: "sourcing",
      label: "Sourcing & balance",
      score: 55,
      lean: "center",
      note: "Cites official statements; limited counter-perspective.",
    },
    {
      id: "omission",
      label: "Omission",
      score: 71,
      lean: "right",
      note: "Alternative explanations receive little space.",
    },
  ];

  return {
    headline: mode === "url" ? "Article preview" : "Pasted text preview",
    summary:
      preview ||
      "No extractable preview. Replace this with fetched article text or LLM output in production.",
    overallLean: "mixed",
    overallScore: 54,
    categories,
    sourceNote:
      mode === "url"
        ? "URL received; full article fetch and parsing is not wired yet—showing placeholder bias breakdown."
        : "Analysis is illustrative only until a model or rules engine is connected.",
  };
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const mode = body?.mode;
  const value = typeof body?.value === "string" ? body.value : "";

  if (mode !== "url" && mode !== "text") {
    return NextResponse.json(
      { error: 'Body must include mode: "url" or "text".' },
      { status: 400 }
    );
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return NextResponse.json(
      { error: "Input cannot be empty." },
      { status: 400 }
    );
  }

  if (mode === "url") {
    try {
      // Basic URL shape check; real fetching not implemented yet.
      new URL(trimmed);
    } catch {
      return NextResponse.json(
        { error: "Please enter a valid URL." },
        { status: 400 }
      );
    }
  }

  const data: AnalyzeResponse = mockAnalysis(trimmed, mode);
  return NextResponse.json(data);
}

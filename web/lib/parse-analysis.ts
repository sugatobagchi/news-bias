/**
 * Extract the first balanced JSON object from arbitrary model output (prompt + JSON tail).
 */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

export function parseModelAnalysisString(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();

  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }

  const extracted = extractFirstJsonObject(trimmed);
  if (!extracted) {
    throw new Error("Could not find a JSON object in the model output.");
  }

  try {
    const parsed = JSON.parse(extracted) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    throw new Error("Found JSON-like text but parsing failed.");
  }

  throw new Error("Unexpected model output shape.");
}

function asNumberOrString(v: unknown): string | number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return v;
  return null;
}

export type NormalizedBiasAnalysis = {
  bias_score: string | number | null;
  bias_category: string | null;
  analysis_summary: string | null;
  insufficient_content: boolean;
  /** Full parsed object from the model for optional display / extension use */
  details: Record<string, unknown>;
};

export function normalizeBiasAnalysis(
  parsed: Record<string, unknown>
): NormalizedBiasAnalysis {
  const insufficient =
    parsed.insufficient_content === true ||
    parsed.insufficient_content === "true";

  const bias_score =
    asNumberOrString(parsed.bias_score) ??
    asNumberOrString(parsed.overall_neutrality_score) ??
    asNumberOrString(parsed.political_leaning_score) ??
    asNumberOrString(parsed.emotional_language_score) ??
    null;

  let bias_category: string | null = null;
  if (typeof parsed.bias_category === "string" && parsed.bias_category.trim()) {
    bias_category = parsed.bias_category.trim();
  } else if (
    typeof parsed.favored_or_targeted === "string" &&
    parsed.favored_or_targeted.trim()
  ) {
    bias_category = parsed.favored_or_targeted.trim();
  }

  let analysis_summary: string | null = null;
  if (typeof parsed.analysis_summary === "string") {
    analysis_summary = parsed.analysis_summary.trim() || null;
  } else if (typeof parsed.explanation === "string") {
    analysis_summary = parsed.explanation.trim() || null;
  }

  return {
    bias_score,
    bias_category,
    analysis_summary,
    insufficient_content: insufficient,
    details: { ...parsed },
  };
}

import type { NormalizedBiasAnalysis } from "@/lib/parse-analysis";

/** POST /api/analyze — primary body from web UI and extension */
export type AnalyzeTextBody = {
  text: string;
};

export type AnalyzeApiError = {
  error: string;
};

export type AnalyzeApiSuccess = NormalizedBiasAnalysis;

export type { NormalizedBiasAnalysis };

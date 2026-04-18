export type AnalyzeInputMode = "url" | "text";

export type BiasLean = "left" | "center" | "right" | "mixed";

export type BiasCategoryResult = {
  id: string;
  label: string;
  score: number;
  lean: BiasLean;
  note: string;
};

export type AnalyzeResponse = {
  headline: string;
  summary: string;
  overallLean: BiasLean;
  overallScore: number;
  categories: BiasCategoryResult[];
  sourceNote: string;
};

export type AnalyzeRequestBody = {
  mode: AnalyzeInputMode;
  value: string;
};

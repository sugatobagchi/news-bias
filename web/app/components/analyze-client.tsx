"use client";

import { useState } from "react";
import type { AnalyzeApiSuccess } from "@/lib/analysis-types";
import { AnalysisResults } from "./analysis-results";

function Spinner() {
  return (
    <span
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

export function AnalyzeClient() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeApiSuccess | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Paste some article text to analyze.");
      setResult(null);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const payload = (await res.json()) as
        | AnalyzeApiSuccess
        | { error?: string };

      if (!res.ok) {
        const msg =
          "error" in payload && payload.error
            ? payload.error
            : "Something went wrong. Try again.";
        setError(msg);
        return;
      }

      if ("details" in payload && "bias_score" in payload) {
        setResult(payload);
      } else {
        setError("Unexpected response from the server.");
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10"
      >
        <label htmlFor="article-text" className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Article text
          </span>
          <textarea
            id="article-text"
            name="text"
            rows={10}
            placeholder="Paste the full article or an excerpt here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            className="mt-2 block w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-inner placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/30"
          />
        </label>

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 min-w-44 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus-visible:ring-zinc-500"
          >
            {loading ? (
              <>
                <Spinner />
                Analyzing…
              </>
            ) : (
              "Analyze for bias"
            )}
          </button>
        </div>
      </form>

      {result ? <AnalysisResults data={result} /> : null}
    </div>
  );
}

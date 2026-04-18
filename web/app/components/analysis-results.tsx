import type { AnalyzeApiSuccess } from "@/lib/analysis-types";

function formatScore(value: string | number | null): string {
  if (value === null) return "—";
  if (typeof value === "number") return String(value);
  return value;
}

export function AnalysisResults({ data }: { data: AnalyzeApiSuccess }) {
  const { bias_score, bias_category, analysis_summary, insufficient_content } =
    data;

  return (
    <section className="mt-10 w-full" aria-live="polite">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Results
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Bias analysis
        </h2>

        {insufficient_content ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            The model flagged this excerpt as too short or not news-like to
            score reliably.
          </p>
        ) : null}

        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Bias score
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatScore(bias_score)}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Bias category
            </dt>
            <dd className="mt-2 text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
              {bias_category ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Analysis summary
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {analysis_summary ?? "—"}
          </p>
        </div>

        <ExtraDetails details={data.details} />
      </div>
    </section>
  );
}

function ExtraDetails({
  details,
}: {
  details: Record<string, unknown>;
}) {
  const keys = Object.keys(details).filter(
    (k) =>
      ![
        "bias_score",
        "bias_category",
        "analysis_summary",
        "insufficient_content",
      ].includes(k)
  );
  if (keys.length === 0) return null;

  return (
    <details className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/30">
      <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Additional model fields
      </summary>
      <dl className="mt-3 space-y-3 text-sm">
        {keys.map((key) => (
          <div key={key}>
            <dt className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {key}
            </dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">
              {formatDetailValue(details[key])}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function formatDetailValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

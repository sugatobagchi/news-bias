import type { AnalyzeResponse, BiasLean } from "@/lib/analysis-types";

const leanStyles: Record<
  BiasLean,
  { chip: string; bar: string; ring: string }
> = {
  left: {
    chip:
      "bg-sky-50 text-sky-900 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-800",
    bar: "bg-sky-500",
    ring: "ring-sky-400/30",
  },
  center: {
    chip:
      "bg-emerald-50 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800",
    bar: "bg-emerald-500",
    ring: "ring-emerald-400/30",
  },
  right: {
    chip:
      "bg-rose-50 text-rose-900 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-100 dark:ring-rose-800",
    bar: "bg-rose-500",
    ring: "ring-rose-400/30",
  },
  mixed: {
    chip:
      "bg-violet-50 text-violet-900 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-100 dark:ring-violet-800",
    bar: "bg-violet-500",
    ring: "ring-violet-400/30",
  },
};

function ScoreBar({ score, lean }: { score: number; lean: BiasLean }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all ${leanStyles[lean].bar}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function AnalysisResults({ data }: { data: AnalyzeResponse }) {
  const overall = leanStyles[data.overallLean];

  return (
    <section className="mt-10 w-full" aria-live="polite">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Results
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {data.headline}
            </h2>
          </div>
          <div
            className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-medium ring-1 ${overall.chip}`}
          >
            <span
              className={`size-2 rounded-full ring-2 ${overall.ring} ${overall.bar}`}
              aria-hidden
            />
            Overall: {data.overallLean} · {data.overallScore}/100
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {data.summary}
        </p>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          {data.sourceNote}
        </p>

        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Bias signals
          </h3>
          <ul className="space-y-4">
            {data.categories.map((c) => {
              const s = leanStyles[c.lean];
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {c.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.chip}`}
                    >
                      {c.lean} · {c.score}
                    </span>
                  </div>
                  <div className="mt-3">
                    <ScoreBar score={c.score} lean={c.lean} />
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {c.note}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

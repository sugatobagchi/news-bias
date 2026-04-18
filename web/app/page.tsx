import { AnalyzeClient } from "./components/analyze-client";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-16 sm:px-6 sm:py-24">
        <header className="mb-10 text-center sm:mb-12">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            News Bias Detector
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Understand bias before you share
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-base text-zinc-600 dark:text-zinc-400">
            Paste raw article text below. We run it through a small language
            model tuned for political framing, emotional language, and narrative
            balance—then summarize the score, category, and rationale.
          </p>
        </header>

        <div className="flex justify-center">
          <AnalyzeClient />
        </div>
      </main>
    </div>
  );
}

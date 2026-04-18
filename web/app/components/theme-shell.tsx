"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "./theme-provider";

const ThemeToggle = dynamic(
  () => import("./theme-toggle").then((mod) => mod.ThemeToggle),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-9 w-54 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80"
        aria-hidden
      />
    ),
  }
);

export function ThemeShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="pointer-events-none fixed right-0 top-0 z-50 flex justify-end p-4 sm:p-6">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>
      {children}
    </ThemeProvider>
  );
}

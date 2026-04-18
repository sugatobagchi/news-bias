"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

const options: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="h-9 w-54 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80"
        aria-hidden
      />
    );
  }

  const active: ThemeChoice =
    theme === "light" || theme === "dark" ? theme : "system";

  return (
    <div
      className="inline-flex rounded-xl border border-zinc-200/90 bg-zinc-100/90 p-1 shadow-sm ring-1 ring-zinc-950/5 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90 dark:ring-white/10"
      role="radiogroup"
      aria-label="Color theme"
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={active === value}
          onClick={() => setTheme(value)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500 sm:px-3 sm:text-sm ${
            active === value
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

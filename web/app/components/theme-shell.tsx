"use client";

import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

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

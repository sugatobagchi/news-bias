import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeShell } from "./components/theme-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "News Bias — Scan articles for framing & tone",
  description:
    "Paste a news URL or raw text to explore bias signals: framing, tone, sourcing, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        <ThemeShell>{children}</ThemeShell>
      </body>
    </html>
  );
}

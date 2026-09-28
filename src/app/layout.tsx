import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.URL || "https://checkwebstack.netlify.app"),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { title: `${site.name}: ${site.tagline}`, description: site.description, type: "website", siteName: site.name },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (password managers, Grammarly, translators…)
    // add attributes to <html>/<body> before React loads, which would otherwise raise a false alarm.
    <html lang="en" suppressHydrationWarning className={`${hanken.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { site } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { title: site.name, description: site.description, type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (password managers, Grammarly, translators…)
    // add attributes to <html>/<body> before React loads, which would otherwise raise a false alarm.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

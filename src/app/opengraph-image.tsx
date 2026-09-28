import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PLATFORMS = ["Shopify", "WordPress", "Webflow", "Framer", "Wix"];

/** Loads a Google Font weight as TTF for the image renderer; falls back to the default font if offline. */
async function font(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@${weight}&display=swap`).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

// The preview card shown when the site is shared on WhatsApp, LinkedIn, X, Slack…
export default async function OpenGraphImage() {
  const [regular, bold] = await Promise.all([font(500), font(800)]);
  const fonts = [
    ...(regular ? [{ name: "Hanken", data: regular, weight: 500 as const }] : []),
    ...(bold ? [{ name: "Hanken", data: bold, weight: 800 as const }] : []),
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#F6F5F1",
          color: "#15161A",
          fontFamily: fonts.length ? "Hanken" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#15161A" />
            <path d="M14 39.5 32 48.5 50 39.5" fill="none" stroke="#F6F5F1" strokeOpacity=".45" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 31.5 32 40.5 50 31.5" fill="none" stroke="#F6F5F1" strokeOpacity=".75" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M32 13.5 50 22.5 32 31.5 14 22.5Z" fill="#E8551F" />
          </svg>
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.8 }}>{site.name}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.02 }}>What is this website built with?</span>
          <span style={{ fontSize: 32, color: "#4A4B52" }}>Platform, theme, hosting and tools behind any site, in seconds.</span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {PLATFORMS.map((p) => (
            <span
              key={p}
              style={{ fontSize: 24, padding: "10px 18px", borderRadius: 10, border: "2px solid #E5E2DA", background: "#FFFFFF", color: "#15161A" }}
            >
              {p}
            </span>
          ))}
          <span style={{ fontSize: 24, padding: "10px 18px", color: "#C8400F", fontWeight: 800, whiteSpace: "nowrap" }}>+100 more</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

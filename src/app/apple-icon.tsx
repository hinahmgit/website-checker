import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon for iPhone / Android: the logo on a full-bleed square (the OS rounds the corners).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#15161A" }}>
        <svg width="132" height="132" viewBox="8 8 48 48">
          <path d="M14 39.5 32 48.5 50 39.5" fill="none" stroke="#F6F5F1" strokeOpacity=".45" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 31.5 32 40.5 50 31.5" fill="none" stroke="#F6F5F1" strokeOpacity=".75" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M32 13.5 50 22.5 32 31.5 14 22.5Z" fill="#E8551F" />
        </svg>
      </div>
    ),
    size,
  );
}

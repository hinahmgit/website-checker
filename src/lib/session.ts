// Admin session tokens. Kept free of next/headers so proxy.ts can import it.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "wc_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_SESSION_SECRET must be set to at least 16 characters");
  return s;
}

// The password is mixed into the signature, so changing ADMIN_PASSWORD logs everyone out.
function sign(value: string): string {
  return createHmac("sha256", secret())
    .update(`${value}:${process.env.ADMIN_PASSWORD ?? ""}`)
    .digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createSessionToken(): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  return `${expires}.${sign(String(expires))}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !process.env.ADMIN_PASSWORD) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  try {
    return safeEqual(signature, sign(expires));
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password) && safeEqual(input, password!);
}

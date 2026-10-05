import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    req.headers.get("x-nf-client-connection-ip") || // Netlify's own header for the visitor's address
    forwarded?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Salted hash so raw IP addresses and device ids are never stored. */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${process.env.ADMIN_SESSION_SECRET ?? "website-checker"}`)
    .digest("hex")
    .slice(0, 32);
}

const DEVICE_COOKIE = "cws_device";

/**
 * A random id remembered by the visitor's browser for a year. Counting checks per browser as well as
 * per IP stops the free limit resetting whenever an internet provider hands out a new IP address.
 * Only callable from route handlers (it may set the cookie).
 */
export async function deviceHash(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(DEVICE_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = randomUUID();
    jar.set(DEVICE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return hashIp(`device:${id}`);
}

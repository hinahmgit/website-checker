import "server-only";
import { createHash } from "node:crypto";

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Salted hash so raw IP addresses are never stored. */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${process.env.ADMIN_SESSION_SECRET ?? "website-checker"}`)
    .digest("hex")
    .slice(0, 32);
}

import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

export class CheckError extends Error {
  constructor(message: string, public readonly userMessage: string) {
    super(message);
  }
}

/** Turns whatever the visitor typed ("example.com", "https://www.x.com/page") into a URL we are willing to fetch. */
export function normalizeInput(raw: string): URL {
  let value = raw.trim();
  if (!value) throw new CheckError("empty", "Please enter a website address.");
  if (value.length > 2048) throw new CheckError("too long", "That address is too long.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CheckError("unparseable", "That doesn't look like a valid website address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new CheckError("protocol", "Only http and https websites can be checked.");
  }
  if (url.username || url.password) {
    throw new CheckError("credentials", "Website addresses with usernames or passwords aren't supported.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new CheckError("port", "Only websites on standard ports can be checked.");
  }
  const host = url.hostname.toLowerCase();
  if (isIP(host.replace(/^\[|\]$/g, "")) || !host.includes(".") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new CheckError("host", "Please enter a public domain name, like example.com.");
  }
  url.hash = "";
  return url;
}

export function domainOf(url: URL | string): string {
  const host = typeof url === "string" ? new URL(url).hostname : url.hostname;
  return host.toLowerCase().replace(/^www\./, "");
}

function isPrivateIPv4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIP(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff")
  );
}

/** Refuses hosts that resolve to private/internal addresses, so the checker can't be used to probe our own network. */
async function assertPublicHost(hostname: string): Promise<void> {
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new CheckError(`dns ${hostname}`, "We couldn't find that website. Check the spelling of the domain.");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateIP(a.address))) {
    throw new CheckError(`private ${hostname}`, "That address points to a private network and can't be checked.");
  }
}

export interface FetchedPage {
  url: string; // final URL after redirects
  status: number;
  headers: Record<string, string>;
  cookies: string[];
  body: string;
  truncated: boolean;
}

interface FetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

export async function safeFetch(input: URL, opts: FetchOptions = {}): Promise<FetchedPage> {
  const { maxBytes = 3_000_000, timeoutMs = 12_000, maxRedirects = 5 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = input;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      await assertPublicHost(current.hostname);
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
      });

      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        await res.body?.cancel();
        const next = new URL(res.headers.get("location")!, current);
        if (next.protocol !== "http:" && next.protocol !== "https:") {
          throw new CheckError("redirect protocol", "The website redirected somewhere we can't follow.");
        }
        current = next;
        continue;
      }

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      const cookies = res.headers.getSetCookie?.() ?? [];

      const { text, truncated } = await readLimited(res, maxBytes);
      return { url: current.toString(), status: res.status, headers, cookies, body: text, truncated };
    }
    throw new CheckError("too many redirects", "The website redirected too many times.");
  } catch (err) {
    if (err instanceof CheckError) throw err;
    if ((err as Error)?.name === "AbortError") {
      throw new CheckError("timeout", "The website took too long to respond.");
    }
    throw new CheckError(String((err as Error)?.message ?? err), "We couldn't connect to that website.");
  } finally {
    clearTimeout(timer);
  }
}

async function readLimited(res: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size >= maxBytes) {
      truncated = true;
      await reader.cancel();
      break;
    }
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(all), truncated };
}

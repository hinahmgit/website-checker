import { NextResponse } from "next/server";
import { authClient } from "@/lib/auth-user";

// Google and email-link sign-ins land here with a one-time code, which becomes the session cookie.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await authClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.error("sign-in failed", error.message);
  }
  const reason = url.searchParams.get("error_description") ?? "link";
  return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}`, url.origin));
}

/** Only allow redirects back into this site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { site } from "@/config/site";
import { browserClient } from "@/lib/supabase-browser";

// Email sign-in links need a custom SMTP sender set up in Supabase (see README) before they reach
// real visitors, so the option stays hidden until NEXT_PUBLIC_EMAIL_SIGNIN=true.
const emailEnabled = process.env.NEXT_PUBLIC_EMAIL_SIGNIN === "true";

export default function SignInForm({ next, error }: { next: string; error?: string }) {
  const [status, setStatus] = useState<"idle" | "google" | "sending" | "sent">("idle");
  const [message, setMessage] = useState(error ? "That sign-in link didn't work or has expired. Please try again." : "");

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    const supabase = browserClient();
    if (!supabase) return;
    setStatus("google");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) {
      setMessage(error.message);
      setStatus("idle");
    }
  }

  async function emailLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = browserClient();
    if (!supabase) return;
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setStatus("sending");
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback() } });
    if (error) {
      setMessage(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  if (!browserClient()) {
    return <p className="text-ink-2">Sign-in isn&apos;t set up on this site yet.</p>;
  }

  return (
    <div className="space-y-5">
      <button
        onClick={google}
        disabled={status === "google"}
        className="btn btn-ghost h-12 w-full gap-3"
      >
        <svg aria-hidden viewBox="0 0 48 48" className="size-5">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {status === "google" ? "Opening Google…" : "Continue with Google"}
      </button>

      {emailEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          {status === "sent" ? (
            <p role="status" className="rounded-lg bg-good-soft p-4 text-sm">
              <span className="font-medium">Check your inbox.</span> We&apos;ve sent you a sign-in link. Open it on this device.
            </p>
          ) : (
            <form onSubmit={emailLink} className="space-y-2">
              <label htmlFor="signin-email" className="block text-sm font-medium">
                Email me a sign-in link
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="signin-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="btn btn-primary"
                >
                  {status === "sending" ? "Sending…" : "Send link"}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {message && (
        <p role="alert" className="text-sm text-bad">
          {message}
        </p>
      )}

      <p className="text-xs text-muted">
        By signing in you agree to the{" "}
        <Link href="/terms" className="underline hover:text-ink">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-ink">
          Privacy Policy
        </Link>
        . Accounts are free.
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { browserClient } from "@/lib/supabase-browser";

type Mode = "login" | "signup";

const input =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink outline-none placeholder:text-muted/70 focus:border-ink-2";

/** Turns Supabase's error messages into friendly ones. */
function friendly(message: string, mode: Mode): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Try again, or sign up if you're new.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Log in instead.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("password should be") || m.includes("weak password")) return "Please choose a stronger password (at least 8 characters).";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("signups not allowed") || m.includes("email logins are disabled") || m.includes("email provider is disabled"))
    return mode === "signup" ? "Email sign-up isn't available right now. Please continue with Google." : "Email log-in isn't available right now. Please continue with Google.";
  return message;
}

export default function AuthForm({ mode, next, error }: { mode: Mode; next: string; error?: string }) {
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [message, setMessage] = useState(error ? "That sign-in didn't work or has expired. Please try again." : "");
  const [confirmSent, setConfirmSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const supabase = browserClient();
  if (!supabase) return <p className="text-ink-2">Sign-in isn&apos;t set up on this site yet.</p>;

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const other = mode === "login" ? "/signup" : "/signin";
  const otherHref = next === "/" ? other : `${other}?next=${encodeURIComponent(next)}`;

  async function google() {
    setBusy("google");
    setMessage("");
    const { error } = await supabase!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) {
      setMessage(friendly(error.message, mode));
      setBusy(null);
    }
  }

  async function withEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setMessage("");

    if (mode === "signup") {
      const name = String(form.get("name") ?? "").trim();
      if (password.length < 8) return setMessage("Your password needs at least 8 characters.");
      if (password !== String(form.get("confirm") ?? "")) return setMessage("The two passwords don't match.");
      setBusy("email");
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: callback() },
      });
      if (error) {
        setMessage(friendly(error.message, mode));
        setBusy(null);
        return;
      }
      // With email confirmation switched on, Supabase returns no session until the link is clicked.
      if (!data.session) {
        setConfirmSent(true);
        setBusy(null);
        return;
      }
    } else {
      setBusy("email");
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(friendly(error.message, mode));
        setBusy(null);
        return;
      }
    }
    // Full page load so the server sees the new session cookie.
    window.location.assign(next);
  }

  if (confirmSent) {
    return (
      <div role="status" className="rounded-xl bg-good-soft p-4 text-sm">
        <p className="font-semibold text-ink">Check your inbox</p>
        <p className="mt-1 text-ink-2">We&apos;ve sent you a link to confirm your email. Open it on this device to finish signing up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={google} disabled={busy !== null} className="btn btn-ghost h-12 w-full gap-3">
        <svg aria-hidden viewBox="0 0 48 48" className="size-5">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {busy === "google" ? "Opening Google…" : mode === "signup" ? "Sign up with Google" : "Log in with Google"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="eyebrow">or with email</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={withEmail} className="space-y-3">
        {mode === "signup" && (
          <Field label="Full name" htmlFor="auth-name">
            <input id="auth-name" name="name" required maxLength={100} autoComplete="name" className={input} />
          </Field>
        )}
        <Field label="Email" htmlFor="auth-email">
          <input id="auth-email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" className={input} />
        </Field>
        <Field
          label="Password"
          htmlFor="auth-password"
          aside={
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="text-xs font-semibold text-ink-2 hover:text-ink">
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        >
          <input
            id="auth-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "At least 8 characters" : undefined}
            className={input}
          />
        </Field>
        {mode === "signup" && (
          <Field label="Confirm password" htmlFor="auth-confirm">
            <input
              id="auth-confirm"
              name="confirm"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              className={input}
            />
          </Field>
        )}

        {message && (
          <p role="alert" className="text-sm text-bad">
            {message}
          </p>
        )}

        <button type="submit" disabled={busy !== null} className="btn btn-primary w-full">
          {busy === "email" ? (mode === "signup" ? "Creating account…" : "Logging in…") : mode === "signup" ? "Create free account" : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-ink-2">
        {mode === "signup" ? "Already have an account? " : "New to CheckWebStack? "}
        <Link href={otherHref} className="font-semibold text-accent underline-offset-4 hover:underline">
          {mode === "signup" ? "Log in" : "Sign up free"}
        </Link>
      </p>

      <p className="text-center text-xs text-muted">
        By continuing you agree to the{" "}
        <Link href="/terms" className="underline hover:text-ink">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function Field({ label, htmlFor, aside, children }: { label: string; htmlFor: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

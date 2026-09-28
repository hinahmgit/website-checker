import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form method="post" action="/api/admin/login" className="w-full max-w-sm rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold">{site.name} admin</h1>
        <p className="mt-1 text-sm text-ink-2">Sign in to see checks, requests, users and stats.</p>

        <label htmlFor="password" className="mt-6 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-bad">
            {error === "config"
              ? "ADMIN_PASSWORD and ADMIN_SESSION_SECRET aren't set on the server yet."
              : "That password isn't right."}
          </p>
        )}

        <button type="submit" className="btn btn-primary mt-5 w-full">
          Sign in
        </button>
      </form>
    </main>
  );
}

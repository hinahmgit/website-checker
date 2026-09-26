import type { Metadata } from "next";
import Link from "next/link";
import NavLinks from "@/components/admin/NavLinks";
import { requireAdmin } from "@/lib/auth";
import { isDbConfigured } from "@/lib/supabase";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="font-semibold">
            {site.name} <span className="font-normal text-muted">admin</span>
          </Link>
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <NavLinks />
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" className="text-ink-2 hover:text-ink">
              Open checker ↗
            </Link>
            <form action="/api/admin/logout" method="post">
              <button className="text-ink-2 hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {isDbConfigured() ? (
          children
        ) : (
          <div className="rounded-xl border border-warn/40 bg-warn-soft p-5">
            <h1 className="font-semibold">Connect the database to see stats</h1>
            <p className="mt-1 text-sm text-ink-2">
              Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code> (or in Netlify → Site configuration →
              Environment variables), run <code>supabase/schema.sql</code> in the Supabase SQL editor, then restart the app.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

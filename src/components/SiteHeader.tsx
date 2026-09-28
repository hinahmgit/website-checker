"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";
import { authEnabled, browserClient } from "@/lib/supabase-browser";
import Logo from "./Logo";

interface HeaderUser {
  email: string | null;
  name: string | null;
  avatar: string | null;
}

export default function SiteHeader() {
  const [user, setUser] = useState<HeaderUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) {
      setUser(null);
      return;
    }
    const toUser = (u: { email?: string; user_metadata?: Record<string, string> } | null | undefined): HeaderUser | null =>
      u ? { email: u.email ?? null, name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null, avatar: u.user_metadata?.avatar_url ?? null } : null;
    supabase.auth.getUser().then(({ data }) => setUser(toUser(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function signOut() {
    await browserClient()?.auth.signOut();
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/auth/signout";
    document.body.append(form);
    form.submit();
  }

  return (
    <header className="flex items-center justify-between gap-3 py-5">
      <Link href="/" className="flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.02em]">
        <Logo className="size-8" />
        <span className="hidden min-[400px]:inline">{site.name}</span>
      </Link>

      <nav className="flex items-center gap-1.5 text-sm sm:gap-3">
        <Link href="/request" className="rounded-md px-2 py-1.5 font-semibold text-ink-2 hover:text-ink">
          Request a website
        </Link>
        {authEnabled && user === null && (
          <Link href="/signin" className="btn btn-primary btn-sm">
            Sign in
          </Link>
        )}
        {user && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 hover:bg-surface-2"
            >
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="" className="size-6 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span aria-hidden className="grid size-6 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                  {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-28 truncate">{user.name?.split(" ")[0] ?? "Account"}</span>
            </button>
            {open && (
              <div role="menu" className="absolute right-0 z-20 mt-2 w-60 rounded-lg border border-line bg-surface p-1 shadow-lg">
                <p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p>
                <Link role="menuitem" href="/request" className="block rounded-md px-3 py-2 hover:bg-surface-2" onClick={() => setOpen(false)}>
                  Request a website
                </Link>
                <button role="menuitem" onClick={signOut} className="block w-full rounded-md px-3 py-2 text-left hover:bg-surface-2">
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

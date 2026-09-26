import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Visitor sign-in (Google / email link) via Supabase Auth. Separate from the admin password login.

export interface SignedInUser {
  id: string;
  email: string | null;
  name: string | null;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/** Supabase client bound to the visitor's session cookies. */
export async function authClient() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The browser client refreshes the session.
        }
      },
    },
  });
}

/** The signed-in visitor, verified with Supabase, or null. */
export async function currentUser(): Promise<SignedInUser | null> {
  if (!isAuthConfigured()) return null;
  try {
    const supabase = await authClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const meta = data.user.user_metadata ?? {};
    return { id: data.user.id, email: data.user.email ?? null, name: meta.full_name ?? meta.name ?? null };
  } catch {
    return null;
  }
}

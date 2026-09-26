import { NextResponse } from "next/server";
import { authClient, isAuthConfigured } from "@/lib/auth-user";

export async function POST(req: Request) {
  if (isAuthConfigured()) {
    const supabase = await authClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", req.url), 303);
}

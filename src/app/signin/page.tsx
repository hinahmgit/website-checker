import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import SiteShell from "@/components/SiteShell";
import { site } from "@/config/site";
import { currentUser } from "@/lib/auth-user";

export const metadata: Metadata = { title: "Sign in" };

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await currentUser()) redirect(safeNext(next));

  return (
    <SiteShell>
      <div className="mx-auto max-w-md pt-10 sm:pt-16">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in to {site.name}</h1>
        <ul className="mt-4 space-y-1.5 text-ink-2">
          <li>✓ Unlimited website checks (instead of {site.limits.visitor} a day)</li>
          <li>✓ Detailed reports: every issue, the full tech stack and how it was detected</li>
          <li>✓ Download any report as a PDF</li>
          <li>✓ Free, no credit card</li>
        </ul>
        <div className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <SignInForm next={safeNext(next)} error={error} />
        </div>
      </div>
    </SiteShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckList from "@/components/CheckList";
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
        <p className="eyebrow">Free account</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.035em]">Get the full report</h1>
        <p className="mt-3 text-ink-2">One click with Google. No password, no card.</p>
        <div className="mt-6">
          <CheckList
            items={[
              <>Unlimited checks (visitors get {site.limits.visitor} a day)</>,
              "The complete tech stack for every site",
              "How we identified the platform, signal by signal",
              "Every SEO check, plus a PDF you can download and share",
            ]}
          />
        </div>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <SignInForm next={safeNext(next)} error={error} />
        </div>
      </div>
    </SiteShell>
  );
}

import { redirect } from "next/navigation";
import { site } from "@/config/site";
import { currentUser } from "@/lib/auth-user";
import AuthForm from "./AuthForm";
import CheckList from "./CheckList";
import SiteShell from "./SiteShell";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/** Shared layout for /signup and /signin. */
export default async function AuthPage({ mode, next, error }: { mode: "signup" | "login"; next?: string; error?: string }) {
  if (await currentUser()) redirect(safeNext(next));

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-4xl gap-10 pt-10 sm:pt-16 md:grid-cols-[1fr_minmax(0,26rem)] md:gap-14">
        <div>
          <p className="eyebrow">{mode === "signup" ? "Free account" : "Welcome back"}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-balance">
            {mode === "signup" ? "Sign up for the full report" : "Log in to CheckWebStack"}
          </h1>
          <p className="mt-3 text-ink-2">
            {mode === "signup" ? "Free forever. No card needed." : "Pick up where you left off: unlimited checks and full reports."}
          </p>
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
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <AuthForm mode={mode} next={safeNext(next)} error={error} />
        </div>
      </div>
    </SiteShell>
  );
}

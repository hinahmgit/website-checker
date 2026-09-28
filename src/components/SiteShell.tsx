import Link from "next/link";
import { site } from "@/config/site";
import Logo from "./Logo";
import SiteHeader from "./SiteHeader";

/** Header + footer wrapper for all public pages. */
export default function SiteShell({ children, width = "max-w-3xl" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className={`mx-auto flex min-h-dvh ${width} flex-col px-4 sm:px-6`}>
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-line py-8 text-sm text-muted print:hidden">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 font-bold tracking-[-0.02em] text-ink">
              <Logo className="size-6" />
              {site.name}
            </div>
            <p className="mt-2 text-xs leading-relaxed">
              Detection is based on publicly visible signals. “Likely plan” is an estimate: platforms don&apos;t publish which
              subscription a site is on.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/request" className="hover:text-ink">
              Request a website
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-xs">
          © {new Date().getFullYear()}{" "}
          {site.homepageUrl ? (
            <a href={site.homepageUrl} className="hover:text-ink hover:underline">
              {site.ownerName}
            </a>
          ) : (
            site.ownerName
          )}
          . All rights reserved.
        </p>
      </footer>
    </div>
  );
}

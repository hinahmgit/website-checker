import Link from "next/link";
import { site } from "@/config/site";
import SiteHeader from "./SiteHeader";

/** Header + footer wrapper for all public pages. */
export default function SiteShell({ children, width = "max-w-3xl" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className={`mx-auto flex min-h-dvh ${width} flex-col px-4 sm:px-6`}>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="mt-10 border-t border-line py-6 text-xs text-muted">
        <p>
          “Likely plan” is an estimate from publicly visible signals. Platforms don&apos;t publish which subscription a site is on.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            © {new Date().getFullYear()}{" "}
            {site.homepageUrl ? (
              <a href={site.homepageUrl} className="hover:text-ink hover:underline">
                {site.ownerName}
              </a>
            ) : (
              site.ownerName
            )}
            . All rights reserved.
          </span>
          <Link href="/privacy" className="hover:text-ink hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-ink hover:underline">
            Terms of Service
          </Link>
          <Link href="/request?type=website" className="hover:text-ink hover:underline">
            Request a quote
          </Link>
        </div>
      </footer>
    </div>
  );
}

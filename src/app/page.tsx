import Checker from "@/components/Checker";
import { site } from "@/config/site";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="grid size-7 place-items-center rounded-md bg-accent text-sm text-accent-ink">
            ◎
          </span>
          {site.name}
        </a>
        {site.bookingUrl && (
          <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-accent hover:underline">
            Book a call
          </a>
        )}
      </header>

      <main className="flex-1">
        <Checker />
      </main>

      <footer className="border-t border-line py-6 text-xs text-muted">
        <p>
          “Likely plan” is an estimate from publicly visible signals. Platforms don&apos;t publish which subscription a site is on.
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()}{" "}
          {site.homepageUrl ? (
            <a href={site.homepageUrl} className="hover:underline">
              {site.ownerName}
            </a>
          ) : (
            site.ownerName
          )}
        </p>
      </footer>
    </div>
  );
}

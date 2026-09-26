import type { Metadata } from "next";
import Link from "next/link";
import RequestForm from "@/components/RequestForm";
import SiteShell from "@/components/SiteShell";
import { site } from "@/config/site";
import { currentUser } from "@/lib/auth-user";

export const metadata: Metadata = {
  title: "Request a quote",
  description: `Request a full website report or a quote for a new website from ${site.ownerName}.`,
};

const COPY = {
  audit: {
    eyebrow: "Expert review",
    title: "Request a full website report",
    intro: `${site.ownerName} reviews your site by hand, covering design, UX, mobile, speed, SEO and conversion, and sends a prioritised report of what to fix and why.`,
    points: ["Hands-on review, not just automated checks", "Clear priorities: quick wins first", "Delivered as a report you can hand to any developer"],
  },
  website: {
    eyebrow: "Design & build",
    title: "Request a quote for a new website",
    intro: `Tell ${site.ownerName} about your project and get a free, no-obligation quote for a new site or redesign.`,
    points: ["Shopify, WordPress, Webflow, Framer or custom code", "Designed for speed, mobile and conversions", "Fixed quote before any work starts"],
  },
} as const;

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; website?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type === "audit" ? "audit" : "website";
  const copy = COPY[type];
  const user = await currentUser();

  return (
    <SiteShell>
      <div className="pt-8 sm:pt-12">
        <div className="mb-6 inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-sm">
          {(["audit", "website"] as const).map((t) => (
            <Link
              key={t}
              href={`/request?type=${t}${sp.website ? `&website=${encodeURIComponent(sp.website)}` : ""}`}
              aria-current={t === type ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 font-medium ${t === type ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {t === "audit" ? "Full report" : "New website"}
            </Link>
          ))}
        </div>

        <p className="text-xs font-medium tracking-wide text-accent uppercase">{copy.eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">{copy.title}</h1>
        <p className="mt-3 max-w-xl text-ink-2">{copy.intro}</p>
        <ul className="mt-4 space-y-1.5 text-ink-2">
          {copy.points.map((p) => (
            <li key={p}>✓ {p}</li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <RequestForm key={type} type={type} website={sp.website ?? ""} defaultName={user?.name ?? ""} defaultEmail={user?.email ?? ""} />
        </div>
      </div>
    </SiteShell>
  );
}

import type { Metadata } from "next";
import RequestForm from "@/components/RequestForm";
import SiteShell from "@/components/SiteShell";
import { site } from "@/config/site";
import { currentUser } from "@/lib/auth-user";

export const metadata: Metadata = {
  title: "Request a website",
  description: `Tell ${site.ownerName} about your project and get a free quote for a new website or redesign.`,
};

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ like?: string }> }) {
  const { like } = await searchParams;
  const inspiredBy = like?.replace(/[^\w.-]/g, "").slice(0, 100) || undefined;
  const user = await currentUser();

  return (
    <SiteShell>
      <div className="pt-8 sm:pt-12">
        <p className="text-xs font-medium tracking-wide text-accent uppercase">Design &amp; build by {site.ownerName}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">Request a website</h1>
        <p className="mt-3 max-w-xl text-ink-2">
          Tell us about your project and get a free, no-obligation quote for a new site or a redesign.
        </p>
        <ul className="mt-4 space-y-1.5 text-ink-2">
          <li>✓ Shopify, WordPress, Webflow, Framer or custom code</li>
          <li>✓ Designed for speed, mobile and conversions</li>
          <li>✓ Fixed quote before any work starts</li>
        </ul>

        <div className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <RequestForm inspiredBy={inspiredBy} defaultName={user?.name ?? ""} defaultEmail={user?.email ?? ""} />
        </div>
      </div>
    </SiteShell>
  );
}

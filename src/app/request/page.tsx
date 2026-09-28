import type { Metadata } from "next";
import CheckList from "@/components/CheckList";
import RequestForm from "@/components/RequestForm";
import SiteShell from "@/components/SiteShell";
import { site } from "@/config/site";
import { currentUser } from "@/lib/auth-user";

export const metadata: Metadata = {
  title: "Request a website",
  description: `Tell ${site.ownerName} about your project and get a free quote for a new website or a redesign.`,
};

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ like?: string }> }) {
  const { like } = await searchParams;
  const inspiredBy = like?.replace(/[^\w.-]/g, "").slice(0, 100) || undefined;
  const user = await currentUser();

  return (
    <SiteShell>
      <div className="pt-10 sm:pt-16">
        <p className="eyebrow">Built by {site.ownerName}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-balance sm:text-5xl">Request a website</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-2">
          Found a site you like? We&apos;ll build you one that fits your business. Tell us what you need and we&apos;ll reply with a free
          quote.
        </p>
        <div className="mt-6">
          <CheckList
            items={[
              "Shopify, WordPress, Webflow, Framer or custom code",
              "Fast, mobile-first and ready for search engines",
              "A fixed quote before any work starts",
            ]}
          />
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <RequestForm inspiredBy={inspiredBy} defaultName={user?.name ?? ""} defaultEmail={user?.email ?? ""} />
        </div>
      </div>
    </SiteShell>
  );
}

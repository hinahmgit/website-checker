import SiteShell from "./SiteShell";
import { site } from "@/config/site";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SiteShell>
      <article className="legal pt-8 pb-4 sm:pt-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {site.legalUpdated}</p>
        {children}
      </article>
    </SiteShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const mail = <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>;
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms apply to your use of {site.name} (“the service”), operated by {site.ownerName} (“we”, “us”), based in{" "}
        {site.country}. By using the service you agree to these terms. If you don&apos;t agree, please don&apos;t use it.
      </p>

      <h2>1. The service</h2>
      <p>
        {site.name} analyses publicly available information about websites (such as page code, headers and performance tests) to estimate
        which platform, theme and technologies they use, and to point out possible improvements. Checking is free. Visitors can run {site.limits.visitor} checks per 24 hours; signed-in users get unlimited checks and
        detailed reports, subject to fair use (see section 3). We may change these limits or features at any time.
      </p>

      <h2>2. Results are estimates</h2>
      <p>
        Results are generated automatically from public signals and may be incomplete or wrong. In particular, the “likely plan” is an
        educated guess: platforms don&apos;t publish which subscription a website uses. Don&apos;t rely on results as the only basis
        for business, legal or financial decisions.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the service for anything unlawful, or to harass, defame or infringe the rights of others;</li>
        <li>use bots, scripts or multiple accounts to run bulk checks or get around the daily limits;</li>
        <li>try to attack, overload, reverse-engineer or gain unauthorised access to the service or the websites you check;</li>
        <li>resell or republish the service or its results in bulk without our written permission.</li>
      </ul>
      <p>We may limit, suspend or close access for anyone who breaks these rules.</p>

      <h2>4. Accounts</h2>
      <p>
        You&apos;re responsible for activity under your account and for keeping your sign-in method secure. You can ask us to delete your
        account at any time by emailing {mail}.
      </p>

      <h2>5. Website projects</h2>
      <p>
        Website design and development projects are separate, paid services. Sending a “Request a website” form
        doesn&apos;t create a contract or any obligation for either side. Before any paid work starts, we&apos;ll agree the scope,
        price, payment terms and timeline with you in writing (for example by email or invoice), and those agreed terms apply to that
        work.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        The service, including its design, software and content, belongs to {site.ownerName}. You may use the results and reports, including
        downloaded PDFs, for your own business purposes. Names such as Shopify, WordPress, Wix, Webflow and Framer are trademarks of their
        owners. {site.name} is not affiliated with or endorsed by them.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        The service relies on third parties such as Google, Supabase and Netlify, and links to other websites. We aren&apos;t
        responsible for their content, availability or practices.
      </p>

      <h2>8. Disclaimer</h2>
      <p>
        The free service is provided “as is” and “as available”, without warranties of any kind, including accuracy, availability or
        fitness for a particular purpose.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the extent permitted by law, {site.ownerName} is not liable for any indirect, incidental or consequential loss (such as lost
        profits, revenue or data) arising from your use of the free service. For paid services, our total liability is limited to the
        amount you paid for that service.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms from time to time. We&apos;ll change the “last updated” date above, and continuing to use the service
        means you accept the updated terms.
      </p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of {site.country}, and disputes are subject to the courts of {site.country}.</p>

      <h2>12. Contact</h2>
      <p>
        {site.ownerName}, {site.country} · {mail}. See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const mail = <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>;
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what information {site.name} (“the service”, “we”, “us”) collects, why, and the choices you have. The
        service is operated by {site.ownerName}, based in {site.country}. If you have any questions, contact us at {mail}.
      </p>

      <h2>1. Information we collect</h2>
      <h3>Websites you check</h3>
      <p>
        When you check a website we store the address you entered and the results: the platform, theme, technologies, speed score and
        SEO checks. These results describe the public website, not you.
      </p>
      <h3>Technical information</h3>
      <p>
        To enforce the daily check limits we use your IP address. We store it only as a salted one-way hash, never as the raw address,
        so it can&apos;t be turned back into your IP. Our hosting provider may keep standard server logs, including IP addresses, for
        security and reliability.
      </p>
      <h3>Account information</h3>
      <p>
        If you sign in with Google, we receive your name, email address and profile picture from Google. If you sign in with an email
        link, we receive your email address. We never see or store your Google password.
      </p>
      <h3>Website requests you send us</h3>
      <p>
        When you send a “Request a website” form, we store the details you provide: your name, email, current website, project
        type, budget, message, and which checked website inspired the request.
      </p>
      <h3>Cookies</h3>
      <p>
        We only use cookies that are essential for the service to work, such as the cookie that keeps you signed in. We don&apos;t use
        advertising cookies or third-party tracking.
      </p>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To run the website checker and show your results.</li>
        <li>To manage your account and apply the daily check limits.</li>
        <li>To reply to your website requests, and to send you quotes or invoices you asked for.</li>
        <li>To prevent abuse and keep the service secure.</li>
        <li>To understand, in aggregate, how the service is used (for example, which platforms are most common) and improve it.</li>
      </ul>
      <p>
        We don&apos;t sell your personal information, and we don&apos;t send you marketing emails unless you&apos;ve asked us to
        contact you.
      </p>

      <h2>3. Services we use</h2>
      <p>We share information only with the providers that help us run the service:</p>
      <ul>
        <li>
          <strong>Supabase</strong>: database and sign-in (servers in South Korea).
        </li>
        <li>
          <strong>Netlify</strong>: website hosting.
        </li>
        <li>
          <strong>Google</strong>: “Continue with Google” sign-in; PageSpeed Insights, which receives the address of the website being
          checked; and website icons shown in results.
        </li>
        <li>
          <strong>Resend</strong>: delivers notification emails about website requests you send us.
        </li>
      </ul>
      <p>
        These providers may process data outside {site.country}. We may also disclose information if required by law or to protect
        our rights and users.
      </p>

      <h2>4. How long we keep it</h2>
      <p>
        We keep check results and account information while your account is active, or as long as needed to provide the service and
        its statistics. We keep requests as long as needed to handle them and meet our legal and accounting obligations. You can ask
        us to delete your data at any time.
      </p>

      <h2>5. Your choices and rights</h2>
      <p>
        You can ask us to access, correct, export or delete your personal information, or to delete your account, by emailing {mail}.
        We&apos;ll respond within 30 days. Depending on where you live, you may also have the right to object to certain processing or to
        complain to your local data protection authority.
      </p>

      <h2>6. Security</h2>
      <p>
        Data is sent over encrypted connections (HTTPS), and access to the database is restricted to our server. No system is
        perfectly secure, but we take reasonable steps to protect your information.
      </p>

      <h2>7. Children</h2>
      <p>The service is not intended for anyone under 16, and we don&apos;t knowingly collect their personal information.</p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. We&apos;ll change the “last updated” date above and, for significant changes,
        show a notice on the site.
      </p>

      <h2>9. Contact</h2>
      <p>
        {site.ownerName}, {site.country} · {mail}. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}

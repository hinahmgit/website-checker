# CheckWebStack by HM Studio

A free website platform detector: visitors enter a URL and see what the site is built with (platform, theme,
likely plan/hosting, apps and tech stack), plus a Google PageSpeed score and basic SEO checks.
The one call to action is "Request a website", which creates a lead in the admin panel.

- **Visitors** get 3 checks per 24 hours and a preview of the issues.
- **Free accounts** (Google sign-in) get unlimited checks and the full report (whole tech stack, detection evidence, every SEO check, PDF download).
- **Leads**: "Want a website like X? Request a website" opens a form; submissions appear under Admin → Leads and are emailed to you.
- Limits and business details live in `src/config/site.ts`.

Pages: checker `/` (shareable results `/?id=…`), `/signin`, `/request`, `/privacy`, `/terms`, and the admin panel
`/admin` (dashboard, checked sites, requests with status tracking, users, CSV exports).

## What's detected

| | |
|---|---|
| Platforms | Shopify, WordPress (incl. WordPress.com), WooCommerce, Wix, Squarespace, Webflow, Framer, BigCommerce, Magento, Ghost, Drupal, Joomla, HubSpot CMS, Duda, GoDaddy, Hostinger Builder, Tilda, Weebly and more; otherwise "Custom-coded (Next.js / Nuxt / …)" |
| Themes | Shopify (real theme name, version, free vs paid, renamed copies), WordPress (reads the theme's `style.css`, parent + child), Squarespace version, Drupal, Joomla, Magento, PrestaShop |
| Likely plan | Wix free/premium/store, Webflow staging/CMS/Ecommerce, Framer free/paid, Squarespace, WordPress.com tiers, WordPress host (WP Engine, Kinsta, VIP…), Shopify tier estimate. Always labelled an estimate. |
| Tech stack | ~170 fingerprints: analytics, ad pixels, email/SMS marketing, reviews, chat, payments, search, cookie consent, CDN/hosting, fonts, frameworks, page builders & WP plugins |
| SEO & setup checks | HTTPS, mobile viewport, title/description, H1s, alt text, social image, favicon, language, schema, canonical, script weight, JS-only content, no analytics, no contact path, pixels without consent banner, outdated © year |

Edit fingerprints in `src/lib/detect/signatures.ts`, and the plan/theme/issue logic in `src/lib/detect/analyze.ts`.
Test detection from the terminal with `npm run detect -- shopify.com wix.com`.

## Setup

### 1. Supabase (database)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Go to **Project Settings → API Keys** and copy the **secret** key (`sb_secret_…`) and the **publishable** key (`sb_publishable_…`).
   The Project URL is on the project's home page.

Re-run `schema.sql` whenever it changes. It's safe to run again and upgrades an existing database.

### 1b. Visitor sign-in (Google)

1. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: your live address, e.g. `https://checkwebstack.netlify.app`
   - **Redirect URLs**: add `https://checkwebstack.netlify.app/**` and `http://localhost:3000/**`
2. **Google Cloud Console → APIs & Services**:
   - **OAuth consent screen**: External; app name, support email, and your site as the app domain; publish the app.
   - **Credentials → Create credentials → OAuth client ID** → *Web application*. Under **Authorized redirect URIs** add
     `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. **Supabase → Authentication → Sign In / Providers → Google**: enable it and paste the Google **Client ID** and **Client secret**.
4. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The "Sign in" button appears once it's set.

**Email sign-in links** are hidden by default: Supabase's built-in mailer only delivers to your own team's addresses
and a few emails per hour. To enable them for everyone, verify a domain in Resend, add Resend as the custom SMTP
sender in **Supabase → Authentication → Emails → SMTP Settings**, then set `NEXT_PUBLIC_EMAIL_SIGNIN=true`.

### 2. Google PageSpeed API key (for the mobile scores)

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) and create a project.
2. Enable the **PageSpeed Insights API**, then **Create credentials → API key**.
3. Optional but recommended: restrict the key to the PageSpeed Insights API.

Without a key, Google's shared quota is usually exhausted and the scores card shows "couldn't score".

### 3. Email alerts for new requests (Resend)

1. Sign up at [resend.com](https://resend.com) and create an API key under **API Keys**.
2. Set `RESEND_API_KEY` to that key and `LEAD_NOTIFY_EMAIL` to **the same email you signed up to Resend with**.

That's enough to start. Emails come from `onboarding@resend.dev`, and hitting **Reply** writes straight to the person who sent the request.
To send from your own address (e.g. `alerts@yourdomain.com`) or to other inboxes, verify your domain in
Resend → **Domains**, then set `LEAD_FROM_EMAIL`. If the email fails, the request is still saved and the error is logged.

### 4. Environment variables

Copy `.env.example` to `.env.local` and fill it in:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ADMIN_PASSWORD=...           # your admin login
ADMIN_SESSION_SECRET=...     # any long random string (40+ characters)
PAGESPEED_API_KEY=...
RESEND_API_KEY=...
LEAD_NOTIFY_EMAIL=you@example.com
ADMIN_TIMEZONE=Asia/Karachi  # month/year boundaries for the stats
```

### 5. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, and http://localhost:3000/admin for the dashboard.
The checker works before Supabase is connected, but nothing is saved until it is.

### 6. Deploy to Netlify (free plan allows commercial use)

1. Push this folder to a GitHub repository.
2. On [netlify.com](https://netlify.com), sign up with GitHub, then **Add new site → Import an existing project → GitHub** and pick the repo.
   Netlify detects Next.js automatically. Leave the build settings as they are.
3. Before the first deploy, open **Add environment variables** and add every variable from your `.env.local`.
4. Deploy. Every later `git push` redeploys automatically.
5. Optional: **Domain management → Add a domain**, e.g. `check.yourdomain.com`.

The checker needs Supabase configured once deployed: without a database, limits, sign-in and requests won't work
because each request may run on a different server.

## Branding

- Fonts: Hanken Grotesk (text) and JetBrains Mono (technical details), set in `src/app/layout.tsx`.
- Icon: `src/app/icon.svg` (browser tab), `src/app/apple-icon.tsx` (home screen), `src/app/opengraph-image.tsx` (link previews), `src/components/Logo.tsx` (header).

- Name, tagline, booking link and footer are in `src/config/site.ts`. Set `bookingUrl` to your Calendly link to show "Book a call" buttons.
- Colours are in `src/app/globals.css` (`--accent` etc., with a dark-mode set).

## Privacy & safety notes

- Visitor IPs are never stored. Only a salted hash is kept, for rate limiting (30 checks/hour/IP).
- The server refuses to fetch private/internal network addresses, limits redirects, time and page size.
- Tables are locked with row-level security; only the server's service-role key can read or write.
- The Privacy Policy (/privacy) and Terms (/terms) describe this data handling. Review them, and update them if you change what the app collects.

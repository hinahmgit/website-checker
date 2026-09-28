// ✏️ Branding and business details — change these to make the checker yours.
export const site = {
  name: "CheckWebStack",
  tagline: "What is this website built with?",
  description:
    "Free website platform detector. See if a site runs on Shopify, WordPress, Webflow, Framer, Wix or custom code, plus its theme, likely plan, hosting, tech stack, speed score and SEO basics.",
  /** Business name used in the footer, Privacy Policy and Terms. */
  ownerName: "HM Studio",
  /** Contact address shown in the legal pages. */
  contactEmail: "hinamanzoor101@gmail.com",
  country: "Pakistan",
  /** Date the Privacy Policy and Terms were last changed (shown on those pages). */
  legalUpdated: "26 September 2026",
  /** Your main website, linked from the footer. Leave empty to hide. */
  homepageUrl: "",

  /** Checks per rolling 24 hours for visitors who aren't signed in. Signed-in users are unlimited. */
  limits: {
    visitor: 3,
    /** Hidden safety net against bots on signed-in accounts (fair use). Real users never get near it. */
    accountFairUse: 200,
  },
};

export const PROJECT_TYPES = [
  "New website",
  "Website redesign",
  "Shopify store",
  "WordPress website",
  "Webflow / Framer site",
  "Landing page",
  "Other",
];

export const BUDGETS = ["Under $500", "$500 – $1,500", "$1,500 – $5,000", "$5,000+", "Not sure yet"];

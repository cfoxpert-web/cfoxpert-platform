export interface NavItem {
  label: string;
  href: string;
}

/**
 * In the HTML prototypes, this exact list was copy-pasted into 8 files with
 * only the `active` class differing. Here it's defined once; active-state
 * is derived from the current pathname in components/layout/header.tsx.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Platform", href: "/platform" },
  { label: "Business Health Check", href: "/health-check" },
  { label: "Knowledge Hub", href: "/knowledge" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const SITE_CONFIG = {
  name: "CFOxpert",
  tagline: "Business Performance Platform",
  legalEntity: "Paramount Legal Bistro LLP",
  address: {
    line1: "E-107, Sector-6, Near Noida Authority",
    line2: "Noida – 201301, India",
  },
  contact: {
    phones: ["+91 9582722181", "+91 9899907075"],
    email: "info@cfoxpert.in",
    website: "www.cfoxpert.in",
  },
  primaryCta: {
    label: "Book Health Check",
    href: "/health-check",
  },
} as const;

export const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "Dashboard", href: "/platform#command" },
      { label: "Health Score", href: "/platform#score" },
      { label: "Board Packs", href: "/platform#boardpacks" },
      { label: "Action Tracker", href: "/platform#actions" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Knowledge Hub", href: "/knowledge" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: SITE_CONFIG.contact.phones[0], href: `tel:${SITE_CONFIG.contact.phones[0].replace(/\s/g, "")}` },
      { label: SITE_CONFIG.contact.email, href: `mailto:${SITE_CONFIG.contact.email}` },
      { label: SITE_CONFIG.contact.website, href: `https://${SITE_CONFIG.contact.website}` },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
] as const;

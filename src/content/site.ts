// Site-wide facts. Single source for name, address and phone (NAP) on every page and in JSON-LD.
// Area only: the exact address goes to guests after confirmation (CLAUDE.md).
export const SITE = {
  name: 'SAHA Residences',
  tagline: 'Well-kept homes in Lahore, booked directly with the people who look after them.',
  phoneE164: '+923205361616',
  phoneDisplay: '+92 320 5361616',
  whatsappNumber: '923205361616',
  area: 'DHA Phase 9 Town',
  city: 'Lahore',
  region: 'Punjab',
  countryCode: 'PK',
  country: 'Pakistan',
  /** Public listings, linked from reviews and trust badges. Fill in when ready. */
  airbnbListingUrl: null as string | null, // [PLACEHOLDER: public Airbnb listing URL]
  bookingComListingUrl: null as string | null, // [PLACEHOLDER: public Booking.com listing URL]
} as const;

export const areaLine = `${SITE.area}, ${SITE.city}`;

/** Click-to-chat link. The text is the guest's own message: dates and guest count, never personal data we hold. */
export function whatsappLink(text?: string) {
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export const NAV = [
  { href: '/stays/dha-retreat/', label: 'The house' },
  { href: '/location/', label: 'Location' },
  { href: '/faq/', label: 'FAQ' },
  { href: '/contact/', label: 'Contact' },
] as const;

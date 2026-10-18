// JSON-LD builders. Only types that fit and only content visible on the page (D-012):
// WebSite, Organization, VacationRental (understanding only, no rich result), BreadcrumbList.
// Never Review, AggregateRating or FAQPage.
import { SITE } from '../content/site';
import type { Listing } from '../content/listings';

type Json = Record<string, unknown>;

export function websiteLd(site: URL): Json {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: site.href };
}

export function organizationLd(site: URL, logoUrl: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: site.href,
    logo: logoUrl,
    telephone: SITE.phoneE164,
    address: { '@type': 'PostalAddress', addressLocality: SITE.city, addressRegion: SITE.region, addressCountry: SITE.countryCode },
    sameAs: [SITE.airbnbListingUrl, SITE.bookingComListingUrl].filter(Boolean),
  };
}

export function vacationRentalLd(listing: Listing, pageUrl: URL, imageUrls: string[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: listing.name,
    identifier: listing.slug,
    url: pageUrl.href,
    description: listing.summary,
    image: imageUrls,
    brand: { '@type': 'Brand', name: SITE.name },
    telephone: SITE.phoneE164,
    // Area only: the exact address and coordinates are shared after a booking is confirmed.
    address: { '@type': 'PostalAddress', addressLocality: SITE.city, addressRegion: SITE.region, addressCountry: SITE.countryCode },
    containsPlace: {
      '@type': 'Accommodation',
      additionalType: 'EntirePlace',
      numberOfBedrooms: listing.facts.bedrooms,
      numberOfBathroomsTotal: listing.facts.bathrooms,
      occupancy: { '@type': 'QuantitativeValue', value: listing.facts.maxGuests },
      bed: listing.rooms
        .filter((r) => r.beds !== 'No beds')
        .map((r) => ({ '@type': 'BedDetails', typeOfBed: r.beds })),
      amenityFeature: listing.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a.name, value: true })),
    },
  };
}

export function breadcrumbLd(items: { name: string; url: URL }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url.href })),
  };
}

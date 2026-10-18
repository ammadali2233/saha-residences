// Listing content for the public site (Phase 2). Pricing shown here is for display; live quotes come
// from the database through /api/pricing so the Book page always uses the current rules (D-030).
// Unknown facts stay as visible placeholders: never invent times, policies, distances or reviews.
import type { ImageMetadata } from 'astro';
import lounge from '../assets/photos/lounge-curved-sofa-dha-retreat-lahore.jpeg';
import master from '../assets/photos/master-bedroom-king-bed-dha-retreat-lahore.jpeg';
import second from '../assets/photos/second-bedroom-queen-bed-dha-retreat-lahore.jpeg';
import third from '../assets/photos/third-bedroom-two-single-beds-dha-retreat-lahore.jpeg';
import type { IconName } from '../components/icons';

export interface Photo {
  src: ImageMetadata;
  alt: string;
  caption: string;
  /** Doesn't meet the brand guide's photo rules yet; shown until a reshoot replaces it. */
  reshoot?: string;
}

export interface Listing {
  slug: string;
  name: string;
  status: 'published' | 'draft';
  area: string;
  headline: string;
  summary: string;
  facts: { bedrooms: number; bathrooms: number; sleeps: number; maxGuests: number };
  priceFrom: { amount: string; note: string };
  extraBedding: string;
  depositPct: number;
  hero: { mobile: Photo; desktop: Photo };
  photos: Photo[];
  rooms: { name: string; beds: string; detail: string; photo?: Photo }[];
  missingPhotos: string[];
  amenities: { name: string; icon: IconName; detail: string }[];
  highlights: { title: string; body: string }[];
  rules: { icon: IconName; title: string; detail: string }[];
  nearby: { place: string; time: string }[];
  videoId: string | null;
}

const PHOTOS = {
  master: {
    src: master,
    alt: 'Master bedroom at DHA Retreat: king bed with a green velvet headboard, matching bench, lamps on both bedside tables and floor-length green curtains',
    caption: 'Master bedroom. King bed.',
  },
  second: {
    src: second,
    alt: 'Second bedroom: queen bed with a grey upholstered headboard, two bedside lamps and blackout blinds',
    caption: 'Second bedroom. Queen bed.',
  },
  third: {
    src: third,
    alt: 'Third bedroom: two single beds with grey headboards and a shared bedside table with a lamp',
    caption: 'Third bedroom. Two single beds.',
  },
  lounge: {
    src: lounge,
    alt: 'Lounge: curved grey sofa with cushions, two round coffee tables, a bean bag and a wall-mounted TV',
    caption: 'Lounge. Curved sofa and smart TV.',
    reshoot: 'TV is on with streaming logos. Reshoot with the TV off (brand guide photo rules).',
  },
} satisfies Record<string, Photo>;

export const DHA_RETREAT: Listing = {
  slug: 'dha-retreat',
  name: 'DHA Retreat',
  status: 'published',
  area: 'DHA Phase 9 Town, Lahore',
  headline: 'Come home to Lahore.',
  summary: 'A three-bedroom house in DHA Phase 9 Town with solar backup, a caretaker on site and room for six.',
  facts: { bedrooms: 3, bathrooms: 4, sleeps: 6, maxGuests: 8 },
  priceFrom: { amount: 'USD 60', note: 'per night for up to 6 guests' },
  extraBedding: 'Guests 7 and 8 sleep on extra bedding at PKR 1,000 per bedding per night.',
  depositPct: 20,
  hero: { mobile: PHOTOS.master, desktop: PHOTOS.lounge },
  photos: [PHOTOS.master, PHOTOS.lounge, PHOTOS.second, PHOTOS.third],
  rooms: [
    { name: 'Master bedroom', beds: 'King bed', detail: 'Air conditioning, velvet curtains and sheers. [PLACEHOLDER: en-suite bathroom? confirm]', photo: PHOTOS.master },
    { name: 'Second bedroom', beds: 'Queen bed', detail: 'Air conditioning and roller blinds.', photo: PHOTOS.second },
    { name: 'Third bedroom', beds: 'Two single beds', detail: 'Air conditioning, roller blinds and a ceiling fan.', photo: PHOTOS.third },
    { name: 'Lounge and dining', beds: 'No beds', detail: 'Curved sofa, smart TV and a dining table.', photo: PHOTOS.lounge },
    { name: 'Games room', beds: 'No beds', detail: 'A separate room for games, with a study table for work.' },
    { name: 'Kitchen', beds: 'No beds', detail: 'Fully equipped for home cooking.' },
  ],
  missingPhotos: ['Bathrooms', 'Kitchen', 'Games room and workspace', 'Dining area', 'Outside and car porch'],
  amenities: [
    { name: 'Solar and UPS backup', icon: 'sun', detail: 'Lights, fans and Wi-Fi stay on through load shedding.' },
    { name: 'Wi-Fi', icon: 'wifi', detail: 'Internet throughout the house. [PLACEHOLDER: connection type and speed]' },
    { name: 'Workspace', icon: 'laptop', detail: 'A study table in the games room for calls and a full working day.' },
    { name: 'Caretaker on site', icon: 'user-check', detail: 'On site to help with anything the house needs during your stay.' },
    { name: 'Air conditioning', icon: 'air-vent', detail: 'In the lounge and every bedroom.' },
    { name: 'Covered parking', icon: 'car', detail: 'Car porch inside the gate.' },
    { name: 'Games room', icon: 'gamepad-2', detail: 'A separate room for games and downtime.' },
    { name: 'Kitchen', icon: 'cooking-pot', detail: 'Fully equipped for home cooking.' },
    { name: 'Exterior cameras', icon: 'cctv', detail: 'Security cameras around the outside of the house.' },
    { name: 'Room for families', icon: 'users', detail: 'Sleeps six in beds, up to eight with extra bedding.' },
  ],
  highlights: [
    { title: 'Power that stays on', body: 'Solar panels and a UPS keep the lights, fans and Wi-Fi running through load shedding.' },
    { title: 'Someone on hand', body: 'Our caretaker is on site to help with anything the house needs while you stay.' },
    { title: 'Room to spread out', body: 'Three bedrooms, four bathrooms, a lounge, a games room and a desk to work from.' },
  ],
  rules: [
    { icon: 'clock', title: 'Check-in', detail: '[PLACEHOLDER: check-in time]' },
    { icon: 'clock', title: 'Check-out', detail: '[PLACEHOLDER: check-out time]' },
    { icon: 'users', title: 'Up to 8 guests', detail: '6 in beds, 7 and 8 on extra bedding' },
    { icon: 'ban', title: 'Smoking', detail: '[PLACEHOLDER: smoking rule]' },
    { icon: 'volume-x', title: 'Parties and events', detail: '[PLACEHOLDER: parties and quiet hours rule]' },
    { icon: 'id-card', title: 'ID at check-in', detail: '[PLACEHOLDER: ID required, e.g. CNIC or passport for adults]' },
  ],
  // From the owner's flyer: approximate drive times. [PLACEHOLDER: confirm before launch]
  nearby: [
    { place: 'DHA 9 Town Park', time: '4 min' },
    { place: 'DHA Raya and Fairways Commercial', time: '15 min' },
    { place: 'Dolmen Mall', time: '15 min' },
    { place: '2F2F Formula Karting', time: '20 min' },
    { place: 'Allama Iqbal International Airport', time: '25 min' },
    { place: 'Neon Square', time: '25 min' },
    { place: 'Gulberg and MM Alam Road', time: '30 min' },
  ],
  videoId: null, // [PLACEHOLDER: YouTube video ID once the walkthrough is uploaded]
};

export const LISTINGS = [DHA_RETREAT].filter((l) => l.status === 'published');

export function listingBySlug(slug: string) {
  return LISTINGS.find((l) => l.slug === slug);
}

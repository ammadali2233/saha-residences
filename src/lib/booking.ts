// Shared by the booking API routes and the thank-you page.
import type { Currency, PricingRules } from './pricing/quote';
import type { supabaseAnon } from './supabase';

export interface PublicPricing {
  rules: PricingRules;
  usdPkrRate: string;
  usdPkrRateSetOn: string | null;
}

export async function loadPricing(db: ReturnType<typeof supabaseAnon>, slug: string): Promise<PublicPricing | null> {
  const { data, error } = await db.rpc('public_pricing', { p_slug: slug }).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    rules: {
      baseRateMinor: Number(row.base_rate_minor),
      baseCurrency: row.base_currency as Currency,
      includedGuests: Number(row.included_guests),
      maxGuests: Number(row.max_guests),
      extraGuestFeeMinor: Number(row.extra_guest_fee_minor),
      extraGuestFeeCurrency: row.extra_guest_fee_currency as Currency,
      minNights: Number(row.min_nights),
      depositPct: Number(row.deposit_pct),
    },
    usdPkrRate: String(row.usd_pkr_rate ?? ''),
    usdPkrRateSetOn: (row.usd_pkr_rate_set_on as string | null) ?? null,
  };
}

/**
 * Normalizes a phone number to E.164. Accepts "+92 320 1234567", "0092...", or a Pakistani
 * mobile written locally ("0320 1234567"). Returns null if it can't be a valid number.
 */
export function normalizePhone(input: string): string | null {
  let s = input.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  else if (/^0\d{10}$/.test(s)) s = `+92${s.slice(1)}`;
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}

/** What the thank-you page shows. Carried in a short-lived cookie, never in the URL. */
export interface RequestSummary {
  ref: string;
  slug: string;
  name: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  currency: Currency;
  totalMinor: number;
  depositMinor: number;
}

export const SUMMARY_COOKIE = 'saha_request';

export const REQUEST_ERRORS: Record<string, string> = {
  dates_unavailable: 'Those dates have just been booked. Please choose other dates.',
  invalid_dates: 'Please choose a check-in date from today onwards and a check-out date after it.',
  invalid_guests: 'Please choose between 1 and 8 guests.',
  invalid_name: 'Please enter your name.',
  invalid_phone: 'Please enter your WhatsApp number with the country code, for example +92 300 1234567.',
  rate_limited: 'We have received several requests from this number today. Please message us on WhatsApp instead.',
  unavailable: 'We couldn’t send your request just now. Please try again, or message us on WhatsApp.',
};

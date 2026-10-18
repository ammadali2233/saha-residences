import type { APIRoute } from 'astro';
import { SUMMARY_COOKIE, loadPricing, normalizePhone, type RequestSummary } from '../../lib/booking';
import { quote, type Currency } from '../../lib/pricing/quote';
import { supabaseAnon } from '../../lib/supabase';

export const prerender = false;

const KNOWN_ERRORS = new Set(['dates_unavailable', 'invalid_dates', 'invalid_guests', 'invalid_name', 'invalid_phone', 'rate_limited']);

/**
 * Booking request (option A, D-006). Works as a plain form post, with or without JavaScript.
 * Re-quotes on the server from the live pricing rules; the database re-checks dates, guests and
 * availability. Success sets a short-lived summary cookie and redirects, so nothing personal goes in a URL.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const field = (k: string) => String(form.get(k) ?? '').trim();

  const slug = field('stay') || 'dha-retreat';
  const checkIn = field('checkin');
  const checkOut = field('checkout');
  const guests = Number.parseInt(field('guests'), 10);
  const currency: Currency = field('currency') === 'PKR' ? 'PKR' : 'USD';
  const back = (error: string) => {
    // Only booking choices go back in the URL, never the guest's name, phone or message.
    const q = new URLSearchParams({ stay: slug, checkin: checkIn, checkout: checkOut, guests: String(guests || ''), currency, error });
    return redirect(`/book/?${q}#request`, 303);
  };

  // Spam trap: real people never fill this hidden field.
  if (field('website')) return redirect('/book/thanks/', 303);

  const name = field('name');
  if (!name || name.length > 120) return back('invalid_name');
  const phone = normalizePhone(field('phone'));
  if (!phone) return back('invalid_phone');
  const email = field('email').slice(0, 200);
  const tripType = ['family', 'corporate', 'other'].includes(field('trip_type')) ? field('trip_type') : null;
  const message = field('message').slice(0, 2000);

  const db = supabaseAnon();
  let pricing;
  try {
    pricing = await loadPricing(db, slug);
  } catch {
    return back('unavailable');
  }
  if (!pricing) return back('unavailable');

  const q = quote(pricing.rules, { checkIn, checkOut, guests, currency, usdPkrRate: pricing.usdPkrRate });
  if (!q.ok) return back(q.error === 'too_many_guests' || q.error === 'too_few_guests' ? 'invalid_guests' : 'invalid_dates');

  const quoteRecord = {
    currency: q.currency,
    nights: q.nights,
    extra_beddings: q.extraBeddings,
    lines: q.lines,
    total_minor: q.totalMinor,
    deposit_minor: q.depositMinor,
    usd_pkr_rate: q.usdPkrRate,
  };

  const { data: ref, error } = await db.rpc('submit_booking_request', {
    p_slug: slug,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_adults: guests,
    p_children: 0,
    p_full_name: name,
    p_phone: phone,
    p_email: email || null,
    p_trip_type: tripType,
    p_message: message || null,
    p_currency: currency,
    p_quote: quoteRecord,
  });
  if (error || !ref) {
    const code = KNOWN_ERRORS.has(error?.message ?? '') ? error!.message : 'unavailable';
    return back(code);
  }

  await db.rpc('log_site_event', { p_event: 'booking_request_submitted', p_path: '/book/' });

  const summary: RequestSummary = {
    ref: String(ref),
    slug,
    name: name.split(/\s+/)[0],
    checkIn,
    checkOut,
    nights: q.nights,
    guests,
    currency,
    totalMinor: q.totalMinor,
    depositMinor: q.depositMinor,
  };
  cookies.set(SUMMARY_COOKIE, encodeURIComponent(JSON.stringify(summary)), {
    path: '/book/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60,
  });
  return redirect('/book/thanks/', 303);
};

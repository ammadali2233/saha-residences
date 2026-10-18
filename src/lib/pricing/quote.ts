// Stay quote shown on the Book page and stored with each request (D-024).
// Pure and integer-only: money is minor units (cents, paisa); the FX rate is a decimal string.
// Rules (CLAUDE.md): base rate per night for up to `includedGuests`; each guest above that needs
// one extra bedding at a per-night fee; the security deposit is a % of the stay total, held and
// returned after checkout, so it is shown separately and never added to the total.

export type Currency = 'USD' | 'PKR';

export interface PricingRules {
  baseRateMinor: number;
  baseCurrency: Currency;
  includedGuests: number;
  maxGuests: number;
  extraGuestFeeMinor: number;
  extraGuestFeeCurrency: Currency;
  minNights: number;
  depositPct: number;
}

export interface QuoteInput {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
  currency: Currency;
  /** PKR per 1 USD, e.g. "280.00". Set by hand in the dashboard. */
  usdPkrRate: string;
}

export interface QuoteLine {
  key: 'nights' | 'extra_bedding';
  unitMinor: number;
  quantity: number;
  amountMinor: number;
}

export type QuoteError = 'invalid_dates' | 'min_nights' | 'too_many_guests' | 'too_few_guests' | 'invalid_rate';

export type Quote =
  | {
      ok: true;
      currency: Currency;
      nights: number;
      extraBeddings: number;
      lines: QuoteLine[];
      totalMinor: number;
      depositMinor: number;
      usdPkrRate: string;
    }
  | { ok: false; error: QuoteError };

const RATE_SCALE = 10_000n;
const DAY_MS = 86_400_000;

/** Nights between two calendar dates; null if either is malformed. */
export function nightsBetween(checkIn: string, checkOut: string): number | null {
  const a = parseDate(checkIn);
  const b = parseDate(checkOut);
  if (a === null || b === null) return null;
  return Math.round((b - a) / DAY_MS);
}

function parseDate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  return d.getUTCDate() === Number(m[3]) && d.getUTCMonth() === Number(m[2]) - 1 ? t : null;
}

/** "280.55" -> 2_805_500n (4 decimal places). Null if not a positive decimal. */
export function parseRate(rate: string): bigint | null {
  const m = /^(\d{1,6})(?:\.(\d{1,4}))?$/.exec(rate.trim());
  if (!m) return null;
  const scaled = BigInt(m[1]) * RATE_SCALE + BigInt((m[2] ?? '').padEnd(4, '0'));
  return scaled > 0n ? scaled : null;
}

/** Divide and round half up (amounts here are never negative). */
function divRound(n: bigint, d: bigint): bigint {
  return (n * 2n + d) / (d * 2n);
}

/**
 * Converts an amount into the display currency. Both currencies have 2 decimals, so
 * cents x rate = paisa. PKR is rounded to whole rupees (how guests pay); USD to whole cents.
 */
export function convert(amountMinor: number, from: Currency, to: Currency, rateScaled: bigint): number {
  if (from === to) return amountMinor;
  const amount = BigInt(amountMinor);
  if (from === 'USD') {
    const paisa = divRound(amount * rateScaled, RATE_SCALE);
    return Number(divRound(paisa, 100n) * 100n);
  }
  return Number(divRound(amount * RATE_SCALE, rateScaled));
}

export function quote(rules: PricingRules, input: QuoteInput): Quote {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights === null || nights <= 0) return { ok: false, error: 'invalid_dates' };
  if (nights < rules.minNights) return { ok: false, error: 'min_nights' };
  if (!Number.isInteger(input.guests) || input.guests < 1) return { ok: false, error: 'too_few_guests' };
  if (input.guests > rules.maxGuests) return { ok: false, error: 'too_many_guests' };
  const rate = parseRate(input.usdPkrRate);
  if (rate === null) return { ok: false, error: 'invalid_rate' };

  const cur = input.currency;
  const nightly = convert(rules.baseRateMinor, rules.baseCurrency, cur, rate);
  const lines: QuoteLine[] = [{ key: 'nights', unitMinor: nightly, quantity: nights, amountMinor: nightly * nights }];

  const extraBeddings = Math.max(0, input.guests - rules.includedGuests);
  if (extraBeddings > 0) {
    const perBedNight = convert(rules.extraGuestFeeMinor, rules.extraGuestFeeCurrency, cur, rate);
    const quantity = extraBeddings * nights;
    lines.push({ key: 'extra_bedding', unitMinor: perBedNight, quantity, amountMinor: perBedNight * quantity });
  }

  const totalMinor = lines.reduce((sum, l) => sum + l.amountMinor, 0);
  let depositMinor = Number(divRound(BigInt(totalMinor) * BigInt(Math.round(rules.depositPct * 100)), 10_000n));
  if (cur === 'PKR') depositMinor = Number(divRound(BigInt(depositMinor), 100n) * 100n);

  return { ok: true, currency: cur, nights, extraBeddings, lines, totalMinor, depositMinor, usdPkrRate: input.usdPkrRate };
}

/** "USD 60", "USD 3.57", "PKR 16,800". Exact amounts, currency code first (brand guide: be exact). */
export function formatMoney(minor: number, currency: Currency): string {
  const major = minor / 100;
  const whole = minor % 100 === 0;
  return `${currency} ${major.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

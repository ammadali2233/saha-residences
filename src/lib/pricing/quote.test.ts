import { describe, expect, it } from 'vitest';
import { convert, formatMoney, nightsBetween, parseRate, quote, type PricingRules } from './quote';

// DHA Retreat as briefed: USD 60/night for up to 6, max 8, PKR 1,000 per extra bedding per night, 20% deposit.
const RULES: PricingRules = {
  baseRateMinor: 6000,
  baseCurrency: 'USD',
  includedGuests: 6,
  maxGuests: 8,
  extraGuestFeeMinor: 100000,
  extraGuestFeeCurrency: 'PKR',
  minNights: 1,
  depositPct: 20,
};
const base = { checkIn: '2026-12-12', checkOut: '2026-12-15', usdPkrRate: '280.00' } as const;

describe('quote: worked examples', () => {
  it('3 nights, 4 guests, in USD: USD 180, deposit USD 36', () => {
    const q = quote(RULES, { ...base, guests: 4, currency: 'USD' });
    expect(q).toMatchObject({ ok: true, nights: 3, extraBeddings: 0, totalMinor: 18000, depositMinor: 3600 });
  });

  it('3 nights, 8 guests, in USD: 2 extra beddings at PKR 1,000 = USD 3.57 each per night', () => {
    const q = quote(RULES, { ...base, guests: 8, currency: 'USD' });
    if (!q.ok) throw new Error(q.error);
    expect(q.lines).toEqual([
      { key: 'nights', unitMinor: 6000, quantity: 3, amountMinor: 18000 },
      { key: 'extra_bedding', unitMinor: 357, quantity: 6, amountMinor: 2142 },
    ]);
    expect(q.totalMinor).toBe(20142); // USD 201.42
    expect(q.depositMinor).toBe(4028); // 20% of 201.42 = 40.284 -> USD 40.28
  });

  it('3 nights, 8 guests, in PKR at 280.00: PKR 16,800 a night, total PKR 56,400', () => {
    const q = quote(RULES, { ...base, guests: 8, currency: 'PKR' });
    if (!q.ok) throw new Error(q.error);
    expect(q.lines[0]).toEqual({ key: 'nights', unitMinor: 1_680_000, quantity: 3, amountMinor: 5_040_000 });
    expect(q.lines[1]).toEqual({ key: 'extra_bedding', unitMinor: 100_000, quantity: 6, amountMinor: 600_000 });
    expect(q.totalMinor).toBe(5_640_000);
    expect(q.depositMinor).toBe(1_128_000); // PKR 11,280
  });

  it('rounds PKR to whole rupees: USD 60 at 281.37 = PKR 16,882.20 -> PKR 16,882', () => {
    const q = quote(RULES, { ...base, guests: 2, currency: 'PKR', usdPkrRate: '281.37' });
    if (!q.ok) throw new Error(q.error);
    expect(q.lines[0].unitMinor).toBe(1_688_200);
    expect(q.depositMinor % 100).toBe(0);
  });

  it('records the rate it used', () => {
    const q = quote(RULES, { ...base, guests: 2, currency: 'PKR', usdPkrRate: '279.5' });
    expect(q).toMatchObject({ ok: true, usdPkrRate: '279.5' });
  });
});

describe('quote: refusals', () => {
  it('refuses check-out on or before check-in', () => {
    expect(quote(RULES, { ...base, checkOut: '2026-12-12', guests: 2, currency: 'USD' })).toEqual({ ok: false, error: 'invalid_dates' });
    expect(quote(RULES, { ...base, checkIn: '2026-02-30', guests: 2, currency: 'USD' })).toEqual({ ok: false, error: 'invalid_dates' });
  });
  it('refuses more than 8 guests and fewer than 1', () => {
    expect(quote(RULES, { ...base, guests: 9, currency: 'USD' })).toEqual({ ok: false, error: 'too_many_guests' });
    expect(quote(RULES, { ...base, guests: 0, currency: 'USD' })).toEqual({ ok: false, error: 'too_few_guests' });
  });
  it('enforces the minimum stay', () => {
    expect(quote({ ...RULES, minNights: 4 }, { ...base, guests: 2, currency: 'USD' })).toEqual({ ok: false, error: 'min_nights' });
  });
  it('refuses a missing or zero rate', () => {
    expect(quote(RULES, { ...base, guests: 2, currency: 'USD', usdPkrRate: '' })).toEqual({ ok: false, error: 'invalid_rate' });
    expect(quote(RULES, { ...base, guests: 2, currency: 'USD', usdPkrRate: '0' })).toEqual({ ok: false, error: 'invalid_rate' });
  });
});

describe('helpers', () => {
  it('counts nights across month and year ends', () => {
    expect(nightsBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(nightsBetween('2028-02-28', '2028-03-01')).toBe(2); // leap year
  });
  it('parses rates without floating point', () => {
    expect(parseRate('280')).toBe(2_800_000n);
    expect(parseRate('280.5')).toBe(2_805_000n);
    expect(parseRate('abc')).toBeNull();
  });
  it('converts PKR to USD to the cent', () => {
    expect(convert(100_000, 'PKR', 'USD', 2_800_000n)).toBe(357);
  });
  it('formats exact amounts with the currency code first', () => {
    expect(formatMoney(18000, 'USD')).toBe('USD 180');
    expect(formatMoney(20142, 'USD')).toBe('USD 201.42');
    expect(formatMoney(5_640_000, 'PKR')).toBe('PKR 56,400');
  });
});

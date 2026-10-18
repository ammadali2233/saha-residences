// Book page island: availability calendar, guests, currency, live price breakdown and the request form.
// Submits as a normal form post to /api/booking-request/ (which re-checks everything on the server).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TargetedKeyboardEvent, TargetedSubmitEvent } from 'preact';
import { formatMoney, quote, type Currency, type PricingRules } from '../lib/pricing/quote';
import { REQUEST_ERRORS } from '../lib/booking';

interface Props {
  slug: string;
  name: string;
  maxGuests: number;
  includedGuests: number;
  depositPct: number;
  whatsappNumber: string;
}

interface Pricing {
  rules: PricingRules;
  usdPkrRate: string;
  usdPkrRateSetOn: string | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromKey = (k: string) => new Date(`${k}T00:00:00Z`);
const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
};
const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromKey(s).getTime());
const todayInLahore = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
const longDate = (k: string) => {
  const d = fromKey(k);
  return `${DAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const shortDate = (k: string) => {
  const d = fromKey(k);
  return `${DAYS_LONG[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
};

function beacon(event: string) {
  try {
    navigator.sendBeacon?.('/api/e/', new Blob([JSON.stringify({ event, path: location.pathname })], { type: 'application/json' }));
  } catch {
    /* analytics never blocks booking */
  }
}

export default function BookingForm(props: Props) {
  const today = useMemo(todayInLahore, []);
  const params = useMemo(() => new URLSearchParams(location.search), []);

  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [month, setMonth] = useState(today.slice(0, 7));
  // Direction of the last month change, so the grid slides the way the guest moved (motion: state 400ms).
  const [monthDir, setMonthDir] = useState<0 | 1 | -1>(0);
  const [focusKey, setFocusKey] = useState(today);
  const [formError, setFormError] = useState<string | null>(null);
  const started = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Restore choices from the homepage bar or a returned error (booking choices only, never personal data).
  useEffect(() => {
    const ci = params.get('checkin');
    const co = params.get('checkout');
    if (isDate(ci) && ci >= today) {
      setCheckIn(ci);
      setMonth(ci.slice(0, 7));
      setFocusKey(ci);
      if (isDate(co) && co > ci) setCheckOut(co);
    }
    const g = Number.parseInt(params.get('guests') ?? '', 10);
    if (g >= 1 && g <= props.maxGuests) setGuests(g);
    if (params.get('currency') === 'PKR') setCurrency('PKR');
    const err = params.get('error');
    if (err) setFormError(REQUEST_ERRORS[err] ?? REQUEST_ERRORS.unavailable);
  }, []);

  useEffect(() => {
    if (formError) errorRef.current?.focus();
  }, [formError]);

  useEffect(() => {
    const to = addDays(today, 400);
    Promise.all([
      fetch(`/api/pricing/?stay=${props.slug}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/availability/?stay=${props.slug}&from=${today}&to=${to}`).then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([p, a]: [Pricing, { blocked: [string, string][] }]) => {
        setPricing(p);
        const nights = new Set<string>();
        for (const [start, end] of a.blocked) for (let d = start; d < end; d = addDays(d, 1)) nights.add(d);
        setBlocked(nights);
      })
      .catch(() => setLoadError(true));
  }, []);

  // A date can start a stay if it's today or later and that night is free.
  const canCheckIn = (k: string) => k >= today && !blocked.has(k);
  // A check-out is valid if every night from check-in up to it is free.
  const canCheckOut = (k: string) => {
    if (!checkIn || k <= checkIn) return false;
    for (let d = checkIn; d < k; d = addDays(d, 1)) if (blocked.has(d)) return false;
    return true;
  };
  const choosingOut = !!checkIn && !checkOut;

  function pick(k: string) {
    if (!started.current) {
      started.current = true;
      beacon('booking_started');
    }
    setFormError(null);
    if (choosingOut && canCheckOut(k)) setCheckOut(k);
    else if (canCheckIn(k)) {
      setCheckIn(k);
      setCheckOut(null);
    }
  }

  // Calendar cells for the visible month, Monday first.
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`)];
  const firstMonth = today.slice(0, 7);
  const lastMonth = addDays(today, 365).slice(0, 7);
  const shiftMonth = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    const next = toKey(d).slice(0, 7);
    if (next < firstMonth || next > lastMonth) return;
    setMonthDir(n > 0 ? 1 : -1);
    setMonth(next);
    setFocusKey(next === firstMonth ? today : `${next}-01`);
  };

  // Roving focus: one day is tabbable; arrow keys move between days and across months.
  function onGridKey(e: TargetedKeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in moves) && e.key !== 'PageUp' && e.key !== 'PageDown') return;
    e.preventDefault();
    keyboardNav.current = true;
    let next = e.key === 'PageUp' ? addDays(focusKey, -28) : e.key === 'PageDown' ? addDays(focusKey, 28) : addDays(focusKey, moves[e.key]);
    if (next < today) next = today;
    setFocusKey(next);
    if (next.slice(0, 7) !== month) {
      setMonthDir(next > focusKey ? 1 : -1);
      setMonth(next.slice(0, 7));
    }
  }
  // Keyboard moves keep focus on the day, even when the month grid re-renders for its slide transition.
  const keyboardNav = useRef(false);
  useEffect(() => {
    if (keyboardNav.current || gridRef.current?.contains(document.activeElement)) {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusKey}"]`)?.focus();
      keyboardNav.current = false;
    }
  }, [focusKey, month]);

  const q = pricing && checkIn && checkOut
    ? quote(pricing.rules, { checkIn, checkOut, guests, currency, usdPkrRate: pricing.usdPkrRate })
    : null;
  const converts = pricing && (pricing.rules.baseCurrency !== currency || pricing.rules.extraGuestFeeCurrency !== currency);
  const extra = Math.max(0, guests - props.includedGuests);

  function onSubmit(e: TargetedSubmitEvent<HTMLFormElement>) {
    if (!checkIn || !checkOut) {
      e.preventDefault();
      setFormError('Please choose your check-in and check-out dates in the calendar.');
      return;
    }
    if (q && !q.ok) {
      e.preventDefault();
      setFormError(REQUEST_ERRORS[q.error === 'too_many_guests' ? 'invalid_guests' : 'invalid_dates']);
    }
  }

  const dayState = (k: string) => {
    const past = k < today;
    const night = blocked.has(k);
    const selectable = choosingOut ? canCheckOut(k) || canCheckIn(k) : canCheckIn(k);
    const isEnd = k === checkIn || k === checkOut;
    const inRange = !!checkIn && !!checkOut && k > checkIn && k < checkOut;
    return { past, night, selectable, isEnd, inRange };
  };

  return (
    <div class="booking">
      <section class="panel" aria-labelledby="dates-title">
        <h2 id="dates-title" class="panel-title">1. Choose your dates</h2>
        <p class="hint" aria-live="polite">
          {!checkIn ? 'Select your check-in date.' : !checkOut ? `Check-in ${shortDate(checkIn)}. Now select your check-out date.` : `${shortDate(checkIn)} to ${shortDate(checkOut)}.`}
        </p>
        <div class="cal">
          <div class="cal-head">
            <button type="button" class="nav" onClick={() => shiftMonth(-1)} disabled={month <= firstMonth} aria-label="Previous month">‹</button>
            <span class="cal-title" aria-live="polite">{MONTHS[m - 1]} {y}</span>
            <button type="button" class="nav" onClick={() => shiftMonth(1)} disabled={month >= lastMonth} aria-label="Next month">›</button>
          </div>
          <div class="dow" aria-hidden="true">{DAYS_SHORT.map((d) => <span>{d}</span>)}</div>
          <div key={month} class={`days${monthDir === 1 ? ' slide-next' : monthDir === -1 ? ' slide-prev' : ''}`} role="group" aria-label={`${MONTHS[m - 1]} ${y}`} ref={gridRef} onKeyDown={onGridKey}>
            {cells.map((k, i) => {
              if (!k) return <span key={`pad-${i}`} />;
              const s = dayState(k);
              const label = `${longDate(k)}${s.past ? ', past' : s.selectable ? '' : s.night ? ', booked' : ', not available for this stay'}${k === checkIn ? ', check-in' : ''}${k === checkOut ? ', check-out' : ''}`;
              return (
                <button
                  key={k}
                  type="button"
                  data-day={k}
                  class={`day${s.isEnd ? ' end' : ''}${s.inRange ? ' range' : ''}${s.night ? ' booked' : ''}`}
                  aria-label={label}
                  aria-pressed={s.isEnd}
                  aria-disabled={!s.selectable}
                  tabIndex={k === focusKey ? 0 : -1}
                  onClick={() => s.selectable && pick(k)}
                  onFocus={() => setFocusKey(k)}
                >
                  {Number(k.slice(8))}
                </button>
              );
            })}
          </div>
          <div class="legend">
            <span><i class="sw sel" />Selected</span>
            <span><i class="sw rng" />Your stay</span>
            <span><s>14</s> Booked</span>
          </div>
        </div>
        {loadError && <p class="warn" role="status">We couldn't load live availability. You can still send a request and we'll confirm the dates on WhatsApp.</p>}
      </section>

      <section class="panel" aria-labelledby="guests-title">
        <h2 id="guests-title" class="panel-title">2. Guests and currency</h2>
        <div class="row">
          <div>
            <span class="label" id="guests-label">Guests</span>
            <div class="stepper" role="group" aria-labelledby="guests-label">
              <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} aria-label="Fewer guests">−</button>
              <output aria-live="polite">{guests} {guests === 1 ? 'guest' : 'guests'}</output>
              <button type="button" onClick={() => setGuests((g) => Math.min(props.maxGuests, g + 1))} disabled={guests >= props.maxGuests} aria-label="More guests">+</button>
            </div>
            <p class="hint">
              {extra > 0 ? `${extra} extra ${extra === 1 ? 'bedding' : 'beddings'} for guests ${props.includedGuests + 1}${extra > 1 ? ` and ${props.includedGuests + extra}` : ''}.` : `Up to ${props.includedGuests} sleep in beds. Up to ${props.maxGuests} with extra bedding.`}
            </p>
          </div>
          <fieldset class="currency">
            <legend class="label">Show and pay in</legend>
            {(['USD', 'PKR'] as Currency[]).map((c) => (
              <label class={currency === c ? 'on' : ''}>
                <input type="radio" name="currency-view" value={c} checked={currency === c} onChange={() => setCurrency(c)} />
                {c}
              </label>
            ))}
          </fieldset>
        </div>
      </section>

      <section class="panel price" aria-labelledby="price-title" aria-live="polite">
        <h2 id="price-title" class="panel-title">3. Your price</h2>
        {!pricing && !loadError && <p class="hint">Loading prices…</p>}
        {pricing && !q && <p class="hint">Choose your dates to see the full price.</p>}
        {q && !q.ok && <p class="warn">{q.error === 'min_nights' ? `The minimum stay is ${pricing!.rules.minNights} nights.` : 'Please check your dates and guests.'}</p>}
        {q && q.ok && (
          <>
            <dl class="lines">
              {q.lines.map((l) => (
                <div>
                  <dt>{l.key === 'nights' ? `${formatMoney(l.unitMinor, q.currency)} × ${q.nights} ${q.nights === 1 ? 'night' : 'nights'}` : `Extra bedding: ${q.extraBeddings} × ${q.nights} ${q.nights === 1 ? 'night' : 'nights'} at ${formatMoney(l.unitMinor, q.currency)}`}</dt>
                  <dd key={`${l.amountMinor}${q.currency}`} class="tick">{formatMoney(l.amountMinor, q.currency)}</dd>
                </div>
              ))}
              <div class="nofee"><dt>Cleaning and platform fees</dt><dd>None</dd></div>
              <div class="total"><dt>Total ({q.currency}), paid at check-in</dt><dd key={`${q.totalMinor}${q.currency}`} class="tick">{formatMoney(q.totalMinor, q.currency)}</dd></div>
              <div class="deposit"><dt>Security deposit to confirm ({props.depositPct}%), returned after checkout</dt><dd key={`${q.depositMinor}${q.currency}`} class="tick">{formatMoney(q.depositMinor, q.currency)}</dd></div>
            </dl>
            {converts && <p class="hint">Converted at PKR {pricing!.usdPkrRate} per USD{pricing!.usdPkrRateSetOn ? `, our rate on ${shortDate(pricing!.usdPkrRateSetOn)}` : ''}.</p>}
          </>
        )}
      </section>

      <form class="panel" id="request" method="post" action="/api/booking-request/" onSubmit={onSubmit} aria-labelledby="req-title" noValidate={false}>
        <h2 id="req-title" class="panel-title">4. Send your request</h2>
        <p class="hint">Nothing is charged now. We reply on WhatsApp to confirm your dates and send details for the deposit.</p>
        <input type="hidden" name="stay" value={props.slug} />
        <input type="hidden" name="checkin" value={checkIn ?? ''} />
        <input type="hidden" name="checkout" value={checkOut ?? ''} />
        <input type="hidden" name="guests" value={guests} />
        <input type="hidden" name="currency" value={currency} />
        <div class="hp" aria-hidden="true">
          <label>Leave this empty <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <div class="fields">
          <div class="field">
            <label class="label" for="f-name">Full name</label>
            <input id="f-name" name="name" autoComplete="name" required maxLength={120} />
          </div>
          <div class="field">
            <label class="label" for="f-phone">WhatsApp number</label>
            <input id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required aria-describedby="f-phone-hint" />
            <span class="hint" id="f-phone-hint">With country code, for example +92 300 1234567 or +44 7700 900123.</span>
          </div>
          <div class="field">
            <label class="label" for="f-email">Email (optional)</label>
            <input id="f-email" name="email" type="email" autoComplete="email" maxLength={200} />
          </div>
          <div class="field">
            <label class="label" for="f-trip">Trip type</label>
            <select id="f-trip" name="trip_type">
              <option value="family">Family or friends</option>
              <option value="corporate">Work or corporate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field wide">
            <label class="label" for="f-msg">Anything we should know? (optional)</label>
            <textarea id="f-msg" name="message" rows={3} maxLength={2000} />
          </div>
        </div>
        {formError && <p class="error" role="alert" tabIndex={-1} ref={errorRef}>{formError}</p>}
        <button class="btn btn-primary btn-block" type="submit">
          {q && q.ok ? `Send request · ${formatMoney(q.totalMinor, q.currency)}` : 'Send request'}
        </button>
        <p class="hint center">
          Prefer to chat? <a href={`https://wa.me/${props.whatsappNumber}?text=${encodeURIComponent(`Hello, I'd like to book ${props.name}${checkIn && checkOut ? ` from ${shortDate(checkIn)} to ${shortDate(checkOut)}` : ''} for ${guests} ${guests === 1 ? 'guest' : 'guests'}.`)}`} data-event="whatsapp_click">Ask on WhatsApp</a>
        </p>
      </form>
    </div>
  );
}

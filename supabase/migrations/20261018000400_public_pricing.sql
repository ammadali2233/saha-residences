-- Pricing rules for the public Book page (Phase 2). Returns only what a guest sees on the page:
-- no bookings, no guest data. The USD->PKR rate is the one manual display rate set in the dashboard (D-020).
create function public.public_pricing(p_slug text)
returns table (
  base_rate_minor bigint,
  base_currency text,
  included_guests int,
  max_guests int,
  extra_guest_fee_minor bigint,
  extra_guest_fee_currency text,
  min_nights int,
  deposit_pct numeric,
  usd_pkr_rate text,
  usd_pkr_rate_set_on text
)
language sql stable security definer set search_path = '' as $$
  select p.base_rate_minor, p.base_currency::text, p.included_guests, p.max_guests,
         p.extra_guest_fee_minor, p.extra_guest_fee_currency::text, p.min_nights, p.deposit_pct,
         s.value ->> 'rate', s.value ->> 'set_on'
    from public.properties p
    left join public.site_settings s on s.key = 'usd_pkr_display_rate'
   where p.slug = p_slug and p.status = 'published'
$$;

revoke execute on function public.public_pricing(text) from public;
grant execute on function public.public_pricing(text) to anon, authenticated;

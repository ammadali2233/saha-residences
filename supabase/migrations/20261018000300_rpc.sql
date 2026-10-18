-- Public RPCs and the staff bookings view (Phase 1).
-- The browser never calls Supabase; the Worker calls these with the anon key server-side.

-- Statuses that occupy the house. Inquiries, cancellations and no-shows don't block dates.
create function private.is_blocking(s public.booking_status) returns boolean
language sql immutable set search_path = '' as $$
  select s in ('confirmed', 'checked_in', 'checked_out')
$$;

-- ---------------------------------------------------------------- availability (date ranges only, no guest data)
create function public.public_availability(p_slug text, p_from date, p_to date)
returns table (start_date date, end_date date)
language plpgsql stable security definer set search_path = '' as $$
declare v_property uuid;
begin
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > 550 then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  select id into v_property from public.properties where slug = p_slug and status = 'published';
  if v_property is null then
    return;
  end if;
  return query
    select greatest(b.check_in, p_from), least(b.check_out, p_to)
      from public.bookings b
     where b.property_id = v_property and b.deleted_at is null and private.is_blocking(b.status)
       and b.check_in < p_to and b.check_out > p_from
    union all
    select greatest(c.start_date, p_from), least(c.end_date, p_to)
      from public.calendar_blocks c
     where c.property_id = v_property and c.deleted_at is null
       and c.start_date < p_to and c.end_date > p_from
    order by 1;
end $$;

-- ---------------------------------------------------------------- booking request from the website (Option A, D-006)
-- Creates an inquiry. The stored quote is what the guest saw; the admin sets the real amount on confirmation.
create function public.submit_booking_request(
  p_slug text,
  p_check_in date,
  p_check_out date,
  p_adults int,
  p_children int,
  p_full_name text,
  p_phone text,
  p_email text,
  p_trip_type text,
  p_message text,
  p_currency text,
  p_quote jsonb
) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_prop public.properties%rowtype;
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_guests int := coalesce(p_adults, 0) + coalesce(p_children, 0);
  v_guest uuid;
  v_ref text;
begin
  select * into v_prop from public.properties where slug = p_slug and status = 'published';
  if v_prop.id is null then raise exception 'unknown_property' using errcode = '22023'; end if;

  if p_check_in is null or p_check_out is null or p_check_in < v_today or p_check_out <= p_check_in
     or p_check_out - p_check_in > 90 or p_check_out - p_check_in < v_prop.min_nights then
    raise exception 'invalid_dates' using errcode = '22023';
  end if;
  if coalesce(p_adults, 0) < 1 or coalesce(p_children, 0) < 0 or v_guests > v_prop.max_guests then
    raise exception 'invalid_guests' using errcode = '22023';
  end if;
  if p_full_name is null or length(trim(p_full_name)) not between 1 and 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if p_currency not in ('USD', 'PKR') then raise exception 'invalid_currency' using errcode = '22023'; end if;
  if p_quote is not null and length(p_quote::text) > 4000 then raise exception 'invalid_quote' using errcode = '22023'; end if;

  -- Abuse limits: 3 requests per phone per day, 30 website requests per hour overall.
  if (select count(*) from public.bookings b join public.guests g on g.id = b.guest_id
       where b.source = 'website' and g.phone_e164 = p_phone and b.created_at > now() - interval '1 day') >= 3
     or (select count(*) from public.bookings where source = 'website' and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  if exists (select 1 from public.public_availability(p_slug, p_check_in, p_check_out)) then
    raise exception 'dates_unavailable' using errcode = '23P01';
  end if;

  insert into public.guests (full_name, phone_e164, email)
  values (trim(p_full_name), p_phone, nullif(trim(p_email), ''))
  returning id into v_guest;

  insert into public.bookings (
    property_id, channel_id, guest_id, status, check_in, check_out, adults, children, extra_beddings,
    currency, source, trip_type, guest_message, quote, created_by)
  values (
    v_prop.id, (select id from public.channels where key = 'website'), v_guest, 'inquiry',
    p_check_in, p_check_out, p_adults, coalesce(p_children, 0), greatest(0, v_guests - v_prop.included_guests),
    p_currency, 'website', p_trip_type, nullif(trim(p_message), ''), p_quote, null)
  returning ref into v_ref;

  return v_ref;
end $$;

-- ---------------------------------------------------------------- conversion beacon (D-011)
create function public.log_site_event(p_event text, p_path text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_event in ('booking_started', 'booking_request_submitted', 'whatsapp_click', 'phone_click') then
    insert into public.site_events (event, path) values (p_event, left(p_path, 300));
  end if;
end $$;

-- ---------------------------------------------------------------- staff view: bookings without money (D-016)
-- Owner-privileged view so staff can see operational columns only; the WHERE clause enforces the role.
create view public.bookings_ops with (security_barrier = true) as
select b.id, b.ref, b.property_id, c.name as channel_name, b.status, b.check_in, b.check_out, b.nights,
       b.guest_count, b.extra_beddings, g.full_name as guest_name, g.phone_e164 as guest_phone,
       b.needs_details, b.sync_state, b.overlap_flag
  from public.bookings b
  join public.channels c on c.id = b.channel_id
  left join public.guests g on g.id = b.guest_id
 where b.deleted_at is null
   and (private.has_role('staff') or private.has_role('admin'));

revoke all on public.bookings_ops from anon, public;
grant select on public.bookings_ops to authenticated;

-- Staff move a stay through arrival and departure; everything else is admin-only.
create function public.staff_set_booking_status(p_booking uuid, p_status public.booking_status) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not (private.has_role('staff') or private.has_role('admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not private.has_role('admin') and p_status not in ('checked_in', 'checked_out', 'no_show') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.bookings set status = p_status where id = p_booking and deleted_at is null;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

-- ---------------------------------------------------------------- function privileges
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
grant execute on function public.public_availability(text, date, date) to anon, authenticated;
grant execute on function public.submit_booking_request(text, date, date, int, int, text, text, text, text, text, text, jsonb) to anon;
grant execute on function public.log_site_event(text, text) to anon;
grant execute on function public.staff_set_booking_status(uuid, public.booking_status) to authenticated;

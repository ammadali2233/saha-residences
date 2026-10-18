-- Proves the roles and permissions matrix (docs/phase-0-plan.md section 5) against seeded sample data.
begin;
create extension if not exists pgtap with schema extensions;
-- On hosted projects the CLI connects as a temporary login role without access to `extensions`;
-- run as postgres throughout, and return to postgres (not the login role) after each role switch.
set local role postgres;
set local search_path = public, extensions;
select plan(36);

-- ---------------------------------------------------------------- fixtures (as postgres)
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'admin@saha.test', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'staff@saha.test', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'partner@saha.test', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-8444-444444444444', 'staff2@saha.test', 'authenticated', 'authenticated');
insert into public.profiles (user_id, display_name, role) values
  ('11111111-1111-4111-8111-111111111111', 'Test Admin', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'Test Staff', 'staff'),
  ('33333333-3333-4333-8333-333333333333', 'Test Partner', 'partner'),
  ('44444444-4444-4444-8444-444444444444', 'Other Staff', 'staff');
update public.partners set user_id = '33333333-3333-4333-8333-333333333333'
 where id = '00000000-0000-4000-d000-000000000001';
insert into public.tasks (id, booking_id, title, assignee_id, created_by) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-4000-c000-000000000005', 'Staff task', '22222222-2222-4222-8222-222222222222', null),
  ('aaaaaaaa-0000-4000-8000-000000000002', null, 'Other staff task', '44444444-4444-4444-8444-444444444444', null);

create function pg_temp.act_as(uid uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
$$;

-- ---------------------------------------------------------------- generated money columns
select is((select nights from public.bookings where id = '00000000-0000-4000-c000-000000000001'), 5,
  'nights is generated from the dates');
select is((select gross_pkr_minor from public.bookings where id = '00000000-0000-4000-c000-000000000001'), 8433000::bigint,
  'USD gross converts to PKR at the booking''s own rate (300.00 x 281.10)');
select is((select net_payout_minor from public.bookings where id = '00000000-0000-4000-c000-000000000003'), 25500::bigint,
  'net payout = gross - commission');
select throws_ok(
  $$insert into public.bookings (property_id, channel_id, check_in, check_out, currency, gross_minor)
    values ('00000000-0000-4000-a000-000000000001', (select id from public.channels where key = 'whatsapp'),
            '2027-01-01', '2027-01-02', 'USD', 6000)$$,
  '23514', null, 'a USD amount without its FX rate is rejected');

-- ---------------------------------------------------------------- anonymous (public site)
set local role anon;
select throws_ok('select * from public.bookings', '42501', null, 'anon cannot read bookings');
select throws_ok('select * from public.guests', '42501', null, 'anon cannot read guests');
select throws_ok('select * from public.audit_log', '42501', null, 'anon cannot read the audit log');
select throws_ok('select * from public.bookings_ops', '42501', null, 'anon cannot read the staff bookings view');
select results_eq(
  $$select start_date, end_date from public.public_availability('dha-retreat', '2026-11-01', '2026-12-01')$$,
  $$values ('2026-11-01'::date, '2026-11-07'::date), ('2026-11-05'::date, '2026-11-08'::date), ('2026-11-22'::date, '2026-11-25'::date)$$,
  'availability returns blocking bookings and blocks as bare date ranges');
select is_empty(
  $$select * from public.public_availability('dha-retreat', '2026-12-10', '2026-12-20')$$,
  'inquiries do not block dates');
select results_eq(
  $$select base_rate_minor, base_currency, included_guests, max_guests, usd_pkr_rate from public.public_pricing('dha-retreat')$$,
  $$values (6000::bigint, 'USD', 6, 8, '280.00')$$,
  'anon can read the published pricing rules and display rate');
select is_empty($$select * from public.public_pricing('no-such-listing')$$, 'unknown or unpublished listings return no pricing');
select matches(
  public.submit_booking_request('dha-retreat', '2027-02-10', '2027-02-13', 4, 2, 'Test Guest', '+923001234567',
    'test@example.com', 'family', 'Arriving late', 'USD', '{"total_minor": 18000}'),
  '^SR-[0-9A-F]{6}$', 'anon can submit a booking request and gets a reference');
select throws_ok(
  $$select public.submit_booking_request('dha-retreat', '2026-11-02', '2026-11-04', 2, 0, 'Test', '+923001234568', null, null, null, 'USD', null)$$,
  '23P01', 'dates_unavailable', 'a request over booked dates is refused');
select throws_ok(
  $$select public.submit_booking_request('dha-retreat', '2027-03-01', '2027-03-03', 7, 2, 'Test', '+923001234569', null, null, null, 'USD', null)$$,
  '22023', 'invalid_guests', 'more than 8 guests is refused');
select throws_ok(
  $$select public.staff_set_booking_status('00000000-0000-4000-c000-000000000005', 'checked_out')$$,
  '42501', null, 'anon cannot change a booking status');
set local role postgres;

-- ---------------------------------------------------------------- admin
-- Count as postgres first, so the check holds whatever extra rows local testing has added.
select set_config('test.total_bookings', (select count(*) from public.bookings)::text, true);
set local role authenticated;
select pg_temp.act_as('11111111-1111-4111-8111-111111111111', 'aal1');
select is_empty('select * from public.bookings', 'admin without MFA (aal1) sees nothing');

select pg_temp.act_as('11111111-1111-4111-8111-111111111111', 'aal2');
select is((select count(*) from public.bookings), current_setting('test.total_bookings')::bigint, 'admin with MFA sees every booking');
select lives_ok(
  $$insert into public.payments (booking_id, kind, amount_minor, currency, fx_rate_to_pkr, received_on)
    values ('00000000-0000-4000-c000-000000000005', 'stay_payment', 15000, 'USD', 280.20, '2026-10-18')$$,
  'admin can record a payment');
select throws_ok($$delete from public.bookings where id = '00000000-0000-4000-c000-000000000007'$$,
  '42501', null, 'admin cannot hard-delete a booking (soft delete only)');
select lives_ok($$update public.bookings set deleted_at = now() where id = '00000000-0000-4000-c000-000000000007'$$,
  'admin can soft-delete a booking');
select is((select count(*) from public.audit_log where row_id = '00000000-0000-4000-c000-000000000007' and action = 'update'),
  1::bigint, 'the soft delete is in the audit log with the old and new row');
select throws_ok($$update public.audit_log set actor = null$$, '42501', null, 'nobody can edit the audit log');
set local role postgres;

-- ---------------------------------------------------------------- staff
set local role authenticated;
select pg_temp.act_as('22222222-2222-4222-8222-222222222222', 'aal2');
select is_empty('select * from public.bookings', 'staff cannot read the bookings table (money columns)');
select is_empty('select * from public.payments', 'staff cannot read payments');
select is_empty('select * from public.expenses', 'staff cannot read expenses');
select is_empty('select * from public.capital_contributions', 'staff cannot read partner capital');
select ok((select count(*) from public.bookings_ops) > 0, 'staff can read operational booking fields');
select hasnt_column('public', 'bookings_ops', 'gross_minor', 'the staff view has no money columns');
select results_eq('select title from public.tasks', $$values ('Staff task')$$, 'staff see only their own tasks');
select lives_ok($$select public.staff_set_booking_status('00000000-0000-4000-c000-000000000005', 'checked_out')$$,
  'staff can check a guest out');
select throws_ok($$select public.staff_set_booking_status('00000000-0000-4000-c000-000000000008', 'cancelled')$$,
  '42501', null, 'staff cannot cancel a booking');
set local role postgres;

-- ---------------------------------------------------------------- partner
set local role authenticated;
select pg_temp.act_as('33333333-3333-4333-8333-333333333333', 'aal2');
select is((select count(*) from public.capital_contributions), 1::bigint, 'partner sees only their own contributions');
select is_empty('select * from public.bookings_ops', 'partner cannot read bookings');
select is_empty('select * from public.guests', 'partner cannot read guest details');
select is_empty('select * from public.expenses', 'partner cannot read individual expenses');
set local role postgres;

select * from finish();
rollback;

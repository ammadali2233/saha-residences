-- SAMPLE DATA for local and staging review only. Every name, amount and rate below is invented
-- for testing the dashboard and is not a business fact. Never run against production.
-- Auth users are not seeded: create them with `npm run admin:create`.

-- ---------------------------------------------------------------- listing
insert into public.properties (id, slug, name, status, area_label, bedrooms, bathrooms, included_guests, max_guests,
  base_rate_minor, base_currency, extra_guest_fee_minor, extra_guest_fee_currency, deposit_pct, min_nights, summary)
values ('00000000-0000-4000-a000-000000000001', 'dha-retreat', 'DHA Retreat', 'published', 'DHA Phase 9 Town, Lahore',
  3, 4, 6, 8, 6000, 'USD', 100000, 'PKR', 20, 1,
  'A three-bedroom house in DHA Phase 9 Town with solar backup, a caretaker on site and room for six.');

insert into public.rooms (property_id, name, beds, sort) values
  ('00000000-0000-4000-a000-000000000001', 'Master bedroom', 'King bed', 1),
  ('00000000-0000-4000-a000-000000000001', 'Second bedroom', 'Queen bed', 2),
  ('00000000-0000-4000-a000-000000000001', 'Third bedroom', 'Two single beds', 3);

insert into public.amenities (key, label, icon, description, category) values
  ('wifi', 'Wi-Fi', 'wifi', 'Fibre internet throughout the house.', 'essentials'),
  ('solar-ups', 'Solar + UPS backup', 'sun', 'Lights, fans and Wi-Fi stay on during load shedding.', 'essentials'),
  ('workspace', 'Workspace', 'laptop', 'Study table in the games room.', 'work'),
  ('parking', 'Parking', 'car', 'Covered car porch inside the gate.', 'essentials'),
  ('games-room', 'Games room', 'gamepad-2', 'A separate room for games and downtime.', 'living'),
  ('air-conditioning', 'Air conditioning', 'air-vent', 'In the lounge and every bedroom.', 'essentials'),
  ('kitchen', 'Kitchen', 'cooking-pot', 'Fully equipped for home cooking.', 'living'),
  ('security', 'Security', 'cctv', 'Exterior cameras around the property.', 'safety'),
  ('caretaker', 'Caretaker', 'user-check', 'On site to help throughout your stay.', 'service');

insert into public.property_amenities (property_id, amenity_id, sort)
select '00000000-0000-4000-a000-000000000001', id, row_number() over (order by key) from public.amenities;

insert into public.site_settings (key, value) values
  ('public_phone', '"+923205361616"'),
  ('whatsapp_number', '"923205361616"'),
  ('usd_pkr_display_rate', '{"rate": "280.00", "set_on": "2026-10-18", "sample": true}');

-- ---------------------------------------------------------------- channels and categories
insert into public.channels (key, name, kind, default_commission_pct, sort) values
  ('airbnb', 'Airbnb', 'platform', 0, 1),
  ('booking_com', 'Booking.com', 'platform', 0, 2),
  ('website', 'Direct website', 'direct', 0, 3),
  ('whatsapp', 'WhatsApp', 'offline', 0, 4),
  ('walk_in', 'Walk-in', 'offline', 0, 5),
  ('other', 'Other', 'offline', 0, 6);

insert into public.expense_categories (name, kind, sort) values
  ('Rent', 'opex', 1), ('Utilities', 'opex', 2), ('Internet', 'opex', 3), ('Cleaner', 'opex', 4),
  ('Caretaker', 'opex', 5), ('Consumables', 'opex', 6), ('Others', 'opex', 7),
  ('Furniture', 'capex', 20), ('Fit-out', 'capex', 21), ('Appliances', 'capex', 22);

insert into public.fx_rates (rate_date, currency, rate_to_pkr) values
  ('2026-08-01', 'USD', 281.10), ('2026-09-01', 'USD', 280.60), ('2026-10-01', 'USD', 280.20);

-- ---------------------------------------------------------------- task template
insert into public.task_templates (id, name) values ('00000000-0000-4000-a000-000000000101', 'Standard stay');
insert into public.task_template_items (template_id, title, anchor, offset_minutes, remind_offset_minutes, sort) values
  ('00000000-0000-4000-a000-000000000101', 'Send check-in details', 'check_in', -2880, -60, 1),
  ('00000000-0000-4000-a000-000000000101', 'Clean and prepare', 'check_in', -360, -60, 2),
  ('00000000-0000-4000-a000-000000000101', 'Welcome guest', 'check_in', 0, -30, 3),
  ('00000000-0000-4000-a000-000000000101', 'Collect stay payment', 'check_in', 60, null, 4),
  ('00000000-0000-4000-a000-000000000101', 'Mid-stay check', 'check_in', 1440, null, 5),
  ('00000000-0000-4000-a000-000000000101', 'Checkout inspection', 'check_out', 0, -30, 6),
  ('00000000-0000-4000-a000-000000000101', 'Return security deposit', 'check_out', 1440, null, 7),
  ('00000000-0000-4000-a000-000000000101', 'Request review', 'check_out', 240, null, 8);

-- ---------------------------------------------------------------- sample guests and bookings
insert into public.guests (id, full_name, phone_e164, email, country) values
  ('00000000-0000-4000-b000-000000000001', 'Sample Guest One', '+923001110001', 'guest1@example.com', 'PK'),
  ('00000000-0000-4000-b000-000000000002', 'Sample Guest Two', '+447700900002', 'guest2@example.com', 'GB'),
  ('00000000-0000-4000-b000-000000000003', 'Sample Guest Three', '+923001110003', null, 'PK'),
  ('00000000-0000-4000-b000-000000000004', 'Sample Corporate Guest', '+923001110004', 'travel@example.com', 'PK'),
  ('00000000-0000-4000-b000-000000000005', 'Sample Guest Five', '+14165550105', 'guest5@example.com', 'CA');

with p as (select '00000000-0000-4000-a000-000000000001'::uuid as id),
     ch as (select key, id from public.channels)
insert into public.bookings (id, property_id, channel_id, guest_id, status, check_in, check_out, adults, children, extra_beddings,
  currency, gross_minor, commission_minor, fx_rate_to_pkr, deposit_minor, external_ref, ical_uid, source, needs_details,
  cancelled_on, cancellation_retained_minor, created_by)
values
  -- past, completed, Airbnb with payout details filled in
  ('00000000-0000-4000-c000-000000000001', (select id from p), (select id from ch where key = 'airbnb'), '00000000-0000-4000-b000-000000000002',
   'checked_out', '2026-08-04', '2026-08-09', 4, 0, 0, 'USD', 30000, 945, 281.10, 0, 'HMSAMPLE01', 'sample-uid-01@airbnb.com', 'ical', false, null, 0, null),
  -- past, WhatsApp, PKR, 8 guests with 2 extra beddings
  ('00000000-0000-4000-c000-000000000002', (select id from p), (select id from ch where key = 'whatsapp'), '00000000-0000-4000-b000-000000000001',
   'checked_out', '2026-08-28', '2026-09-01', 6, 2, 2, 'PKR', 7520000, 0, null, 1504000, null, null, 'manual', false, null, 0, null),
  -- stay crossing a month end (accrual split test)
  ('00000000-0000-4000-c000-000000000003', (select id from p), (select id from ch where key = 'booking_com'), '00000000-0000-4000-b000-000000000005',
   'checked_out', '2026-09-28', '2026-10-03', 2, 1, 0, 'USD', 30000, 4500, 280.60, 0, 'BKSAMPLE03', 'sample-uid-03@booking.com', 'ical', false, null, 0, null),
  -- cancelled with part retained
  ('00000000-0000-4000-c000-000000000004', (select id from p), (select id from ch where key = 'whatsapp'), '00000000-0000-4000-b000-000000000003',
   'cancelled', '2026-10-10', '2026-10-12', 3, 0, 0, 'PKR', 3360000, 0, null, 672000, null, null, 'manual', false, '2026-10-05', 672000, null),
  -- in house now, corporate, partial payment
  ('00000000-0000-4000-c000-000000000005', (select id from p), (select id from ch where key = 'walk_in'), '00000000-0000-4000-b000-000000000004',
   'checked_in', '2026-10-16', '2026-10-21', 2, 0, 0, 'USD', 30000, 0, 280.20, 6000, null, null, 'manual', false, null, 0, null),
  -- upcoming Airbnb from iCal, details still missing
  ('00000000-0000-4000-c000-000000000006', (select id from p), (select id from ch where key = 'airbnb'), null,
   'confirmed', '2026-11-01', '2026-11-07', 1, 0, 0, 'USD', 0, 0, null, 0, 'HMSAMPLE06', 'sample-uid-06@airbnb.com', 'ical', true, null, 0, null),
  -- upcoming direct website inquiry
  ('00000000-0000-4000-c000-000000000007', (select id from p), (select id from ch where key = 'website'), '00000000-0000-4000-b000-000000000005',
   'inquiry', '2026-12-12', '2026-12-15', 4, 0, 0, 'USD', 0, 0, null, 0, null, null, 'website', false, null, 0, null),
  -- upcoming WhatsApp confirmed, overlapping the iCal booking on purpose (overlap warning test in Phase 3)
  ('00000000-0000-4000-c000-000000000008', (select id from p), (select id from ch where key = 'whatsapp'), '00000000-0000-4000-b000-000000000001',
   'confirmed', '2026-11-05', '2026-11-08', 5, 0, 0, 'PKR', 5040000, 0, null, 1008000, null, null, 'manual', false, null, 0, null);

insert into public.calendar_blocks (property_id, start_date, end_date, reason, source, created_by) values
  ('00000000-0000-4000-a000-000000000001', '2026-11-22', '2026-11-25', 'Deep clean and AC service', 'manual', null);

insert into public.payments (booking_id, kind, amount_minor, currency, fx_rate_to_pkr, received_on, method, created_by) values
  ('00000000-0000-4000-c000-000000000001', 'stay_payment', 29055, 'USD', 281.10, '2026-08-10', 'Airbnb payout', null),
  ('00000000-0000-4000-c000-000000000002', 'deposit_received', 1504000, 'PKR', null, '2026-08-20', 'Bank transfer', null),
  ('00000000-0000-4000-c000-000000000002', 'stay_payment', 7520000, 'PKR', null, '2026-08-28', 'Cash', null),
  ('00000000-0000-4000-c000-000000000002', 'deposit_refunded', 1504000, 'PKR', null, '2026-09-02', 'Bank transfer', null),
  ('00000000-0000-4000-c000-000000000003', 'stay_payment', 25500, 'USD', 280.60, '2026-10-06', 'Booking.com payout', null),
  ('00000000-0000-4000-c000-000000000004', 'deposit_received', 672000, 'PKR', null, '2026-10-01', 'Raast', null),
  ('00000000-0000-4000-c000-000000000004', 'deposit_retained', 672000, 'PKR', null, '2026-10-05', 'Retained on cancellation', null),
  ('00000000-0000-4000-c000-000000000005', 'deposit_received', 6000, 'USD', 280.20, '2026-10-14', 'Bank transfer', null),
  ('00000000-0000-4000-c000-000000000005', 'stay_payment', 15000, 'USD', 280.20, '2026-10-16', 'Cash', null),
  ('00000000-0000-4000-c000-000000000008', 'deposit_received', 1008000, 'PKR', null, '2026-10-15', 'Bank transfer', null);

-- ---------------------------------------------------------------- partners and capital (sample)
insert into public.partners (id, name) values
  ('00000000-0000-4000-d000-000000000001', 'Sample Partner A'),
  ('00000000-0000-4000-d000-000000000002', 'Sample Partner B'),
  ('00000000-0000-4000-d000-000000000003', 'Sample Partner C'),
  ('00000000-0000-4000-d000-000000000004', 'Sample Partner D');

insert into public.capital_contributions (partner_id, contributed_on, amount_minor, currency, fx_rate_to_pkr, created_by) values
  ('00000000-0000-4000-d000-000000000001', '2026-06-01', 120000000, 'PKR', null, null),
  ('00000000-0000-4000-d000-000000000002', '2026-06-01', 80000000, 'PKR', null, null),
  ('00000000-0000-4000-d000-000000000003', '2026-06-01', 50000000, 'PKR', null, null),
  ('00000000-0000-4000-d000-000000000004', '2026-06-15', 200000, 'USD', 281.50, null),
  ('00000000-0000-4000-d000-000000000003', '2026-09-10', 20000000, 'PKR', null, null);

insert into public.distributions (partner_id, paid_on, amount_minor, currency, created_by) values
  ('00000000-0000-4000-d000-000000000001', '2026-10-05', 3000000, 'PKR', null);

-- ---------------------------------------------------------------- expenses (sample)
insert into public.recurring_expenses (category_id, property_id, description, vendor, amount_minor, currency, frequency, day_of_period, start_date)
select id, '00000000-0000-4000-a000-000000000001', d, v, a, 'PKR', 'monthly', day, '2026-07-01'
  from (values ('Rent', 'Monthly rent', 'Landlord', 25000000, 1),
               ('Internet', 'Fibre internet', 'ISP', 650000, 5),
               ('Caretaker', 'Caretaker salary', 'Caretaker', 4500000, 1)) as r(cat, d, v, a, day)
  join public.expense_categories c on c.name = r.cat;

insert into public.expenses (expense_date, amount_minor, currency, category_id, property_id, vendor, payment_method, paid_by_partner_id, notes, created_by)
select x.dt::date, x.amt, 'PKR', c.id, '00000000-0000-4000-a000-000000000001', x.vendor, x.method, x.partner::uuid, x.notes, null
  from (values
    ('2026-06-05', 45000000, 'Furniture', 'Furniture store', 'Bank transfer', null, 'Living and bedroom furniture'),
    ('2026-06-12', 18000000, 'Fit-out', 'Contractor', 'Bank transfer', null, 'Paint, lighting, curtains'),
    ('2026-06-20', 22000000, 'Appliances', 'Electronics store', 'Card', '00000000-0000-4000-d000-000000000002', 'ACs and fridge, paid by partner'),
    ('2026-09-01', 25000000, 'Rent', 'Landlord', 'Bank transfer', null, null),
    ('2026-09-05', 650000, 'Internet', 'ISP', 'Bank transfer', null, null),
    ('2026-09-01', 4500000, 'Caretaker', 'Caretaker', 'Cash', null, null),
    ('2026-09-12', 1830000, 'Utilities', 'LESCO', 'Bank transfer', null, 'Electricity'),
    ('2026-09-18', 420000, 'Consumables', 'Grocery store', 'Cash', null, 'Toiletries and tea'),
    ('2026-10-02', 300000, 'Cleaner', 'Cleaner', 'Cash', null, 'Turnover clean'),
    ('2026-10-01', 25000000, 'Rent', 'Landlord', 'Bank transfer', null, null)
  ) as x(dt, amt, cat, vendor, method, partner, notes)
  join public.expense_categories c on c.name = x.cat;

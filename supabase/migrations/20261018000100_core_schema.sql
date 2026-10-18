-- SAHA Residences core schema (Phase 1). See docs/phase-0-plan.md section 4 and DECISIONS.md D-016.
-- Rules: money is bigint minor units + currency; stay dates are `date`; financial rows soft-delete only.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- enums
create type public.app_role as enum ('admin', 'staff', 'partner');
create type public.booking_status as enum ('inquiry', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
create type public.channel_kind as enum ('platform', 'direct', 'offline');
create type public.booking_source as enum ('manual', 'ical', 'website', 'csv');
create type public.sync_state as enum ('active', 'missing_from_feed');
-- Deposits are a liability, never revenue (D-021).
create type public.payment_kind as enum ('stay_payment', 'refund', 'deposit_received', 'deposit_refunded', 'deposit_retained');
create type public.task_status as enum ('open', 'done', 'skipped');
create type public.expense_kind as enum ('opex', 'capex');
create type public.record_status as enum ('draft', 'confirmed');

-- Supported currencies are 2-decimal, so minor units convert 1:1 (cents x rate = paisa).
create domain public.currency_code as char(3) check (value in ('PKR', 'USD'));
create domain public.money_minor as bigint;
create domain public.fx_rate as numeric(18, 8) check (value > 0);

-- ---------------------------------------------------------------- shared trigger: updated_at
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- people
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now()
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  user_id uuid unique references auth.users (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Data minimization: name, phone, email, country only. No ID documents.
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  country char(2),
  notes text,
  created_at timestamptz not null default now(),
  anonymized_at timestamptz
);

-- ---------------------------------------------------------------- listings and site content
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  area_label text not null,
  bedrooms int not null check (bedrooms >= 0),
  bathrooms int not null check (bathrooms >= 0),
  included_guests int not null check (included_guests > 0),
  max_guests int not null,
  base_rate_minor public.money_minor not null check (base_rate_minor >= 0),
  base_currency public.currency_code not null,
  extra_guest_fee_minor public.money_minor not null default 0 check (extra_guest_fee_minor >= 0),
  extra_guest_fee_currency public.currency_code not null default 'PKR',
  deposit_pct numeric(5, 2) not null default 20 check (deposit_pct between 0 and 100),
  min_nights int not null default 1 check (min_nights >= 1),
  check_in_time time,
  check_out_time time,
  -- Area centroid only; the exact address is never stored for public use.
  approx_lat numeric(8, 5),
  approx_lng numeric(8, 5),
  summary text,
  description text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_guests >= included_guests)
);
create trigger properties_touch before update on public.properties
  for each row execute function private.touch_updated_at();

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  beds text,
  description text,
  sort int not null default 0
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  icon text not null,
  description text,
  category text
);

create table public.property_amenities (
  property_id uuid not null references public.properties (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  sort int not null default 0,
  primary key (property_id, amenity_id)
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  storage_path text not null,
  filename text not null check (filename ~ '^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+$'),
  alt text not null check (length(trim(alt)) > 0),
  caption text,
  width int check (width > 0),
  height int check (height > 0),
  sort int not null default 0,
  is_hero boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seasonal or weekday overrides on top of the base rate. end_date is exclusive.
create table public.rate_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  nightly_rate_minor public.money_minor not null check (nightly_rate_minor >= 0),
  currency public.currency_code not null,
  weekdays smallint[] check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  min_nights int check (min_nights >= 1),
  label text,
  check (end_date > start_date)
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- channels and sync
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  -- Stable code used by sync and RPCs (airbnb, booking_com, website, whatsapp, walk_in, other); names stay editable.
  key text not null unique check (key ~ '^[a-z_]+$'),
  name text not null unique,
  kind public.channel_kind not null,
  default_commission_pct numeric(5, 2) not null default 0 check (default_commission_pct between 0 and 100),
  csv_mapping jsonb,
  active boolean not null default true,
  sort int not null default 0
);

create table public.channel_feeds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  import_url text not null check (import_url ~ '^https://'),
  active boolean not null default true,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  consecutive_failures int not null default 0,
  unique (property_id, channel_id)
);

-- One secret export URL per consumer platform, so a platform never re-imports its own bookings (D-007).
create table public.export_feeds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  consumer_channel_id uuid not null references public.channels (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  unique (property_id, consumer_channel_id)
);

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  source text not null default 'manual' check (source in ('manual', 'ical')),
  channel_id uuid references public.channels (id),
  external_uid text,
  sync_state public.sync_state not null default 'active',
  last_seen_in_feed_at timestamptz,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_date > start_date),
  unique (channel_id, external_uid)
);

-- ---------------------------------------------------------------- bookings and money
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('SR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  property_id uuid not null references public.properties (id),
  channel_id uuid not null references public.channels (id),
  guest_id uuid references public.guests (id),
  status public.booking_status not null default 'inquiry',
  check_in date not null,
  check_out date not null,
  nights int generated always as (check_out - check_in) stored,
  adults int not null default 1 check (adults >= 1),
  children int not null default 0 check (children >= 0),
  guest_count int generated always as (adults + children) stored,
  extra_beddings int not null default 0 check (extra_beddings >= 0),
  currency public.currency_code not null default 'USD',
  gross_minor public.money_minor not null default 0 check (gross_minor >= 0),
  commission_minor public.money_minor not null default 0 check (commission_minor >= 0),
  other_fees_minor public.money_minor not null default 0 check (other_fees_minor >= 0),
  taxes_minor public.money_minor not null default 0 check (taxes_minor >= 0),
  net_payout_minor bigint generated always as (gross_minor - commission_minor - other_fees_minor - taxes_minor) stored,
  fx_rate_to_pkr public.fx_rate,
  gross_pkr_minor bigint generated always as (
    case when currency = 'PKR' then gross_minor else round(gross_minor * fx_rate_to_pkr)::bigint end
  ) stored,
  deposit_minor public.money_minor not null default 0 check (deposit_minor >= 0),
  cancellation_retained_minor public.money_minor not null default 0 check (cancellation_retained_minor >= 0),
  cancelled_on date,
  payout_date date,
  external_ref text,
  ical_uid text,
  source public.booking_source not null default 'manual',
  needs_details boolean not null default false,
  sync_state public.sync_state not null default 'active',
  last_seen_in_feed_at timestamptz,
  overlap_flag boolean not null default false,
  trip_type text check (trip_type in ('family', 'corporate', 'other')),
  guest_message text check (length(guest_message) <= 2000),
  quote jsonb,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (check_out > check_in),
  -- A foreign-currency amount needs its own rate; originals are never overwritten.
  check (currency = 'PKR' or gross_minor = 0 or fx_rate_to_pkr is not null),
  check (status <> 'cancelled' or cancelled_on is not null),
  unique (channel_id, ical_uid),
  unique (channel_id, external_ref)
);
create index bookings_property_dates on public.bookings (property_id, check_in, check_out) where deleted_at is null;
create trigger bookings_touch before update on public.bookings
  for each row execute function private.touch_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  kind public.payment_kind not null,
  amount_minor public.money_minor not null check (amount_minor > 0),
  currency public.currency_code not null,
  fx_rate_to_pkr public.fx_rate,
  amount_pkr_minor bigint generated always as (
    case when currency = 'PKR' then amount_minor else round(amount_minor * fx_rate_to_pkr)::bigint end
  ) stored,
  received_on date not null,
  method text,
  reference text,
  notes text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (currency = 'PKR' or fx_rate_to_pkr is not null)
);
create index payments_booking on public.payments (booking_id) where deleted_at is null;

create table public.booking_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  author_id uuid not null references auth.users (id) default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- tasks
create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger text not null default 'booking_confirmed' check (trigger in ('booking_confirmed')),
  active boolean not null default true
);

create table public.task_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates (id) on delete cascade,
  title text not null,
  anchor text not null check (anchor in ('check_in', 'check_out')),
  offset_minutes int not null default 0,
  remind_offset_minutes int,
  default_assignee_id uuid references auth.users (id),
  sort int not null default 0
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id),
  property_id uuid references public.properties (id),
  title text not null check (length(trim(title)) between 1 and 200),
  details text,
  due_at timestamptz,
  assignee_id uuid references auth.users (id),
  status public.task_status not null default 'open',
  remind_at timestamptz,
  reminded_at timestamptz,
  template_item_id uuid references public.task_template_items (id) on delete set null,
  completed_at timestamptz,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index tasks_assignee_due on public.tasks (assignee_id, due_at) where status = 'open';

-- ---------------------------------------------------------------- expenses and partners
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind public.expense_kind not null,
  active boolean not null default true,
  sort int not null default 0
);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.expense_categories (id),
  property_id uuid references public.properties (id),
  description text not null,
  vendor text,
  amount_minor public.money_minor not null check (amount_minor > 0),
  currency public.currency_code not null default 'PKR',
  frequency text not null check (frequency in ('monthly', 'quarterly', 'yearly')),
  day_of_period int not null default 1 check (day_of_period between 1 and 28),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  last_generated_for date
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  amount_minor public.money_minor not null check (amount_minor > 0),
  currency public.currency_code not null default 'PKR',
  fx_rate_to_pkr public.fx_rate,
  amount_pkr_minor bigint generated always as (
    case when currency = 'PKR' then amount_minor else round(amount_minor * fx_rate_to_pkr)::bigint end
  ) stored,
  category_id uuid not null references public.expense_categories (id),
  property_id uuid references public.properties (id),
  vendor text,
  payment_method text,
  -- null = paid from the business account
  paid_by_partner_id uuid references public.partners (id),
  reimbursable boolean not null default true,
  reimbursed_on date,
  booking_id uuid references public.bookings (id),
  receipt_path text,
  notes text,
  recurring_expense_id uuid references public.recurring_expenses (id),
  status public.record_status not null default 'confirmed',
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (currency = 'PKR' or fx_rate_to_pkr is not null),
  unique (recurring_expense_id, expense_date)
);
create trigger expenses_touch before update on public.expenses
  for each row execute function private.touch_updated_at();

create table public.capital_contributions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id),
  contributed_on date not null,
  amount_minor public.money_minor not null check (amount_minor > 0),
  currency public.currency_code not null default 'PKR',
  fx_rate_to_pkr public.fx_rate,
  amount_pkr_minor bigint generated always as (
    case when currency = 'PKR' then amount_minor else round(amount_minor * fx_rate_to_pkr)::bigint end
  ) stored,
  notes text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (currency = 'PKR' or fx_rate_to_pkr is not null)
);

create table public.distributions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id),
  paid_on date not null,
  amount_minor public.money_minor not null check (amount_minor > 0),
  currency public.currency_code not null default 'PKR',
  fx_rate_to_pkr public.fx_rate,
  amount_pkr_minor bigint generated always as (
    case when currency = 'PKR' then amount_minor else round(amount_minor * fx_rate_to_pkr)::bigint end
  ) stored,
  notes text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (currency = 'PKR' or fx_rate_to_pkr is not null)
);

create table public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null,
  currency public.currency_code not null check (currency <> 'PKR'),
  rate_to_pkr public.fx_rate not null,
  source text not null default 'manual',
  unique (rate_date, currency)
);

-- ---------------------------------------------------------------- imports, audit, jobs, events
create table public.csv_imports (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id),
  filename text not null,
  column_mapping jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'applied', 'discarded')),
  uploaded_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.csv_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.csv_imports (id) on delete cascade,
  row_number int not null,
  raw jsonb not null,
  dedupe_hash text not null,
  matched_booking_id uuid references public.bookings (id),
  proposed_action text not null check (proposed_action in ('create', 'update', 'skip')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'skipped'))
);
-- Re-importing the same payout row can never be accepted twice.
create unique index csv_import_rows_accepted_once on public.csv_import_rows (dedupe_hash) where status = 'accepted';

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_row jsonb,
  new_row jsonb,
  actor uuid,
  at timestamptz not null default now()
);
create index audit_log_row on public.audit_log (table_name, row_id);

create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'error')),
  detail jsonb
);

-- First-party conversion events. No IP, no user agent, no identifiers (D-011).
create table public.site_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('booking_started', 'booking_request_submitted', 'whatsapp_click', 'phone_click')),
  path text check (length(path) <= 300),
  created_at timestamptz not null default now()
);

-- Row-level security, privileges and audit (Phase 1). Matrix: docs/phase-0-plan.md section 5.
-- Every dashboard user must be at MFA level aal2 for any policy to pass (D-015).

-- ---------------------------------------------------------------- role helpers
create function private.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.user_id = auth.uid()
$$;

create function private.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_app_role() = r, false)
     and coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create function private.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select private.has_role('admin')
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_app_role(), private.has_role(public.app_role), private.is_admin() to authenticated;

-- ---------------------------------------------------------------- baseline privileges
-- The public site never talks to tables directly: anon gets RPCs only.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- Financial records are soft-deleted only; notes and the audit log are append-only.
revoke delete, truncate on public.bookings, public.payments, public.expenses,
  public.capital_contributions, public.distributions, public.guests from authenticated;
revoke update, delete, truncate on public.booking_notes, public.audit_log from authenticated;
revoke insert on public.audit_log from authenticated;

-- ---------------------------------------------------------------- enable RLS everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'partners', 'guests', 'properties', 'rooms', 'amenities', 'property_amenities', 'media',
    'rate_rules', 'site_settings', 'channels', 'channel_feeds', 'export_feeds', 'calendar_blocks',
    'bookings', 'payments', 'booking_notes', 'task_templates', 'task_template_items', 'tasks',
    'expense_categories', 'recurring_expenses', 'expenses', 'capital_contributions', 'distributions',
    'fx_rates', 'csv_imports', 'csv_import_rows', 'audit_log', 'job_runs', 'site_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- admin: everything (except append-only tables)
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'partners', 'guests', 'properties', 'rooms', 'amenities', 'property_amenities', 'media',
    'rate_rules', 'site_settings', 'channels', 'channel_feeds', 'export_feeds', 'calendar_blocks',
    'bookings', 'payments', 'task_templates', 'task_template_items', 'tasks',
    'expense_categories', 'recurring_expenses', 'expenses', 'capital_contributions', 'distributions',
    'fx_rates', 'csv_imports', 'csv_import_rows'
  ] loop
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (private.is_admin()) with check (private.is_admin())', t);
  end loop;
end $$;

create policy admin_read on public.audit_log for select to authenticated using (private.is_admin());
create policy admin_read on public.job_runs for select to authenticated using (private.is_admin());
create policy admin_read on public.site_events for select to authenticated using (private.is_admin());
create policy admin_read on public.booking_notes for select to authenticated using (private.is_admin());
create policy admin_insert on public.booking_notes for insert to authenticated
  with check (private.is_admin() and author_id = auth.uid());

-- ---------------------------------------------------------------- everyone: own profile
create policy own_profile on public.profiles for select to authenticated
  using (user_id = auth.uid() and coalesce((auth.jwt() ->> 'aal') = 'aal2', false));

-- ---------------------------------------------------------------- staff
-- Bookings are read through public.bookings_ops (no money columns), never the table.
-- Staff have no policy on bookings, so this check runs as definer (an RLS subquery would see nothing).
create function private.booking_is_live(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.bookings where id = b and deleted_at is null)
$$;
grant execute on function private.booking_is_live(uuid) to authenticated;

create policy staff_read on public.booking_notes for select to authenticated
  using (private.has_role('staff') and private.booking_is_live(booking_id));
create policy staff_insert on public.booking_notes for insert to authenticated
  with check (private.has_role('staff') and author_id = auth.uid());

create policy staff_own_tasks on public.tasks for select to authenticated
  using (private.has_role('staff') and assignee_id = auth.uid());
create policy staff_update_own_tasks on public.tasks for update to authenticated
  using (private.has_role('staff') and assignee_id = auth.uid())
  with check (private.has_role('staff') and assignee_id = auth.uid());

-- ---------------------------------------------------------------- partners: own rows only (totals come from report RPCs in Phase 5)
create policy partner_self on public.partners for select to authenticated
  using (private.has_role('partner') and user_id = auth.uid());
create policy partner_own on public.capital_contributions for select to authenticated
  using (private.has_role('partner') and deleted_at is null
         and partner_id in (select id from public.partners where user_id = auth.uid()));
create policy partner_own on public.distributions for select to authenticated
  using (private.has_role('partner') and deleted_at is null
         and partner_id in (select id from public.partners where user_id = auth.uid()));

-- ---------------------------------------------------------------- audit trail
create function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (table_name, row_id, action, old_row, new_row, actor)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['bookings', 'payments', 'expenses', 'capital_contributions', 'distributions', 'calendar_blocks', 'guests'] loop
    execute format(
      'create trigger audit after insert or update or delete on public.%I for each row execute function private.audit_row()', t);
  end loop;
end $$;

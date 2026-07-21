begin;

alter table public.drivers
  drop constraint if exists drivers_status_check;

alter table public.drivers
  add constraint drivers_status_check
  check (
    status in (
      'Available',
      'Assigned',
      'On route',
      'On break',
      'Offline',
      'Disabled',
      'Maintenance'
    )
  );

alter table public.drivers
  add column if not exists break_reason text,
  add column if not exists break_notes text,
  add column if not exists break_started_at timestamptz,
  add column if not exists break_expected_end_at timestamptz,
  add column if not exists break_previous_status text;

create table if not exists public.driver_breaks (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  driver_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 80),
  notes text,
  planned_minutes integer not null check (planned_minutes between 10 and 120),
  started_at timestamptz not null default now(),
  expected_end_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (notes is null or char_length(notes) <= 500)
);

create index if not exists driver_breaks_active_idx
  on public.driver_breaks(driver_id, started_at desc)
  where ended_at is null;

create index if not exists driver_breaks_partner_idx
  on public.driver_breaks(partner_id, started_at desc);

create or replace function public.preserve_active_driver_break()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'On break'
    and new.status not in ('On break', 'Disabled')
    and coalesce(current_setting('ecoloop.driver_break_end', true), '') <> 'true' then
    new.status := 'On break';
    new.is_available := false;
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_active_driver_break on public.drivers;
create trigger preserve_active_driver_break
before update of status on public.drivers
for each row execute function public.preserve_active_driver_break();

create or replace function public.enforce_driver_break_pickup_pause()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and new.status in ('assigned', 'accepted', 'in_transit', 'arrived', 'collected')
    and new.assigned_driver_id is not null
    and exists (
      select 1
      from public.drivers driver
      where driver.id = new.assigned_driver_id
        and driver.status = 'On break'
    ) then
    raise exception 'The driver must end the break before progressing a pickup';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_driver_break_pickup_pause
  on public.pickup_requests;
create trigger enforce_driver_break_pickup_pause
before update of status on public.pickup_requests
for each row execute function public.enforce_driver_break_pickup_pause();

create or replace function public.recalculate_driver_loads(
  p_driver_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.drivers driver
  set
    current_load = least(driver.capacity_kg, coalesce(loads.actual_load, 0)),
    reserved_load = coalesce(loads.reserved_load, 0),
    is_available =
      driver.status not in ('On break', 'Offline', 'Disabled', 'Maintenance')
      and driver.capacity_kg
        - least(driver.capacity_kg, coalesce(loads.actual_load, 0))
        - coalesce(loads.reserved_load, 0)
        >= greatest(driver.capacity_kg * 0.10, 10),
    updated_at = now()
  from (
    select
      existing_driver.id as driver_id,
      coalesce(
        sum(pickup.actual_weight) filter (
          where pickup.status = 'collected'
        ),
        0
      ) as actual_load,
      coalesce(
        sum(public.estimated_pickup_load_kg(pickup)) filter (
          where pickup.status in (
            'assigned',
            'accepted',
            'in_transit',
            'arrived'
          )
        ),
        0
      ) as reserved_load
    from public.drivers existing_driver
    left join public.pickup_requests pickup
      on pickup.assigned_driver_id = existing_driver.id
    where p_driver_id is null or existing_driver.id = p_driver_id
    group by existing_driver.id
  ) loads
  where driver.id = loads.driver_id;
end;
$$;

create or replace function public.start_driver_break(
  p_reason text,
  p_duration_minutes integer,
  p_notes text default null
)
returns public.drivers
language plpgsql
security definer
set search_path = ''
as $$
declare
  driver_row public.drivers;
  result public.drivers;
  resolved_reason text := trim(coalesce(p_reason, ''));
  resolved_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  select * into driver_row
  from public.drivers
  where user_id = (select auth.uid())
  for update;

  if driver_row.id is null then
    raise exception 'Driver profile not found';
  end if;

  if driver_row.status in ('On break', 'Offline', 'Disabled', 'Maintenance') then
    raise exception 'A break cannot be started from the current driver status';
  end if;

  if char_length(resolved_reason) not between 3 and 80 then
    raise exception 'Select a valid break reason';
  end if;

  if p_duration_minutes not between 10 and 120 then
    raise exception 'Break duration must be between 10 and 120 minutes';
  end if;

  if resolved_notes is not null and char_length(resolved_notes) > 500 then
    raise exception 'Break notes must be 500 characters or fewer';
  end if;

  if exists (
    select 1
    from public.pickup_requests pickup
    where pickup.assigned_driver_id = driver_row.id
      and pickup.status in ('in_transit', 'arrived')
  ) then
    raise exception 'Finish the active pickup stage before starting a break';
  end if;

  update public.drivers
  set
    break_previous_status = driver_row.status,
    status = 'On break',
    is_available = false,
    break_reason = resolved_reason,
    break_notes = resolved_notes,
    break_started_at = now(),
    break_expected_end_at = now() + make_interval(mins => p_duration_minutes),
    updated_at = now()
  where id = driver_row.id
  returning * into result;

  insert into public.driver_breaks(
    driver_id,
    partner_id,
    driver_user_id,
    reason,
    notes,
    planned_minutes,
    started_at,
    expected_end_at
  )
  values (
    result.id,
    result.partner_id,
    (select auth.uid()),
    resolved_reason,
    resolved_notes,
    p_duration_minutes,
    result.break_started_at,
    result.break_expected_end_at
  );

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    (select auth.uid()),
    'driver.break_started',
    'driver',
    result.id,
    jsonb_build_object(
      'reason', resolved_reason,
      'planned_minutes', p_duration_minutes,
      'expected_end_at', result.break_expected_end_at,
      'previous_status', driver_row.status
    )
  );

  insert into public.notifications(
    user_id,
    role,
    title,
    message,
    entity_type,
    entity_id
  )
  values (
    result.partner_id,
    'recycler',
    'Driver started a break',
    result.name || ' is on a ' || p_duration_minutes || '-minute break: ' || resolved_reason || '.',
    'driver',
    result.id
  );

  insert into public.notifications(
    user_id,
    role,
    title,
    message,
    entity_type,
    entity_id
  )
  select
    profile.id,
    'admin',
    'Driver break started',
    result.name || ' is on a ' || p_duration_minutes || '-minute break: ' || resolved_reason || '.',
    'driver',
    result.id
  from public.profiles profile
  where profile.role = 'admin'
    and profile.is_active
    and profile.approval_status = 'approved';

  return result;
end;
$$;

create or replace function public.end_driver_break()
returns public.drivers
language plpgsql
security definer
set search_path = ''
as $$
declare
  driver_row public.drivers;
  result public.drivers;
  restored_status text;
begin
  select * into driver_row
  from public.drivers
  where user_id = (select auth.uid())
  for update;

  if driver_row.id is null then
    raise exception 'Driver profile not found';
  end if;

  if driver_row.status <> 'On break' then
    raise exception 'The driver is not currently on a break';
  end if;

  restored_status := case
    when exists (
      select 1
      from public.pickup_requests pickup
      where pickup.assigned_driver_id = driver_row.id
        and pickup.status in ('in_transit', 'arrived', 'collected')
    ) then 'On route'
    when exists (
      select 1
      from public.pickup_requests pickup
      where pickup.assigned_driver_id = driver_row.id
        and pickup.status in ('assigned', 'accepted')
    ) then 'Assigned'
    else 'Available'
  end;

  update public.driver_breaks
  set ended_at = now()
  where driver_id = driver_row.id
    and ended_at is null;

  perform set_config('ecoloop.driver_break_end', 'true', true);

  update public.drivers
  set
    status = restored_status,
    is_available =
      capacity_kg - current_load - reserved_load
        >= greatest(capacity_kg * 0.10, 10),
    break_reason = null,
    break_notes = null,
    break_started_at = null,
    break_expected_end_at = null,
    break_previous_status = null,
    updated_at = now()
  where id = driver_row.id
  returning * into result;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    (select auth.uid()),
    'driver.break_ended',
    'driver',
    result.id,
    jsonb_build_object(
      'restored_status', restored_status,
      'break_started_at', driver_row.break_started_at,
      'break_expected_end_at', driver_row.break_expected_end_at,
      'reason', driver_row.break_reason
    )
  );

  insert into public.notifications(
    user_id,
    role,
    title,
    message,
    entity_type,
    entity_id
  )
  values (
    result.partner_id,
    'recycler',
    'Driver break ended',
    result.name || ' is available for route work again.',
    'driver',
    result.id
  );

  insert into public.notifications(
    user_id,
    role,
    title,
    message,
    entity_type,
    entity_id
  )
  select
    profile.id,
    'admin',
    'Driver break ended',
    result.name || ' is available for route work again.',
    'driver',
    result.id
  from public.profiles profile
  where profile.role = 'admin'
    and profile.is_active
    and profile.approval_status = 'approved';

  return result;
end;
$$;

alter table public.driver_breaks enable row level security;

revoke all on public.driver_breaks from anon, authenticated;
grant select on public.driver_breaks to authenticated;

drop policy if exists driver_breaks_read on public.driver_breaks;
create policy driver_breaks_read
on public.driver_breaks for select to authenticated
using (
  partner_id = (select auth.uid())
  or driver_user_id = (select auth.uid())
  or public.is_admin()
);

revoke all on function public.start_driver_break(text, integer, text)
  from public, anon;
revoke all on function public.end_driver_break()
  from public, anon;
grant execute on function public.start_driver_break(text, integer, text)
  to authenticated;
grant execute on function public.end_driver_break()
  to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.drivers;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.driver_breaks;
exception
  when duplicate_object then null;
end
$$;

commit;

begin;

alter table public.drivers
  add column if not exists reserved_load numeric(12,2) not null default 0
    check (reserved_load >= 0);

create table if not exists public.vehicle_unloads (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  facility text not null,
  total_weight numeric(12,2) not null check (total_weight > 0),
  notes text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_unload_pickups (
  unload_id uuid not null references public.vehicle_unloads(id) on delete cascade,
  pickup_id uuid not null references public.pickup_requests(id) on delete cascade,
  delivered_weight numeric(12,2) not null check (delivered_weight > 0),
  primary key (unload_id, pickup_id)
);

create index if not exists vehicle_unloads_driver_created_idx
  on public.vehicle_unloads(driver_id, created_at desc);

create or replace function public.recalculate_driver_loads(p_driver_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.drivers driver set
    current_load = least(driver.capacity_kg, coalesce(loads.actual_load, 0)),
    reserved_load = coalesce(loads.reserved_load, 0),
    is_available =
      driver.status not in ('Offline', 'Disabled', 'Maintenance')
      and driver.capacity_kg
        - least(driver.capacity_kg, coalesce(loads.actual_load, 0))
        - coalesce(loads.reserved_load, 0)
        >= greatest(driver.capacity_kg * 0.10, 10),
    updated_at = now()
  from (
    select
      d.id as driver_id,
      coalesce(sum(p.actual_weight) filter (where p.status = 'collected'), 0) as actual_load,
      coalesce(sum(public.estimated_pickup_load_kg(p)) filter (
        where p.status in ('assigned', 'accepted', 'in_transit', 'arrived')
      ), 0) as reserved_load
    from public.drivers d
    left join public.pickup_requests p on p.assigned_driver_id = d.id
    where p_driver_id is null or d.id = p_driver_id
    group by d.id
  ) loads
  where driver.id = loads.driver_id;
end;
$$;

-- The existing assignment engine expects current_load to contain all occupied
-- capacity. Temporarily present actual + reserved capacity to that engine,
-- then normalize the two values before the transaction is committed.
create or replace function public.process_pickup_batches()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  india_hour integer;
  assigned_count integer;
begin
  india_hour := extract(
    hour from statement_timestamp() at time zone 'Asia/Kolkata'
  )::integer;
  if india_hour < 6 or india_hour >= 21 then
    return 0;
  end if;

  update public.drivers
  set current_load = least(capacity_kg, current_load + reserved_load)
  where reserved_load > 0;

  assigned_count := public._process_pickup_batches_unchecked();
  perform public.recalculate_driver_loads();
  return assigned_count;
end;
$$;

-- Status updates before collection remain lightweight. Recording measured
-- waste and facility delivery use the dedicated functions below.
create or replace function public.driver_update_pickup_status(
  p_pickup_id uuid,
  p_status public.pickup_status,
  p_actual_weight numeric default null,
  p_facility text default null,
  p_completion_notes text default null,
  p_completion_image_url text default null
)
returns public.pickup_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  driver_row public.drivers;
  current_row public.pickup_requests;
  result public.pickup_requests;
  previous public.pickup_status;
  load_estimate numeric;
begin
  select * into driver_row from public.drivers
  where user_id = (select auth.uid()) and status <> 'Disabled';
  if driver_row.id is null then raise exception 'Active driver profile not found'; end if;

  select * into current_row from public.pickup_requests
  where id = p_pickup_id for update;
  if current_row.id is null or current_row.assigned_driver_id <> driver_row.id then
    raise exception 'Pickup is not assigned to this driver';
  end if;
  previous := current_row.status;

  if p_status = 'in_transit' then
    load_estimate := public.estimated_pickup_load_kg(current_row);
    if driver_row.current_load >= driver_row.capacity_kg * 0.90
      or driver_row.capacity_kg - driver_row.current_load < load_estimate then
      raise exception 'Vehicle must unload at a facility before starting this pickup';
    end if;
  end if;

  if not (
    (previous = 'assigned' and p_status in ('accepted', 'cancelled')) or
    (previous = 'accepted' and p_status in ('in_transit', 'cancelled')) or
    (previous = 'in_transit' and p_status in ('arrived', 'cancelled')) or
    (previous = 'arrived' and p_status = 'cancelled')
  ) then
    raise exception 'Use measured collection and facility unload actions for this transition';
  end if;

  update public.pickup_requests set
    status = p_status,
    accepted_at = case when p_status = 'accepted' then now() else accepted_at end,
    updated_at = now()
  where id = p_pickup_id returning * into result;

  insert into public.pickup_status_history(pickup_id, actor_id, previous_status, status, note)
  values (result.id, (select auth.uid()), previous, p_status, p_completion_notes);

  update public.pickup_assignments set
    accepted_at = case when p_status = 'accepted' then now() else accepted_at end,
    journey_started_at = case when p_status = 'in_transit' then now() else journey_started_at end,
    arrived_at = case when p_status = 'arrived' then now() else arrived_at end,
    released_at = case when p_status = 'cancelled' then now() else released_at end
  where pickup_id = result.id and released_at is null;

  if p_status = 'accepted' then
    update public.pickup_batches set status = 'In progress'
    where id = result.assignment_batch_id and status <> 'Completed';
  elsif p_status = 'in_transit' then
    update public.drivers set status = 'On route' where id = driver_row.id;
    insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
    values (result.vendor_id, 'vendor', 'Driver en route', driver_row.name || ' has started the journey to your pickup.', 'pickup', result.id);
  elsif p_status = 'arrived' then
    insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
    values (result.vendor_id, 'vendor', 'Driver arrived', driver_row.name || ' has arrived at the pickup location.', 'pickup', result.id);
  elsif p_status = 'cancelled' then
    perform public.recalculate_driver_loads(driver_row.id);
    update public.drivers driver set status = case
      when exists (select 1 from public.pickup_requests p where p.assigned_driver_id = driver.id and p.status in ('in_transit', 'arrived', 'collected')) then 'On route'
      when exists (select 1 from public.pickup_requests p where p.assigned_driver_id = driver.id and p.status in ('assigned', 'accepted')) then 'Assigned'
      else 'Available'
    end
    where driver.id = driver_row.id;
  end if;

  return result;
end;
$$;

create or replace function public.driver_collect_pickup(
  p_pickup_id uuid,
  p_actual_weight numeric,
  p_collection_notes text default null,
  p_collection_image_url text default null
)
returns public.pickup_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  driver_row public.drivers;
  pickup_row public.pickup_requests;
  result public.pickup_requests;
begin
  if p_actual_weight is null or p_actual_weight <= 0 then
    raise exception 'Actual collected weight is required';
  end if;

  select * into driver_row from public.drivers
  where user_id = (select auth.uid()) and status <> 'Disabled'
  for update;
  if driver_row.id is null then raise exception 'Active driver profile not found'; end if;

  select * into pickup_row from public.pickup_requests
  where id = p_pickup_id for update;
  if pickup_row.id is null or pickup_row.assigned_driver_id <> driver_row.id then
    raise exception 'Pickup is not assigned to this driver';
  end if;
  if pickup_row.status <> 'arrived' then
    raise exception 'The driver must arrive before recording collected waste';
  end if;
  if driver_row.current_load + p_actual_weight > driver_row.capacity_kg then
    raise exception 'Actual weight exceeds the remaining physical vehicle capacity';
  end if;

  update public.pickup_requests set
    status = 'collected',
    actual_weight = p_actual_weight,
    completion_notes = p_collection_notes,
    completion_image_url = p_collection_image_url,
    updated_at = now()
  where id = pickup_row.id returning * into result;

  insert into public.pickup_status_history(pickup_id, actor_id, previous_status, status, note)
  values (result.id, (select auth.uid()), 'arrived', 'collected', p_collection_notes);

  update public.pickup_assignments
  set collected_at = now()
  where pickup_id = result.id and released_at is null;

  perform public.recalculate_driver_loads(driver_row.id);
  update public.drivers set status = 'On route' where id = driver_row.id;

  insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
  values
    (result.vendor_id, 'vendor', 'Waste collected', driver_row.name || ' recorded ' || p_actual_weight || ' kg. Delivery to the facility is pending.', 'pickup', result.id),
    (driver_row.partner_id, 'recycler', 'Vehicle load updated', driver_row.name || ' collected ' || p_actual_weight || ' kg.', 'pickup', result.id);

  return result;
end;
$$;

create or replace function public.driver_unload_vehicle(
  p_facility text,
  p_notes text default null,
  p_image_url text default null
)
returns public.vehicle_unloads
language plpgsql
security definer
set search_path = ''
as $$
declare
  driver_row public.drivers;
  pickup_row public.pickup_requests;
  unload_row public.vehicle_unloads;
  unloaded_weight numeric := 0;
begin
  if nullif(trim(coalesce(p_facility, '')), '') is null then
    raise exception 'Destination facility is required';
  end if;

  select * into driver_row from public.drivers
  where user_id = (select auth.uid()) and status <> 'Disabled'
  for update;
  if driver_row.id is null then raise exception 'Active driver profile not found'; end if;

  select coalesce(sum(actual_weight), 0) into unloaded_weight
  from public.pickup_requests
  where assigned_driver_id = driver_row.id and status = 'collected';
  if unloaded_weight <= 0 then
    raise exception 'There is no collected waste onboard to unload';
  end if;

  insert into public.vehicle_unloads(
    driver_id, partner_id, facility, total_weight, notes, image_url
  ) values (
    driver_row.id, driver_row.partner_id, trim(p_facility), unloaded_weight,
    nullif(trim(coalesce(p_notes, '')), ''), p_image_url
  ) returning * into unload_row;

  for pickup_row in
    select * from public.pickup_requests
    where assigned_driver_id = driver_row.id and status = 'collected'
    for update
  loop
    insert into public.vehicle_unload_pickups(unload_id, pickup_id, delivered_weight)
    values (unload_row.id, pickup_row.id, pickup_row.actual_weight);

    update public.pickup_requests set
      status = 'completed',
      facility = trim(p_facility),
      completion_notes = concat_ws(E'\n', nullif(completion_notes, ''), nullif(trim(coalesce(p_notes, '')), '')),
      completed_at = now(),
      updated_at = now()
    where id = pickup_row.id;

    update public.pickup_assignments
    set completed_at = now()
    where pickup_id = pickup_row.id and released_at is null;

    insert into public.pickup_status_history(pickup_id, actor_id, previous_status, status, note)
    values (pickup_row.id, (select auth.uid()), 'collected', 'completed', 'Delivered to ' || trim(p_facility));

    insert into public.waste_recoveries(
      pickup_id, recycler_id, material_category, collected_weight, recovered_weight, processing_method
    ) values (
      pickup_row.id, driver_row.partner_id, pickup_row.waste_type,
      pickup_row.actual_weight, pickup_row.actual_weight, trim(p_facility)
    ) on conflict (pickup_id) do update set
      collected_weight = excluded.collected_weight,
      recovered_weight = excluded.recovered_weight,
      processing_method = excluded.processing_method;

    insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
    values (pickup_row.vendor_id, 'vendor', 'Waste delivered', 'Your collected waste was delivered to ' || trim(p_facility) || '.', 'pickup', pickup_row.id);
  end loop;

  perform public.recalculate_driver_loads(driver_row.id);
  update public.drivers driver set
    status = case
      when exists (select 1 from public.pickup_requests p where p.assigned_driver_id = driver.id and p.status in ('in_transit', 'arrived', 'collected')) then 'On route'
      when exists (select 1 from public.pickup_requests p where p.assigned_driver_id = driver.id and p.status in ('assigned', 'accepted')) then 'Assigned'
      else 'Available'
    end
  where driver.id = driver_row.id;

  update public.pickup_batches batch set status = 'Completed', completed_at = now()
  where batch.assigned_driver_id = driver_row.id
    and not exists (
      select 1 from public.pickup_requests p
      where p.assignment_batch_id = batch.id and p.status not in ('completed', 'cancelled')
    );

  insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
  values (driver_row.partner_id, 'recycler', 'Vehicle unloaded', driver_row.name || ' delivered ' || unloaded_weight || ' kg to ' || trim(p_facility) || '.', 'vehicle_unload', unload_row.id);

  return unload_row;
end;
$$;

-- Older builds could leave a pickup at collected without a measured weight.
-- Return those records to arrived so the driver can record the real load.
update public.pickup_assignments assignment
set collected_at = null
where exists (
  select 1 from public.pickup_requests pickup
  where pickup.id = assignment.pickup_id
    and pickup.status = 'collected'
    and pickup.actual_weight is null
);

update public.pickup_requests
set status = 'arrived', updated_at = now()
where status = 'collected' and actual_weight is null;

select public.recalculate_driver_loads();

create or replace view public.driver_performance
with (security_invoker = true) as
select
  d.id as driver_id,
  d.partner_id,
  d.name,
  count(a.id) as total_assignments,
  count(a.completed_at) as completed_jobs,
  round(avg(extract(epoch from (a.accepted_at - a.assigned_at)) / 60) filter (where a.accepted_at is not null), 1) as average_response_minutes,
  round(avg(extract(epoch from (a.completed_at - a.journey_started_at)) / 60) filter (where a.completed_at is not null and a.journey_started_at is not null), 1) as average_collection_minutes,
  round(100.0 * count(a.completed_at) / nullif(count(a.id), 0), 1) as completion_rate,
  coalesce(sum(p.actual_weight) filter (where p.status = 'completed'), 0) as waste_collected_kg,
  coalesce(round(sum(a.distance_km) filter (where a.completed_at is not null), 1), 0) as distance_covered_km,
  round(100.0 * d.current_load / nullif(d.capacity_kg, 0), 1) as vehicle_utilization
from public.drivers d
left join public.pickup_assignments a on a.driver_id = d.id
left join public.pickup_requests p on p.id = a.pickup_id
group by d.id, d.partner_id, d.name;

alter table public.vehicle_unloads enable row level security;
alter table public.vehicle_unload_pickups enable row level security;

revoke all on public.vehicle_unloads, public.vehicle_unload_pickups from anon, authenticated;
grant select on public.vehicle_unloads, public.vehicle_unload_pickups to authenticated;

drop policy if exists vehicle_unloads_read on public.vehicle_unloads;
create policy vehicle_unloads_read on public.vehicle_unloads for select to authenticated using (
  partner_id = (select auth.uid())
  or driver_id in (select id from public.drivers where user_id = (select auth.uid()))
  or public.is_admin()
);

drop policy if exists vehicle_unload_pickups_read on public.vehicle_unload_pickups;
create policy vehicle_unload_pickups_read on public.vehicle_unload_pickups for select to authenticated using (
  exists (
    select 1 from public.vehicle_unloads unload
    where unload.id = unload_id and (
      unload.partner_id = (select auth.uid())
      or unload.driver_id in (select id from public.drivers where user_id = (select auth.uid()))
      or public.is_admin()
    )
  )
);

revoke all on function public.recalculate_driver_loads(uuid) from public, anon, authenticated;
revoke all on function public.update_pickup_status(uuid, public.pickup_status, numeric, text, text, text) from authenticated;
revoke all on function public.driver_collect_pickup(uuid, numeric, text, text) from public, anon;
revoke all on function public.driver_unload_vehicle(text, text, text) from public, anon;
grant execute on function public.driver_collect_pickup(uuid, numeric, text, text) to authenticated;
grant execute on function public.driver_unload_vehicle(text, text, text) to authenticated;

commit;

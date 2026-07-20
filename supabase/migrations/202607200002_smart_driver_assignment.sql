begin;

create extension if not exists pg_cron;

alter table public.markets
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists default_bin_capacity_kg numeric(12,2) not null default 100;

create table if not exists public.smart_assignment_config (
  id boolean primary key default true check (id),
  batching_window_seconds integer not null default 30 check (batching_window_seconds between 30 and 60),
  average_speed_kmh numeric(6,2) not null default 18 check (average_speed_kmh > 0),
  maximum_distance_km numeric(8,2) not null default 50 check (maximum_distance_km > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.smart_assignment_config(id) values (true)
on conflict (id) do nothing;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text not null,
  vehicle_number text not null,
  vehicle_type text not null,
  capacity_kg numeric(12,2) not null check (capacity_kg > 0),
  current_load numeric(12,2) not null default 0 check (current_load >= 0),
  status text not null default 'Available' check (status in ('Available', 'Assigned', 'On route', 'Offline', 'Disabled', 'Maintenance')),
  current_latitude double precision,
  current_longitude double precision,
  is_available boolean not null default true,
  compatible_waste_types text[] not null default '{}',
  last_location_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, vehicle_number),
  check (current_load <= capacity_kg)
);

create table if not exists public.pickup_batches (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references public.markets(id) on delete set null,
  partner_id uuid references public.profiles(id) on delete set null,
  assigned_driver_id uuid references public.drivers(id) on delete set null,
  status text not null default 'Assigned' check (status in ('Assigned', 'In progress', 'Completed', 'Partially assigned')),
  pickup_count integer not null default 0,
  planned_load_kg numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.pickup_requests
  add column if not exists assigned_driver_id uuid references public.drivers(id) on delete set null,
  add column if not exists assigned_vehicle text,
  add column if not exists assignment_time timestamptz,
  add column if not exists estimated_arrival timestamptz,
  add column if not exists assignment_batch_id uuid references public.pickup_batches(id) on delete set null,
  add column if not exists batch_ready_at timestamptz,
  add column if not exists route_stop_order integer,
  add column if not exists vendor_phone text,
  add column if not exists vendor_latitude double precision,
  add column if not exists vendor_longitude double precision;

create table if not exists public.pickup_assignments (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid not null references public.pickup_requests(id) on delete cascade,
  batch_id uuid references public.pickup_batches(id) on delete set null,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  suitability_score numeric(8,3) not null,
  distance_km numeric(10,3),
  estimated_load_kg numeric(12,2) not null,
  workload_at_assignment integer not null default 0,
  remaining_capacity_at_assignment numeric(12,2) not null,
  route_stop_order integer not null default 1,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  journey_started_at timestamptz,
  arrived_at timestamptz,
  collected_at timestamptz,
  completed_at timestamptz,
  released_at timestamptz
);

create unique index if not exists pickup_assignments_active_pickup_idx
  on public.pickup_assignments(pickup_id) where released_at is null;
create index if not exists drivers_available_idx
  on public.drivers(is_available, status, partner_id);
create index if not exists pickup_batch_ready_idx
  on public.pickup_requests(status, batch_ready_at) where assigned_driver_id is null;
create index if not exists pickup_assigned_driver_idx
  on public.pickup_requests(assigned_driver_id, status);

alter table public.pickup_status_history alter column actor_id drop not null;

create or replace function public.estimated_pickup_load_kg(p_pickup public.pickup_requests)
returns numeric
language sql stable set search_path = '' as $$
  select round(coalesce(m.default_bin_capacity_kg, 100) * case p_pickup.fill_level
    when '25%' then 0.25
    when '50%' then 0.50
    when '75%' then 0.75
    when '100% (Full)' then 1.00
    when 'Overflowing' then 1.20
    else 0.50
  end, 2)
  from (select 1) as singleton
  left join public.markets m on m.id = p_pickup.market_id
$$;

create or replace function public.distance_km(
  p_latitude_a double precision,
  p_longitude_a double precision,
  p_latitude_b double precision,
  p_longitude_b double precision
)
returns numeric
language sql immutable set search_path = '' as $$
  select case
    when p_latitude_a is null or p_longitude_a is null or p_latitude_b is null or p_longitude_b is null then null
    else round((6371 * 2 * asin(sqrt(
      power(sin(radians(p_latitude_b - p_latitude_a) / 2), 2) +
      cos(radians(p_latitude_a)) * cos(radians(p_latitude_b)) *
      power(sin(radians(p_longitude_b - p_longitude_a) / 2), 2)
    )))::numeric, 3)
  end
$$;

create or replace function public.prepare_pickup_batch()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare window_seconds integer;
begin
  select batching_window_seconds into window_seconds
  from public.smart_assignment_config where id = true;
  new.batch_ready_at := coalesce(new.batch_ready_at, now() + make_interval(secs => coalesce(window_seconds, 30)));
  if new.vendor_latitude is null or new.vendor_longitude is null then
    select latitude, longitude into new.vendor_latitude, new.vendor_longitude
    from public.markets where id = new.market_id;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_pickup_batch on public.pickup_requests;
create trigger prepare_pickup_batch before insert on public.pickup_requests
for each row execute function public.prepare_pickup_batch();

update public.pickup_requests
set batch_ready_at = created_at + make_interval(secs => (select batching_window_seconds from public.smart_assignment_config where id = true))
where batch_ready_at is null and status = 'pending';

update public.pickup_requests p
set vendor_phone = profile.phone
from public.profiles profile
where profile.id = p.vendor_id and coalesce(p.vendor_phone, '') = '';

create or replace function public.process_pickup_batches()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  market_group record;
  chosen record;
  pickup_row public.pickup_requests;
  config public.smart_assignment_config;
  new_batch_id uuid;
  required_load numeric;
  assigned_load numeric;
  available_capacity numeric;
  active_workload integer;
  stop_number integer;
  assigned_count integer;
  ready_count integer;
  total_assigned integer := 0;
  travel_minutes integer;
  pickup_distance numeric;
begin
  if (select auth.uid()) is not null and public.current_app_role() not in ('recycler', 'admin') then
    raise exception 'Only recycling partners and administrators can process assignment batches';
  end if;
  if not pg_try_advisory_xact_lock(hashtext('ecoloop.process_pickup_batches')) then
    return 0;
  end if;

  select * into config from public.smart_assignment_config where id = true;

  for market_group in
    select
      p.market_id,
      min(coalesce(p.vendor_latitude, m.latitude)) as latitude,
      min(coalesce(p.vendor_longitude, m.longitude)) as longitude,
      sum(public.estimated_pickup_load_kg(p)) as total_load,
      max(case when lower(p.priority) = 'critical' then 5 when lower(p.priority) like 'urgent%' then 4 when lower(p.priority) = 'high' then 3 else 1 end) as priority_score
    from public.pickup_requests p
    left join public.markets m on m.id = p.market_id
    where p.status = 'pending'
      and p.assigned_driver_id is null
      and p.batch_ready_at <= now()
    group by p.market_id
    order by priority_score desc, min(p.created_at)
  loop
    select candidate.* into chosen
    from (
      select
        d.*,
        public.distance_km(d.current_latitude, d.current_longitude, market_group.latitude, market_group.longitude) as calculated_distance,
        coalesce(workload.active_jobs, 0) as active_jobs,
        (
          20 +
          case
            when public.distance_km(d.current_latitude, d.current_longitude, market_group.latitude, market_group.longitude) is null then 15
            else greatest(0, (30 + market_group.priority_score * 2) * (1 - public.distance_km(d.current_latitude, d.current_longitude, market_group.latitude, market_group.longitude) / config.maximum_distance_km))
          end +
          25 * least(1, (d.capacity_kg - d.current_load) / greatest(market_group.total_load, 1)) +
          20.0 / (1 + coalesce(workload.active_jobs, 0)) +
          market_group.priority_score
        ) as score
      from public.drivers d
      left join lateral (
        select count(*)::integer as active_jobs
        from public.pickup_requests active_pickup
        where active_pickup.assigned_driver_id = d.id
          and active_pickup.status in ('assigned', 'accepted', 'in_transit', 'arrived', 'collected')
      ) workload on true
      where d.is_available
        and d.status not in ('Offline', 'Disabled', 'Maintenance')
        and exists (
          select 1 from public.pickup_requests compatible
          where compatible.status = 'pending'
            and compatible.assigned_driver_id is null
            and compatible.batch_ready_at <= now()
            and compatible.market_id is not distinct from market_group.market_id
            and public.estimated_pickup_load_kg(compatible) <= d.capacity_kg - d.current_load
            and (d.compatible_waste_types = '{}' or compatible.waste_type = any(d.compatible_waste_types))
        )
        and (
          public.distance_km(d.current_latitude, d.current_longitude, market_group.latitude, market_group.longitude) is null or
          public.distance_km(d.current_latitude, d.current_longitude, market_group.latitude, market_group.longitude) <= config.maximum_distance_km
        )
      order by score desc, d.created_at
      limit 1
    ) candidate;

    if chosen.id is null then
      continue;
    end if;

    insert into public.pickup_batches(market_id, partner_id, assigned_driver_id, planned_load_kg)
    values (market_group.market_id, chosen.partner_id, chosen.id, market_group.total_load)
    returning id into new_batch_id;

    assigned_load := 0;
    assigned_count := 0;
    select count(*) into ready_count from public.pickup_requests p
    where p.status = 'pending' and p.assigned_driver_id is null and p.batch_ready_at <= now()
      and p.market_id is not distinct from market_group.market_id;
    stop_number := 0;
    available_capacity := chosen.capacity_kg - chosen.current_load;
    active_workload := chosen.active_jobs;

    for pickup_row in
      select p.* from public.pickup_requests p
      where p.status = 'pending'
        and p.assigned_driver_id is null
        and p.batch_ready_at <= now()
        and p.market_id is not distinct from market_group.market_id
      order by
        case when lower(p.priority) = 'critical' then 1 when lower(p.priority) like 'urgent%' then 2 when lower(p.priority) = 'high' then 3 else 4 end,
        public.distance_km(chosen.current_latitude, chosen.current_longitude, p.vendor_latitude, p.vendor_longitude) nulls last,
        p.created_at
      for update skip locked
    loop
      required_load := public.estimated_pickup_load_kg(pickup_row);
      if required_load > available_capacity - assigned_load then
        continue;
      end if;
      if chosen.compatible_waste_types <> '{}' and not (pickup_row.waste_type = any(chosen.compatible_waste_types)) then
        continue;
      end if;

      stop_number := stop_number + 1;
      assigned_count := assigned_count + 1;
      assigned_load := assigned_load + required_load;
      pickup_distance := public.distance_km(chosen.current_latitude, chosen.current_longitude, pickup_row.vendor_latitude, pickup_row.vendor_longitude);
      travel_minutes := greatest(5, ceil(coalesce(pickup_distance, chosen.calculated_distance, 3) / config.average_speed_kmh * 60)::integer + ((stop_number - 1) * 5));

      update public.pickup_requests set
        recycler_id = chosen.partner_id,
        assigned_driver_id = chosen.id,
        assigned_vehicle = chosen.vehicle_number,
        assignment_time = now(),
        estimated_arrival = now() + make_interval(mins => travel_minutes),
        assignment_batch_id = new_batch_id,
        route_stop_order = stop_number,
        status = 'assigned',
        updated_at = now()
      where id = pickup_row.id;

      insert into public.pickup_assignments(
        pickup_id, batch_id, driver_id, partner_id, suitability_score, distance_km,
        estimated_load_kg, workload_at_assignment, remaining_capacity_at_assignment, route_stop_order
      ) values (
        pickup_row.id, new_batch_id, chosen.id, chosen.partner_id, chosen.score,
        pickup_distance, required_load, active_workload, available_capacity, stop_number
      );

      insert into public.pickup_status_history(pickup_id, actor_id, previous_status, status, note)
      values (pickup_row.id, null, 'pending', 'assigned', 'Assigned automatically after the market batching window.');

      if chosen.user_id is not null then
        insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
        values (chosen.user_id, 'driver', case when stop_number = 1 then 'New pickup assigned' else 'Route updated' end, 'A new market pickup was added to your route.', 'pickup', pickup_row.id);
      end if;
      insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
      values
        (pickup_row.vendor_id, 'vendor', 'Driver assigned', chosen.name || ' has been assigned to your pickup.', 'pickup', pickup_row.id),
        (chosen.partner_id, 'recycler', 'Pickup assigned', chosen.name || ' received a new pickup assignment.', 'pickup', pickup_row.id);
    end loop;

    if assigned_count = 0 then
      delete from public.pickup_batches where id = new_batch_id;
      continue;
    end if;

    update public.drivers set
      current_load = current_load + assigned_load,
      status = 'Assigned',
      is_available = (capacity_kg - current_load - assigned_load) >= greatest(capacity_kg * 0.10, 10)
    where id = chosen.id;

    update public.pickup_batches set
      pickup_count = assigned_count,
      planned_load_kg = assigned_load,
      status = case when assigned_count < ready_count then 'Partially assigned' else 'Assigned' end
    where id = new_batch_id;
    total_assigned := total_assigned + assigned_count;
  end loop;

  return total_assigned;
end;
$$;

create or replace function public.driver_update_pickup_status(
  p_pickup_id uuid,
  p_status public.pickup_status,
  p_actual_weight numeric default null,
  p_facility text default null,
  p_completion_notes text default null,
  p_completion_image_url text default null
)
returns public.pickup_requests
language plpgsql security definer set search_path = '' as $$
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

  select * into current_row from public.pickup_requests where id = p_pickup_id for update;
  if current_row.id is null or current_row.assigned_driver_id <> driver_row.id then
    raise exception 'Pickup is not assigned to this driver';
  end if;
  previous := current_row.status;

  if not (
    (previous = 'assigned' and p_status in ('accepted', 'cancelled')) or
    (previous = 'accepted' and p_status in ('in_transit', 'cancelled')) or
    (previous = 'in_transit' and p_status in ('arrived', 'cancelled')) or
    (previous = 'arrived' and p_status in ('collected', 'cancelled')) or
    (previous = 'collected' and p_status in ('completed', 'cancelled'))
  ) then raise exception 'Invalid driver pickup status transition'; end if;

  if p_status = 'completed' and (p_actual_weight is null or p_actual_weight <= 0 or nullif(trim(p_facility), '') is null) then
    raise exception 'Actual weight and destination facility are required';
  end if;

  update public.pickup_requests set
    status = p_status,
    actual_weight = case when p_status = 'completed' then p_actual_weight else actual_weight end,
    facility = case when p_status = 'completed' then p_facility else facility end,
    completion_notes = case when p_status = 'completed' then p_completion_notes else completion_notes end,
    completion_image_url = case when p_status = 'completed' then p_completion_image_url else completion_image_url end,
    accepted_at = case when p_status = 'accepted' then now() else accepted_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    updated_at = now()
  where id = p_pickup_id returning * into result;

  insert into public.pickup_status_history(pickup_id, actor_id, previous_status, status, note)
  values (result.id, (select auth.uid()), previous, p_status, p_completion_notes);

  update public.pickup_assignments set
    accepted_at = case when p_status = 'accepted' then now() else accepted_at end,
    journey_started_at = case when p_status = 'in_transit' then now() else journey_started_at end,
    arrived_at = case when p_status = 'arrived' then now() else arrived_at end,
    collected_at = case when p_status = 'collected' then now() else collected_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    released_at = case when p_status = 'cancelled' then now() else released_at end
  where pickup_id = result.id and released_at is null;

  if p_status = 'accepted' then
    update public.pickup_batches set status = 'In progress'
    where id = result.assignment_batch_id and status <> 'Completed';
    insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
    values (driver_row.partner_id, 'recycler', 'Driver accepted pickup', driver_row.name || ' accepted ' || result.reference_code || '.', 'pickup', result.id);
  elsif p_status = 'in_transit' then
    update public.drivers set status = 'On route' where id = driver_row.id;
    insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
    values (result.vendor_id, 'vendor', 'Driver en route', driver_row.name || ' has started the journey to your pickup.', 'pickup', result.id);
  elsif p_status = 'arrived' then
    insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
    values (result.vendor_id, 'vendor', 'Driver arrived', driver_row.name || ' has arrived at the pickup location.', 'pickup', result.id);
  elsif p_status = 'completed' then
    load_estimate := public.estimated_pickup_load_kg(result);
    update public.drivers d set
      current_load = greatest(0, d.current_load - load_estimate),
      status = case
        when exists (select 1 from public.pickup_requests p where p.assigned_driver_id = d.id and p.id <> result.id and p.status in ('in_transit', 'arrived', 'collected')) then 'On route'
        when exists (select 1 from public.pickup_requests p where p.assigned_driver_id = d.id and p.id <> result.id and p.status in ('assigned', 'accepted')) then 'Assigned'
        else 'Available'
      end,
      is_available = (d.capacity_kg - greatest(0, d.current_load - load_estimate)) >= greatest(d.capacity_kg * 0.10, 10),
      updated_at = now()
    where d.id = driver_row.id;
    insert into public.waste_recoveries(
      pickup_id, recycler_id, material_category, collected_weight, recovered_weight, processing_method
    ) values (
      result.id, driver_row.partner_id, result.waste_type, p_actual_weight, p_actual_weight, p_facility
    ) on conflict (pickup_id) do update set
      collected_weight = excluded.collected_weight,
      recovered_weight = excluded.recovered_weight,
      processing_method = excluded.processing_method;
    insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
    values
      (result.vendor_id, 'vendor', 'Pickup completed', 'Your pickup has been completed and weighed.', 'pickup', result.id),
      (driver_row.partner_id, 'recycler', 'Driver completed pickup', driver_row.name || ' completed ' || result.reference_code || '.', 'pickup', result.id);
  elsif p_status = 'cancelled' then
    load_estimate := public.estimated_pickup_load_kg(result);
    update public.drivers d set
      current_load = greatest(0, d.current_load - load_estimate),
      status = case
        when exists (select 1 from public.pickup_requests p where p.assigned_driver_id = d.id and p.id <> result.id and p.status in ('in_transit', 'arrived', 'collected')) then 'On route'
        when exists (select 1 from public.pickup_requests p where p.assigned_driver_id = d.id and p.id <> result.id and p.status in ('assigned', 'accepted')) then 'Assigned'
        else 'Available'
      end,
      is_available = (d.capacity_kg - greatest(0, d.current_load - load_estimate)) >= greatest(d.capacity_kg * 0.10, 10),
      updated_at = now()
    where d.id = driver_row.id;
    insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
    values (driver_row.user_id, 'driver', 'Pickup cancelled', result.reference_code || ' was cancelled.', 'pickup', result.id);
  end if;

  if p_status in ('completed', 'cancelled') and result.assignment_batch_id is not null and not exists (
    select 1 from public.pickup_requests p
    where p.assignment_batch_id = result.assignment_batch_id and p.status not in ('completed', 'cancelled')
  ) then
    update public.pickup_batches set status = 'Completed', completed_at = now()
    where id = result.assignment_batch_id;
  end if;

  return result;
end;
$$;

create or replace function public.update_driver_location(p_latitude double precision, p_longitude double precision)
returns public.drivers
language plpgsql security definer set search_path = '' as $$
declare result public.drivers;
begin
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Invalid GPS coordinates';
  end if;
  update public.drivers set
    current_latitude = p_latitude,
    current_longitude = p_longitude,
    last_location_at = now()
  where user_id = (select auth.uid()) and status <> 'Disabled'
  returning * into result;
  if result.id is null then raise exception 'Active driver profile not found'; end if;
  return result;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested public.app_role;
begin
  requested := case
    when new.raw_user_meta_data ->> 'role' in ('vendor','recycler','driver','admin')
      then (new.raw_user_meta_data ->> 'role')::public.app_role
    else 'vendor'::public.app_role
  end;
  insert into public.profiles(
    id, email, full_name, organization_name, phone, requested_role, role,
    approval_status, shop_number, registration_number, zone, market
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'organization_name', new.raw_user_meta_data ->> 'company', new.raw_user_meta_data ->> 'shop', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    requested,
    case when requested = 'admin' then null else requested end,
    case when requested = 'admin' then 'pending'::public.approval_status else 'approved'::public.approval_status end,
    new.raw_user_meta_data ->> 'shopNumber',
    coalesce(new.raw_user_meta_data ->> 'registration', new.raw_user_meta_data ->> 'employeeId'),
    new.raw_user_meta_data ->> 'zone',
    coalesce(new.raw_user_meta_data ->> 'market', new.raw_user_meta_data ->> 'zone', '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

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

alter table public.smart_assignment_config enable row level security;
alter table public.drivers enable row level security;
alter table public.pickup_batches enable row level security;
alter table public.pickup_assignments enable row level security;

grant select on public.smart_assignment_config, public.drivers, public.pickup_batches, public.pickup_assignments, public.driver_performance to authenticated;
grant insert, update on public.drivers to authenticated;
revoke all on function public.process_pickup_batches() from public;
revoke all on function public.driver_update_pickup_status(uuid, public.pickup_status, numeric, text, text, text) from public;
revoke all on function public.update_driver_location(double precision, double precision) from public;
grant execute on function public.process_pickup_batches() to authenticated, service_role;
grant execute on function public.driver_update_pickup_status(uuid, public.pickup_status, numeric, text, text, text) to authenticated;
grant execute on function public.update_driver_location(double precision, double precision) to authenticated;

drop policy if exists assignment_config_read on public.smart_assignment_config;
create policy assignment_config_read on public.smart_assignment_config for select to authenticated using (true);
drop policy if exists assignment_config_admin_update on public.smart_assignment_config;
create policy assignment_config_admin_update on public.smart_assignment_config for update to authenticated
using (public.is_admin() or public.current_app_role() = 'recycler')
with check (public.is_admin() or public.current_app_role() = 'recycler');

drop policy if exists drivers_read on public.drivers;
create policy drivers_read on public.drivers for select to authenticated using (
  partner_id = (select auth.uid()) or user_id = (select auth.uid()) or public.is_admin()
);
drop policy if exists drivers_partner_insert on public.drivers;
create policy drivers_partner_insert on public.drivers for insert to authenticated
with check (partner_id = (select auth.uid()) and public.current_app_role() = 'recycler');
drop policy if exists drivers_partner_update on public.drivers;
create policy drivers_partner_update on public.drivers for update to authenticated
using (partner_id = (select auth.uid()) or public.is_admin())
with check (partner_id = (select auth.uid()) or public.is_admin());

drop policy if exists pickup_batches_read on public.pickup_batches;
create policy pickup_batches_read on public.pickup_batches for select to authenticated using (
  partner_id = (select auth.uid()) or assigned_driver_id in (select id from public.drivers where user_id = (select auth.uid())) or public.is_admin()
);
drop policy if exists pickup_assignments_read on public.pickup_assignments;
create policy pickup_assignments_read on public.pickup_assignments for select to authenticated using (
  partner_id = (select auth.uid()) or driver_id in (select id from public.drivers where user_id = (select auth.uid())) or public.is_admin()
);

drop policy if exists pickups_read on public.pickup_requests;
create policy pickups_read on public.pickup_requests for select to authenticated using (
  vendor_id = (select auth.uid()) or recycler_id = (select auth.uid()) or public.is_admin() or
  assigned_driver_id in (select id from public.drivers where user_id = (select auth.uid()))
);

drop policy if exists pickup_history_read on public.pickup_status_history;
create policy pickup_history_read on public.pickup_status_history for select to authenticated using (
  exists (
    select 1 from public.pickup_requests p
    where p.id = pickup_id and (
      p.vendor_id = (select auth.uid()) or p.recycler_id = (select auth.uid()) or public.is_admin() or
      p.assigned_driver_id in (select id from public.drivers where user_id = (select auth.uid()))
    )
  )
);

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'ecoloop-smart-driver-assignment' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'ecoloop-smart-driver-assignment',
    '30 seconds',
    'select public.process_pickup_batches();'
  );
end;
$$;

commit;

begin;

create table if not exists public.driver_locations (
  driver_id uuid primary key references public.drivers(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m numeric(10,2) check (accuracy_m is null or accuracy_m >= 0),
  speed_mps numeric(10,2) check (speed_mps is null or speed_mps >= 0),
  heading_degrees numeric(6,2) check (heading_degrees is null or heading_degrees between 0 and 360),
  recorded_at timestamptz not null default now()
);

insert into public.driver_locations(driver_id, latitude, longitude, recorded_at)
select id, current_latitude, current_longitude, coalesce(last_location_at, now())
from public.drivers
where current_latitude is not null and current_longitude is not null
on conflict (driver_id) do update set
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  recorded_at = excluded.recorded_at;

create or replace function public.update_driver_live_location(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m numeric default null,
  p_speed_mps numeric default null,
  p_heading_degrees numeric default null
)
returns public.driver_locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_driver_id uuid;
  result public.driver_locations;
begin
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Invalid GPS coordinates';
  end if;
  if p_accuracy_m is not null and p_accuracy_m < 0 then
    raise exception 'Invalid GPS accuracy';
  end if;
  if p_heading_degrees is not null and p_heading_degrees not between 0 and 360 then
    raise exception 'Invalid GPS heading';
  end if;

  select id into resolved_driver_id
  from public.drivers
  where user_id = (select auth.uid()) and status <> 'Disabled'
  limit 1;

  if resolved_driver_id is null then
    raise exception 'Active driver profile not found';
  end if;

  insert into public.driver_locations(
    driver_id, latitude, longitude, accuracy_m, speed_mps,
    heading_degrees, recorded_at
  ) values (
    resolved_driver_id, p_latitude, p_longitude, p_accuracy_m,
    case when p_speed_mps is null then null else greatest(p_speed_mps, 0) end,
    p_heading_degrees, now()
  )
  on conflict (driver_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m,
    speed_mps = excluded.speed_mps,
    heading_degrees = excluded.heading_degrees,
    recorded_at = excluded.recorded_at
  returning * into result;

  update public.drivers set
    current_latitude = p_latitude,
    current_longitude = p_longitude,
    last_location_at = result.recorded_at,
    updated_at = result.recorded_at
  where id = resolved_driver_id;

  return result;
end;
$$;

alter table public.driver_locations enable row level security;
grant select on public.driver_locations to authenticated;
revoke all on function public.update_driver_live_location(double precision, double precision, numeric, numeric, numeric) from public;
grant execute on function public.update_driver_live_location(double precision, double precision, numeric, numeric, numeric) to authenticated;

drop policy if exists driver_locations_read on public.driver_locations;
create policy driver_locations_read on public.driver_locations
for select to authenticated using (
  exists (
    select 1
    from public.drivers driver
    where driver.id = driver_id
      and (
        driver.user_id = (select auth.uid())
        or driver.partner_id = (select auth.uid())
        or public.is_admin()
        or exists (
          select 1
          from public.pickup_requests pickup
          where pickup.assigned_driver_id = driver.id
            and pickup.vendor_id = (select auth.uid())
            and pickup.status in ('assigned', 'accepted', 'in_transit', 'arrived', 'collected')
        )
      )
  )
);

do $$
begin
  alter publication supabase_realtime add table public.driver_locations;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.pickup_requests;
exception
  when duplicate_object then null;
end
$$;

-- Chandapura pilot coordinates provide a destination marker until precise stall
-- coordinates are captured in a later onboarding step.
update public.markets
set latitude = coalesce(latitude, 12.800494),
    longitude = coalesce(longitude, 77.713615)
where lower(name) like 'chandapura%';

update public.pickup_requests pickup
set vendor_latitude = market.latitude,
    vendor_longitude = market.longitude
from public.markets market
where pickup.market_id = market.id
  and (pickup.vendor_latitude is null or pickup.vendor_longitude is null)
  and market.latitude is not null
  and market.longitude is not null;

commit;

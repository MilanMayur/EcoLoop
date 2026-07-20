-- Keep the BBMP market view connected to vendor registrations. Existing
-- profiles retain their market text; market_id is populated automatically.
create or replace function public.link_profile_market()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_market_id uuid;
  resolved_market_name text;
begin
  if nullif(trim(coalesce(new.market, '')), '') is null then
    return new;
  end if;

  -- Treat "Chandapura" and "Chandapura Market" as the same market while
  -- preserving a clear, consistent display name for the BBMP dashboard.
  resolved_market_name := initcap(lower(regexp_replace(trim(new.market), '\\s+market\\s*$', '', 'i'))) || ' Market';

  select id into resolved_market_id
  from public.markets
  where lower(trim(name)) = lower(trim(resolved_market_name))
  limit 1;

  if resolved_market_id is null then
    insert into public.markets(name)
    values (resolved_market_name)
    returning id into resolved_market_id;
  end if;

  new.market_id := resolved_market_id;
  return new;
end;
$$;

drop trigger if exists link_profile_market on public.profiles;
create trigger link_profile_market
before insert or update of market on public.profiles
for each row execute function public.link_profile_market();

-- Backfill existing vendor registrations and the pickups they created.
update public.profiles
set market = market
where market_id is null
  and nullif(trim(coalesce(market, '')), '') is not null;

update public.pickup_requests pickup
set market_id = profile.market_id
from public.profiles profile
where pickup.vendor_id = profile.id
  and pickup.market_id is null
  and profile.market_id is not null;

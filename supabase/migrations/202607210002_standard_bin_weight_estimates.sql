begin;

alter table public.markets
  alter column default_bin_capacity_kg set default 120;

update public.markets
set default_bin_capacity_kg = 120,
    updated_at = now()
where default_bin_capacity_kg = 100;

create or replace function public.enforce_supported_pickup_fill_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.fill_level not in ('75%', '100% (Full)', 'Overflowing') then
    raise exception using message = 'Pickup fill level must be 75%, 100% (Full), or Overflowing';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_supported_pickup_fill_level
  on public.pickup_requests;
create trigger enforce_supported_pickup_fill_level
before insert on public.pickup_requests
for each row execute function public.enforce_supported_pickup_fill_level();

create or replace function public.estimated_pickup_load_kg(
  p_pickup public.pickup_requests
)
returns numeric
language sql
stable
set search_path = ''
as $$
  select round(
    coalesce(m.default_bin_capacity_kg, 120) *
    case p_pickup.fill_level
      when '75%' then 0.75
      when '100% (Full)' then 1.00
      when 'Overflowing' then 1.20
      else 0.75
    end,
    2
  )
  from (select 1) as singleton
  left join public.markets m on m.id = p_pickup.market_id
$$;

comment on function public.estimated_pickup_load_kg(public.pickup_requests) is
  'Planning estimate based on a 120 kg standard bin. It never replaces driver-confirmed actual weight.';

commit;

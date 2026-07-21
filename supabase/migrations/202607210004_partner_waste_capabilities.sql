begin;

alter table public.profiles
  add column if not exists accepted_waste_types text[] not null default '{}'::text[];

alter table public.profiles
  drop constraint if exists profiles_accepted_waste_types_check;

alter table public.profiles
  add constraint profiles_accepted_waste_types_check
  check (
    accepted_waste_types <@ array[
      'Wet', 'Dry', 'Plastic', 'Paper', 'Metal', 'Glass', 'E-waste', 'Mixed'
    ]::text[]
  );

alter table public.pickup_requests
  drop constraint if exists pickup_requests_waste_type_check;

alter table public.pickup_requests
  add constraint pickup_requests_waste_type_check
  check (
    waste_type in ('Wet', 'Dry', 'Plastic', 'Paper', 'Metal', 'Glass', 'E-waste', 'Mixed')
  );

-- Preserve capabilities selected by existing partner accounts. Older signup
-- versions stored one combined string; current signup stores a JSON array.
update public.profiles profile
set accepted_waste_types = case
  when jsonb_typeof(account.raw_user_meta_data -> 'categories') = 'array' then
    array(
      select value
      from jsonb_array_elements_text(account.raw_user_meta_data -> 'categories') item(value)
      where value = any(array['Wet', 'Dry', 'Plastic', 'Paper', 'Metal', 'Glass', 'E-waste', 'Mixed']::text[])
    )
  when account.raw_user_meta_data ->> 'categories' = 'Wet, dry, and plastic'
    then array['Wet', 'Dry', 'Plastic']::text[]
  when account.raw_user_meta_data ->> 'categories' = 'Plastic and packaging'
    then array['Plastic', 'Paper']::text[]
  when account.raw_user_meta_data ->> 'categories' = 'Metal and e-waste'
    then array['Metal', 'E-waste']::text[]
  else profile.accepted_waste_types
end
from auth.users account
where account.id = profile.id
  and profile.requested_role = 'recycler';

create index if not exists profiles_accepted_waste_types_idx
  on public.profiles using gin (accepted_waste_types);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  requested public.app_role;
  accepted text[] := '{}'::text[];
begin
  requested := case
    when new.raw_user_meta_data ->> 'role' in ('vendor','recycler','driver','admin')
      then (new.raw_user_meta_data ->> 'role')::public.app_role
    else 'vendor'::public.app_role
  end;

  if requested = 'recycler' then
    if jsonb_typeof(new.raw_user_meta_data -> 'categories') = 'array' then
      accepted := array(
        select value
        from jsonb_array_elements_text(new.raw_user_meta_data -> 'categories') item(value)
        where value = any(array['Wet', 'Dry', 'Plastic', 'Paper', 'Metal', 'Glass', 'E-waste', 'Mixed']::text[])
      );
    elsif new.raw_user_meta_data ->> 'categories' = 'Wet, dry, and plastic' then
      accepted := array['Wet', 'Dry', 'Plastic']::text[];
    elsif new.raw_user_meta_data ->> 'categories' = 'Plastic and packaging' then
      accepted := array['Plastic', 'Paper']::text[];
    elsif new.raw_user_meta_data ->> 'categories' = 'Metal and e-waste' then
      accepted := array['Metal', 'E-waste']::text[];
    end if;
  end if;

  insert into public.profiles(
    id, email, full_name, organization_name, phone, requested_role, role,
    approval_status, shop_number, registration_number, zone, market,
    preferred_language, accepted_waste_types
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
    coalesce(new.raw_user_meta_data ->> 'market', new.raw_user_meta_data ->> 'zone', ''),
    case
      when new.raw_user_meta_data ->> 'preferred_language' in ('en','kn','hi')
        then new.raw_user_meta_data ->> 'preferred_language'
      else 'en'
    end,
    accepted
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.enforce_driver_partner_waste_capabilities()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  partner_capabilities text[];
begin
  if not (new.compatible_waste_types <@ array[
    'Wet', 'Dry', 'Plastic', 'Paper', 'Metal', 'Glass', 'E-waste', 'Mixed'
  ]::text[]) then
    raise exception 'Driver contains an unsupported waste stream';
  end if;

  select accepted_waste_types
  into partner_capabilities
  from public.profiles
  where id = new.partner_id and role = 'recycler';

  -- Empty capability arrays are retained only for legacy partners and remain
  -- unrestricted until their company capabilities are configured.
  if coalesce(cardinality(partner_capabilities), 0) > 0
    and not (new.compatible_waste_types <@ partner_capabilities) then
    raise exception 'Driver waste streams must be accepted by the recycling partner';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_driver_partner_waste_capabilities on public.drivers;
create trigger enforce_driver_partner_waste_capabilities
before insert or update of partner_id, compatible_waste_types
on public.drivers
for each row execute function public.enforce_driver_partner_waste_capabilities();

commit;

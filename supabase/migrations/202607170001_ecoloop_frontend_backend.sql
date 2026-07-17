-- EcoLoop browser-to-Supabase foundation.
-- Run this once in the Supabase SQL editor, then use only the publishable key in Next.js.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('vendor', 'recycler', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pickup_status as enum ('pending', 'assigned', 'accepted', 'in_transit', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  ward integer,
  zone text,
  status text not null default 'Healthy' check (status in ('Healthy', 'Attention', 'Offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  organization_name text not null default '',
  phone text not null default '',
  requested_role public.app_role not null default 'vendor',
  role public.app_role,
  approval_status public.approval_status not null default 'approved',
  is_active boolean not null default true,
  market_id uuid references public.markets(id) on delete set null,
  shop_number text,
  registration_number text,
  zone text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('ECO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  recycler_id uuid references public.profiles(id) on delete set null,
  market_id uuid references public.markets(id) on delete set null,
  vendor_name text not null default '',
  location text not null default '',
  waste_type text not null,
  estimated_weight numeric(12,2) not null check (estimated_weight > 0),
  collected_weight numeric(12,2) check (collected_weight is null or collected_weight >= 0),
  priority text not null default 'Normal',
  notes text,
  facility text,
  status public.pickup_status not null default 'pending',
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_status_history (
  id bigint generated always as identity primary key,
  pickup_id uuid not null references public.pickup_requests(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  previous_status public.pickup_status,
  status public.pickup_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  stock numeric(12,2) not null default 0 check (stock >= 0),
  unit text not null check (unit in ('kg', 'crate')),
  expiry_date date not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  forecast numeric(12,2) not null default 0 check (forecast >= 0),
  risk text not null default 'Low' check (risk in ('Low', 'Medium', 'High')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_alert_actions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  inventory_id uuid references public.inventory_items(id) on delete set null,
  product_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id text primary key,
  recycler_id uuid not null references public.profiles(id) on delete cascade,
  driver text not null,
  capacity_kg numeric(12,2) not null check (capacity_kg > 0),
  load_percent integer check (load_percent between 0 and 100),
  status text not null default 'Active' check (status in ('Active', 'Maintenance', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waste_recoveries (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid not null unique references public.pickup_requests(id) on delete cascade,
  recycler_id uuid not null references public.profiles(id) on delete cascade,
  material_category text not null,
  collected_weight numeric(12,2) not null check (collected_weight >= 0),
  recovered_weight numeric(12,2) not null default 0 check (recovered_weight >= 0),
  rejected_weight numeric(12,2) not null default 0 check (rejected_weight >= 0),
  processing_method text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recovered_weight + rejected_weight <= collected_weight)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.smart_scores (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  score_date date not null default current_date,
  inventory_planning integer not null check (inventory_planning between 0 and 100),
  demand_forecast_accuracy integer not null check (demand_forecast_accuracy between 0 and 100),
  waste_prevention integer not null check (waste_prevention between 0 and 100),
  sustainability integer not null check (sustainability between 0 and 100),
  overall_score integer not null check (overall_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (vendor_id, score_date)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare table_name text; begin
  foreach table_name in array array['markets','profiles','pickup_requests','inventory_items','vehicles','waste_recoveries'] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) and is_active and approval_status = 'approved' $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() = 'admin', false) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested public.app_role;
begin
  requested := case
    when new.raw_user_meta_data ->> 'role' in ('vendor','recycler','admin')
      then (new.raw_user_meta_data ->> 'role')::public.app_role
    else 'vendor'::public.app_role
  end;

  insert into public.profiles (
    id, email, full_name, organization_name, phone, requested_role, role,
    approval_status, shop_number, registration_number, zone
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
    new.raw_user_meta_data ->> 'zone'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles when Auth users existed before this migration was applied.
insert into public.profiles (id, email, full_name, organization_name, phone, requested_role, role, approval_status)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name', ''),
  coalesce(users.raw_user_meta_data ->> 'organization_name', users.raw_user_meta_data ->> 'company', users.raw_user_meta_data ->> 'shop', ''),
  coalesce(users.raw_user_meta_data ->> 'phone', ''),
  case when users.raw_user_meta_data ->> 'role' in ('vendor','recycler','admin') then (users.raw_user_meta_data ->> 'role')::public.app_role else 'vendor'::public.app_role end,
  case when users.raw_user_meta_data ->> 'role' = 'admin' then null when users.raw_user_meta_data ->> 'role' in ('vendor','recycler') then (users.raw_user_meta_data ->> 'role')::public.app_role else 'vendor'::public.app_role end,
  case when users.raw_user_meta_data ->> 'role' = 'admin' then 'pending'::public.approval_status else 'approved'::public.approval_status end
from auth.users as users
on conflict (id) do nothing;

create or replace function public.sync_user_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_user_email();

create or replace function public.accept_pickup(p_pickup_id uuid)
returns public.pickup_requests
language plpgsql security definer set search_path = '' as $$
declare result public.pickup_requests;
begin
  if public.current_app_role() <> 'recycler' then raise exception 'Only approved recyclers can accept pickups'; end if;
  update public.pickup_requests
  set recycler_id = (select auth.uid()), status = 'accepted', accepted_at = now()
  where id = p_pickup_id and status = 'pending' and recycler_id is null
  returning * into result;
  if result.id is null then raise exception 'Pickup is no longer available'; end if;
  insert into public.pickup_status_history(pickup_id, actor_id, previous_status, status)
  values (result.id, (select auth.uid()), 'pending', 'accepted');
  insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
  values (result.vendor_id, 'vendor', 'Recycler assigned', 'A verified recycler accepted your pickup request.', 'pickup', result.id);
  return result;
end;
$$;

create or replace function public.update_pickup_status(
  p_pickup_id uuid,
  p_status public.pickup_status,
  p_collected_weight numeric default null,
  p_facility text default null,
  p_notes text default null
)
returns public.pickup_requests
language plpgsql security definer set search_path = '' as $$
declare current_row public.pickup_requests; result public.pickup_requests; actor_role public.app_role;
begin
  actor_role := public.current_app_role();
  select * into current_row from public.pickup_requests where id = p_pickup_id for update;
  if current_row.id is null then raise exception 'Pickup not found'; end if;
  if actor_role <> 'admin' and not (actor_role = 'recycler' and current_row.recycler_id = (select auth.uid())) then
    raise exception 'Not authorized for this pickup';
  end if;
  if not (
    (current_row.status = 'assigned' and p_status in ('accepted','cancelled')) or
    (current_row.status = 'accepted' and p_status in ('in_transit','completed','cancelled')) or
    (current_row.status = 'in_transit' and p_status in ('completed','cancelled')) or
    (actor_role = 'admin' and current_row.status = 'pending' and p_status in ('assigned','cancelled'))
  ) then raise exception 'Invalid pickup status transition'; end if;

  update public.pickup_requests set
    status = p_status,
    collected_weight = coalesce(p_collected_weight, collected_weight),
    facility = coalesce(p_facility, facility),
    completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = p_pickup_id returning * into result;

  insert into public.pickup_status_history(pickup_id, actor_id, previous_status, status, note)
  values (result.id, (select auth.uid()), current_row.status, p_status, p_notes);
  insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
  values (result.vendor_id, 'vendor', 'Pickup status updated', 'Your pickup is now ' || replace(p_status::text, '_', ' ') || '.', 'pickup', result.id);
  return result;
end;
$$;

create or replace function public.review_profile(p_profile_id uuid, p_approve boolean, p_reason text default null)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare result public.profiles;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_profile_id = (select auth.uid()) then raise exception 'You cannot review your own account'; end if;
  update public.profiles set
    role = case when p_approve then requested_role else null end,
    approval_status = case when p_approve then 'approved'::public.approval_status else 'rejected'::public.approval_status end,
    approved_by = (select auth.uid()), approved_at = now(),
    rejection_reason = case when p_approve then null else p_reason end
  where id = p_profile_id and approval_status = 'pending'
  returning * into result;
  if result.id is null then raise exception 'Pending profile not found'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values ((select auth.uid()), case when p_approve then 'profile.approved' else 'profile.rejected' end, 'profile', result.id);
  insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
  values (result.id, result.requested_role, case when p_approve then 'Account approved' else 'Account review complete' end,
    case when p_approve then 'Your EcoLoop workspace is ready.' else 'Your EcoLoop access request was not approved.' end,
    'profile', result.id);
  return result;
end;
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.accept_pickup(uuid) from public;
revoke all on function public.update_pickup_status(uuid, public.pickup_status, numeric, text, text) from public;
revoke all on function public.review_profile(uuid, boolean, text) from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.accept_pickup(uuid) to authenticated;
grant execute on function public.update_pickup_status(uuid, public.pickup_status, numeric, text, text) to authenticated;
grant execute on function public.review_profile(uuid, boolean, text) to authenticated;

alter table public.markets enable row level security;
alter table public.profiles enable row level security;
alter table public.pickup_requests enable row level security;
alter table public.pickup_status_history enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_alert_actions enable row level security;
alter table public.vehicles enable row level security;
alter table public.waste_recoveries enable row level security;
alter table public.notifications enable row level security;
alter table public.smart_scores enable row level security;
alter table public.audit_logs enable row level security;

grant select on public.markets, public.profiles, public.pickup_requests, public.pickup_status_history,
  public.inventory_items, public.stock_alert_actions, public.vehicles, public.waste_recoveries,
  public.notifications, public.smart_scores, public.audit_logs to authenticated;
grant insert on public.pickup_requests, public.inventory_items, public.stock_alert_actions,
  public.vehicles, public.waste_recoveries to authenticated;
grant update, delete on public.inventory_items, public.vehicles, public.waste_recoveries to authenticated;
grant update (full_name, organization_name, phone, market_id, shop_number, registration_number, zone, updated_at) on public.profiles to authenticated;
grant update (read) on public.notifications to authenticated;

drop policy if exists markets_read on public.markets;
create policy markets_read on public.markets for select to authenticated using (true);
drop policy if exists markets_admin_write on public.markets;
create policy markets_admin_write on public.markets for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());

drop policy if exists pickups_read on public.pickup_requests;
create policy pickups_read on public.pickup_requests for select to authenticated using (
  vendor_id = (select auth.uid()) or recycler_id = (select auth.uid()) or public.is_admin() or
  (public.current_app_role() = 'recycler' and status = 'pending')
);
drop policy if exists pickups_vendor_insert on public.pickup_requests;
create policy pickups_vendor_insert on public.pickup_requests for insert to authenticated
with check (vendor_id = (select auth.uid()) and public.current_app_role() = 'vendor' and status = 'pending' and recycler_id is null);

drop policy if exists pickup_history_read on public.pickup_status_history;
create policy pickup_history_read on public.pickup_status_history for select to authenticated using (
  exists (select 1 from public.pickup_requests p where p.id = pickup_id)
);

drop policy if exists inventory_owner_all on public.inventory_items;
create policy inventory_owner_all on public.inventory_items for all to authenticated
using (vendor_id = (select auth.uid()) or public.is_admin())
with check (vendor_id = (select auth.uid()) or public.is_admin());

drop policy if exists stock_actions_owner on public.stock_alert_actions;
create policy stock_actions_owner on public.stock_alert_actions for all to authenticated
using (vendor_id = (select auth.uid()) or public.is_admin())
with check (vendor_id = (select auth.uid()) or public.is_admin());

drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles for select to authenticated using (true);
drop policy if exists vehicles_owner_write on public.vehicles;
create policy vehicles_owner_write on public.vehicles for all to authenticated
using (recycler_id = (select auth.uid()) or public.is_admin())
with check (recycler_id = (select auth.uid()) or public.is_admin());

drop policy if exists recoveries_read on public.waste_recoveries;
create policy recoveries_read on public.waste_recoveries for select to authenticated using (
  recycler_id = (select auth.uid()) or public.is_admin() or
  exists (select 1 from public.pickup_requests p where p.id = pickup_id and p.vendor_id = (select auth.uid()))
);
drop policy if exists recoveries_write on public.waste_recoveries;
create policy recoveries_write on public.waste_recoveries for all to authenticated
using (recycler_id = (select auth.uid()) or public.is_admin())
with check (recycler_id = (select auth.uid()) or public.is_admin());

drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists scores_read on public.smart_scores;
create policy scores_read on public.smart_scores for select to authenticated
using (vendor_id = (select auth.uid()) or public.is_admin());

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

create index if not exists pickup_vendor_idx on public.pickup_requests(vendor_id, created_at desc);
create index if not exists pickup_recycler_idx on public.pickup_requests(recycler_id, status);
create index if not exists pickup_available_idx on public.pickup_requests(status, created_at) where status = 'pending';
create index if not exists inventory_vendor_idx on public.inventory_items(vendor_id, updated_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists recovery_recycler_idx on public.waste_recoveries(recycler_id, created_at desc);

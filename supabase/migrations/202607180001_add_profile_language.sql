begin;

alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

alter table public.profiles
  drop constraint if exists profiles_preferred_language_check;

alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language in ('en', 'kn', 'hi'));

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
    approval_status, shop_number, registration_number, zone, preferred_language
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
    case
      when new.raw_user_meta_data ->> 'preferred_language' in ('en','kn','hi')
        then new.raw_user_meta_data ->> 'preferred_language'
      else 'en'
    end
  ) on conflict (id) do nothing;
  return new;
end;
$$;

commit;

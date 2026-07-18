begin;

alter table public.profiles
  add column if not exists market text not null default '',
  add column if not exists profile_image_url text;

update public.profiles
set market = organization_name
where market = '' and organization_name <> '';

grant update (full_name, organization_name, phone, market, profile_image_url, updated_at)
on public.profiles to authenticated;

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
    id, email, full_name, organization_name, phone, market, requested_role, role,
    approval_status, shop_number, registration_number, zone, preferred_language
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'organization_name', new.raw_user_meta_data ->> 'company', new.raw_user_meta_data ->> 'shop', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'market', new.raw_user_meta_data ->> 'zone', ''),
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_images_public_read on storage.objects;
create policy profile_images_public_read on storage.objects for select
using (bucket_id = 'profile-images');

drop policy if exists profile_images_owner_insert on storage.objects;
create policy profile_images_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-images' and
  (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_images_owner_update on storage.objects;
create policy profile_images_owner_update on storage.objects for update to authenticated
using (
  bucket_id = 'profile-images' and
  (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-images' and
  (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_images_owner_delete on storage.objects;
create policy profile_images_owner_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-images' and
  (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;

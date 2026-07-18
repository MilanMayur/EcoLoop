begin;

alter table public.pickup_requests
  add column if not exists fill_level text,
  add column if not exists image_url text,
  add column if not exists actual_weight numeric(12,2),
  add column if not exists completion_image_url text,
  add column if not exists completion_notes text;

update public.pickup_requests
set fill_level = case
  when estimated_weight <= 15 then '25%'
  when estimated_weight <= 30 then '50%'
  when estimated_weight <= 50 then '75%'
  when estimated_weight <= 75 then '100% (Full)'
  else 'Overflowing'
end
where fill_level is null;

update public.pickup_requests
set actual_weight = collected_weight
where actual_weight is null and collected_weight is not null;

alter table public.pickup_requests
  alter column fill_level set not null,
  drop constraint if exists pickup_requests_fill_level_check,
  drop constraint if exists pickup_requests_actual_weight_check;

alter table public.pickup_requests
  add constraint pickup_requests_fill_level_check
  check (fill_level in ('25%', '50%', '75%', '100% (Full)', 'Overflowing')),
  add constraint pickup_requests_actual_weight_check
  check (actual_weight is null or actual_weight > 0);

alter table public.pickup_requests
  drop column if exists estimated_weight,
  drop column if exists collected_weight;

drop function if exists public.update_pickup_status(uuid, public.pickup_status, numeric, text, text);

create function public.update_pickup_status(
  p_pickup_id uuid,
  p_status public.pickup_status,
  p_actual_weight numeric default null,
  p_facility text default null,
  p_completion_notes text default null,
  p_completion_image_url text default null
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
    (current_row.status = 'accepted' and p_status in ('in_transit','cancelled')) or
    (current_row.status = 'in_transit' and p_status in ('completed','cancelled')) or
    (actor_role = 'admin' and current_row.status = 'pending' and p_status in ('assigned','cancelled'))
  ) then raise exception 'Invalid pickup status transition'; end if;

  if p_status = 'completed' and (p_actual_weight is null or p_actual_weight <= 0) then
    raise exception 'Actual weight is required to complete a pickup';
  end if;
  if p_status = 'completed' and nullif(trim(p_facility), '') is null then
    raise exception 'Destination facility is required to complete a pickup';
  end if;

  update public.pickup_requests set
    status = p_status,
    actual_weight = case when p_status = 'completed' then p_actual_weight else actual_weight end,
    facility = case when p_status = 'completed' then p_facility else facility end,
    completion_notes = case when p_status = 'completed' then p_completion_notes else completion_notes end,
    completion_image_url = case when p_status = 'completed' then p_completion_image_url else completion_image_url end,
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    updated_at = now()
  where id = p_pickup_id returning * into result;

  insert into public.pickup_status_history(pickup_id, actor_id, previous_status, status, note)
  values (result.id, (select auth.uid()), current_row.status, p_status, p_completion_notes);

  if p_status = 'completed' then
    insert into public.waste_recoveries(
      pickup_id, recycler_id, material_category, collected_weight,
      processing_method, verified, updated_at
    ) values (
      result.id, result.recycler_id, result.waste_type, result.actual_weight,
      result.facility, false, now()
    )
    on conflict (pickup_id) do update set
      collected_weight = excluded.collected_weight,
      material_category = excluded.material_category,
      processing_method = excluded.processing_method,
      updated_at = now();
  end if;

  insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
  values (result.vendor_id, 'vendor', 'Pickup status updated', 'Your pickup is now ' || replace(p_status::text, '_', ' ') || '.', 'pickup', result.id);

  insert into public.notifications(user_id, role, title, message, entity_type, entity_id)
  select id, 'admin', 'Pickup status updated', result.reference_code || ' is now ' || replace(p_status::text, '_', ' ') || '.', 'pickup', result.id
  from public.profiles
  where role = 'admin' and is_active and approval_status = 'approved';

  return result;
end;
$$;

revoke all on function public.update_pickup_status(uuid, public.pickup_status, numeric, text, text, text) from public;
grant execute on function public.update_pickup_status(uuid, public.pickup_status, numeric, text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pickup-images', 'pickup-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pickup_images_public_read on storage.objects;
create policy pickup_images_public_read on storage.objects for select
using (bucket_id = 'pickup-images');

drop policy if exists pickup_images_authenticated_insert on storage.objects;
create policy pickup_images_authenticated_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'pickup-images' and
  (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists pickup_images_owner_update on storage.objects;
create policy pickup_images_owner_update on storage.objects for update to authenticated
using (bucket_id = 'pickup-images' and owner_id = (select auth.uid()::text))
with check (bucket_id = 'pickup-images' and owner_id = (select auth.uid()::text));

drop policy if exists pickup_images_owner_delete on storage.objects;
create policy pickup_images_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'pickup-images' and owner_id = (select auth.uid()::text));

commit;

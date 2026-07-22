begin;

create or replace function public.cancel_pickup(
  p_pickup_id uuid,
  p_reason text default null
)
returns public.pickup_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role;
  current_row public.pickup_requests;
  result public.pickup_requests;
  resolved_reason text;
  driver_user_id uuid;
begin
  actor_role := public.current_app_role();

  if actor_id is null or actor_role is null then
    raise exception 'An approved EcoLoop account is required';
  end if;

  select * into current_row
  from public.pickup_requests
  where id = p_pickup_id
  for update;

  if current_row.id is null then
    raise exception 'Pickup request not found';
  end if;

  if current_row.status in ('cancelled', 'collected', 'completed') then
    raise exception 'This pickup can no longer be cancelled';
  end if;

  resolved_reason := nullif(trim(coalesce(p_reason, '')), '');

  if actor_role = 'vendor' then
    if current_row.vendor_id <> actor_id then
      raise exception 'You can cancel only your own pickup request';
    end if;
    if current_row.status <> 'pending' then
      raise exception 'Vendors can cancel only while a request is pending';
    end if;
    resolved_reason := coalesce(
      resolved_reason,
      'Cancelled by vendor before driver assignment'
    );
  elsif actor_role = 'recycler' then
    if current_row.recycler_id <> actor_id then
      raise exception 'This pickup is not assigned to your recycling company';
    end if;
    if current_row.status not in (
      'assigned',
      'accepted',
      'in_transit',
      'arrived'
    ) then
      raise exception 'Recycler managers cannot cancel at this pickup stage';
    end if;
    if resolved_reason is null then
      raise exception 'Recycler managers must provide a cancellation reason';
    end if;
  elsif actor_role = 'admin' then
    if current_row.status not in (
      'pending',
      'assigned',
      'accepted',
      'in_transit',
      'arrived'
    ) then
      raise exception 'TMC cannot cancel at this pickup stage';
    end if;
    if resolved_reason is null then
      raise exception 'TMC must provide an exceptional cancellation reason';
    end if;
  else
    raise exception 'Only vendors, recycler managers, or TMC can cancel pickups';
  end if;

  if char_length(resolved_reason) not between 5 and 500 then
    raise exception 'Cancellation reason must be between 5 and 500 characters';
  end if;

  perform set_config(
    'ecoloop.pickup_cancellation_context',
    actor_role::text,
    true
  );

  update public.pickup_requests
  set
    status = 'cancelled',
    cancellation_reason = resolved_reason,
    cancelled_at = now(),
    cancelled_by = actor_id,
    cancelled_by_role = actor_role,
    updated_at = now()
  where id = current_row.id
  returning * into result;

  insert into public.pickup_status_history(
    pickup_id,
    actor_id,
    previous_status,
    status,
    note
  )
  values (
    result.id,
    actor_id,
    current_row.status,
    'cancelled',
    resolved_reason
  );

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    actor_id,
    'pickup.cancelled',
    'pickup',
    result.id,
    jsonb_build_object(
      'reference_code', result.reference_code,
      'actor_role', actor_role::text,
      'previous_status', current_row.status::text,
      'reason', resolved_reason,
      'vendor_id', result.vendor_id,
      'recycler_id', result.recycler_id,
      'assigned_driver_id', result.assigned_driver_id
    )
  );

  update public.pickup_assignments
  set released_at = coalesce(released_at, now())
  where pickup_id = result.id
    and released_at is null;

  if result.assigned_driver_id is not null then
    perform public.recalculate_driver_loads(result.assigned_driver_id);

    update public.drivers driver
    set status = case
      when exists (
        select 1
        from public.pickup_requests pickup
        where pickup.assigned_driver_id = driver.id
          and pickup.status in ('in_transit', 'arrived', 'collected')
      ) then 'On route'
      when exists (
        select 1
        from public.pickup_requests pickup
        where pickup.assigned_driver_id = driver.id
          and pickup.status in ('assigned', 'accepted')
      ) then 'Assigned'
      else 'Available'
    end
    where driver.id = result.assigned_driver_id;

    select user_id into driver_user_id
    from public.drivers
    where id = result.assigned_driver_id;
  end if;

  if result.assignment_batch_id is not null
    and not exists (
      select 1
      from public.pickup_requests pickup
      where pickup.assignment_batch_id = result.assignment_batch_id
        and pickup.status not in ('completed', 'cancelled')
    ) then
    update public.pickup_batches
    set status = 'Completed',
        completed_at = coalesce(completed_at, now())
    where id = result.assignment_batch_id;
  end if;

  if actor_role <> 'vendor' then
    insert into public.notifications(
      user_id,
      role,
      title,
      message,
      entity_type,
      entity_id
    )
    values (
      result.vendor_id,
      'vendor',
      'Pickup cancelled',
      result.reference_code || ' was cancelled. Reason: ' || resolved_reason,
      'pickup',
      result.id
    );
  end if;

  if result.recycler_id is not null and actor_role <> 'recycler' then
    insert into public.notifications(
      user_id,
      role,
      title,
      message,
      entity_type,
      entity_id
    )
    values (
      result.recycler_id,
      'recycler',
      'Pickup cancelled',
      result.reference_code || ' was cancelled by TMC. Reason: ' || resolved_reason,
      'pickup',
      result.id
    );
  end if;

  if driver_user_id is not null then
    insert into public.notifications(
      user_id,
      role,
      title,
      message,
      entity_type,
      entity_id
    )
    values (
      driver_user_id,
      'driver',
      'Assigned pickup cancelled',
      result.reference_code || ' was removed from your route. Reason: ' || resolved_reason,
      'pickup',
      result.id
    );
  end if;

  if actor_role <> 'admin' then
    insert into public.notifications(
      user_id,
      role,
      title,
      message,
      entity_type,
      entity_id
    )
    select
      profile.id,
      'admin',
      'Pickup cancellation recorded',
      result.reference_code || ' was cancelled by ' || actor_role::text || '. Reason: ' || resolved_reason,
      'pickup',
      result.id
    from public.profiles profile
    where profile.role = 'admin'
      and profile.is_active
      and profile.approval_status = 'approved';
  end if;

  return result;
end;
$$;

revoke all on function public.cancel_pickup(uuid, text) from public, anon;
grant execute on function public.cancel_pickup(uuid, text) to authenticated;

comment on function public.cancel_pickup(uuid, text) is
  'Cancels a pickup using role-based rules, releases capacity, records audit history, and notifies affected users.';

commit;

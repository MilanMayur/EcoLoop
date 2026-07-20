begin;

-- Keep the full assignment implementation private, then expose a guarded
-- entry point used by both pg_cron and authenticated partner/admin clients.
alter function public.process_pickup_batches()
  rename to _process_pickup_batches_unchecked;

revoke all on function public._process_pickup_batches_unchecked()
  from public, anon, authenticated, service_role;

create or replace function public.process_pickup_batches()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  india_hour integer;
begin
  india_hour := extract(
    hour from statement_timestamp() at time zone 'Asia/Kolkata'
  )::integer;

  -- Collections operate from 06:00 inclusive until 21:00 exclusive in IST.
  -- Outside this window pending requests stay queued for the next shift.
  if india_hour < 6 or india_hour >= 21 then
    return 0;
  end if;

  return public._process_pickup_batches_unchecked();
end;
$$;

revoke all on function public.process_pickup_batches() from public, anon;
grant execute on function public.process_pickup_batches()
  to authenticated, service_role;

comment on function public.process_pickup_batches() is
  'Processes ready pickup batches only from 06:00 through 20:59 Asia/Kolkata.';

commit;


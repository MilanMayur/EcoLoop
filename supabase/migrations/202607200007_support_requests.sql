begin;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requester_role public.app_role not null,
  requester_name text not null,
  requester_email text not null,
  requester_phone text not null default '',
  requester_organization text not null default '',
  requester_market text not null default '',
  subject varchar(120) not null check (char_length(trim(subject)) between 3 and 120),
  issue varchar(2000) not null check (char_length(trim(issue)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_created_idx
  on public.support_requests(created_at desc);
create index if not exists support_requests_status_idx
  on public.support_requests(status, created_at desc);

drop trigger if exists set_support_requests_updated_at on public.support_requests;
create trigger set_support_requests_updated_at
before update on public.support_requests
for each row execute function public.set_updated_at();

create or replace function public.create_support_request(
  p_subject text,
  p_issue text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester public.profiles;
  request_id uuid;
begin
  if char_length(trim(coalesce(p_subject, ''))) not between 3 and 120 then
    raise exception 'Subject must be between 3 and 120 characters';
  end if;
  if char_length(trim(coalesce(p_issue, ''))) not between 10 and 2000 then
    raise exception 'Issue must be between 10 and 2000 characters';
  end if;

  select * into requester
  from public.profiles
  where id = (select auth.uid())
    and is_active
    and approval_status = 'approved'
    and role is not null;

  if requester.id is null then
    raise exception 'An approved EcoLoop account is required';
  end if;

  insert into public.support_requests(
    user_id,
    requester_role,
    requester_name,
    requester_email,
    requester_phone,
    requester_organization,
    requester_market,
    subject,
    issue
  ) values (
    requester.id,
    requester.role,
    coalesce(nullif(trim(requester.full_name), ''), 'EcoLoop user'),
    requester.email,
    requester.phone,
    requester.organization_name,
    coalesce(nullif(requester.market, ''), requester.zone, ''),
    trim(p_subject),
    trim(p_issue)
  )
  returning id into request_id;

  return request_id;
end;
$$;

alter table public.support_requests enable row level security;

revoke all on public.support_requests from anon, authenticated;
grant select on public.support_requests to authenticated;

revoke all on function public.create_support_request(text, text) from public, anon;
grant execute on function public.create_support_request(text, text) to authenticated;

drop policy if exists support_requests_admin_read on public.support_requests;
create policy support_requests_admin_read
on public.support_requests for select to authenticated
using (public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.support_requests;
exception
  when duplicate_object then null;
end
$$;

commit;

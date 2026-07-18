begin;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = coalesce(new.email, ''), updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
after update of email on auth.users
for each row execute procedure public.sync_profile_email();

update public.profiles as profile
set email = auth_user.email, updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.email is distinct from auth_user.email;

commit;

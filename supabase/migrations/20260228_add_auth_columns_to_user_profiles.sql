alter table public.user_profiles
  add column if not exists email text,
  add column if not exists auth_user_id uuid,
  add column if not exists pair_code_plain text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_auth_user_id_fkey'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users(id)
      on delete set null;
  end if;
end
$$;

create unique index if not exists user_profiles_email_unique_idx
  on public.user_profiles (lower(email))
  where email is not null;

create unique index if not exists user_profiles_auth_user_id_unique_idx
  on public.user_profiles (auth_user_id)
  where auth_user_id is not null;

update public.user_profiles up
set email = lower(au.email)
from auth.users au
where up.auth_user_id = au.id
  and au.email is not null
  and (up.email is null or lower(up.email) <> lower(au.email));

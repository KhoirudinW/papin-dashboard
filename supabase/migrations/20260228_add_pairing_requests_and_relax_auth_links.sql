create table if not exists public.pairing_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.user_profiles(id) on delete cascade,
  requested_to uuid not null references public.user_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  note text null,
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz null,
  responded_by uuid null references public.user_profiles(id) on delete set null
);

create index if not exists pairing_requests_requested_by_idx
  on public.pairing_requests (requested_by);

create index if not exists pairing_requests_requested_to_idx
  on public.pairing_requests (requested_to);

create index if not exists pairing_requests_status_idx
  on public.pairing_requests (status);

drop index if exists public.user_profiles_email_unique_idx;
drop index if exists public.user_profiles_auth_user_id_unique_idx;

create index if not exists user_profiles_email_lower_idx
  on public.user_profiles (lower(email))
  where email is not null;

create index if not exists user_profiles_auth_user_id_idx
  on public.user_profiles (auth_user_id)
  where auth_user_id is not null;

create extension if not exists pgcrypto;

create table if not exists public.pair_code_change_requests (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  requested_by uuid not null references public.user_profiles(id) on delete restrict,
  requested_for uuid not null references public.user_profiles(id) on delete restrict,
  new_pair_code_hash text not null,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz null,
  responded_by uuid null references public.user_profiles(id) on delete restrict,
  expires_at timestamptz not null default timezone('utc', now()) + interval '24 hour',
  constraint pair_code_change_requests_status_valid check (
    status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')
  ),
  constraint pair_code_change_requests_requester_diff check (requested_by <> requested_for)
);

create unique index if not exists idx_pair_code_change_one_pending_per_pair
  on public.pair_code_change_requests (pair_id)
  where status = 'pending';

create index if not exists idx_pair_code_change_requested_for_status_created
  on public.pair_code_change_requests (requested_for, status, created_at desc);

create index if not exists idx_pair_code_change_requested_by_created
  on public.pair_code_change_requests (requested_by, created_at desc);

create or replace function public.set_pair_code_change_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_pair_code_change_requests_updated_at on public.pair_code_change_requests;
create trigger trg_pair_code_change_requests_updated_at
before update on public.pair_code_change_requests
for each row execute function public.set_pair_code_change_requests_updated_at();

create or replace function public.request_pair_code_change(
  p_pair_id uuid,
  p_requester_id uuid,
  p_pair_code text,
  p_new_pair_code text
)
returns table (
  request_id uuid,
  pair_id uuid,
  requested_by uuid,
  requested_for uuid,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pair_hash text;
  v_new_pair_code text;
  v_partner_id uuid;
  v_request public.pair_code_change_requests%rowtype;
begin
  v_new_pair_code := upper(trim(coalesce(p_new_pair_code, '')));

  if length(v_new_pair_code) < 6 or length(v_new_pair_code) > 20 or v_new_pair_code !~ '^[A-Z0-9]+$' then
    raise exception 'INVALID_NEW_PAIR_CODE_FORMAT';
  end if;

  select pair_code
  into v_pair_hash
  from public.pairs
  where id = p_pair_id
  for update;

  if v_pair_hash is null then
    raise exception 'PAIR_NOT_FOUND';
  end if;

  if crypt(upper(trim(coalesce(p_pair_code, ''))), v_pair_hash) <> v_pair_hash then
    raise exception 'INVALID_PAIR_CODE';
  end if;

  if not exists (
    select 1
    from public.user_profiles
    where id = p_requester_id
      and pair_id = p_pair_id
  ) then
    raise exception 'REQUESTER_NOT_IN_PAIR';
  end if;

  select id
  into v_partner_id
  from public.user_profiles
  where pair_id = p_pair_id
    and id <> p_requester_id
  order by id
  limit 1;

  if v_partner_id is null then
    raise exception 'PARTNER_NOT_FOUND';
  end if;

  update public.pair_code_change_requests
  set
    status = 'expired',
    responded_at = timezone('utc', now())
  where pair_id = p_pair_id
    and status = 'pending'
    and expires_at < timezone('utc', now());

  if exists (
    select 1
    from public.pair_code_change_requests
    where pair_id = p_pair_id
      and status = 'pending'
  ) then
    raise exception 'PENDING_REQUEST_EXISTS';
  end if;

  if crypt(v_new_pair_code, v_pair_hash) = v_pair_hash then
    raise exception 'NEW_CODE_SAME_AS_CURRENT';
  end if;

  insert into public.pair_code_change_requests (
    pair_id,
    requested_by,
    requested_for,
    new_pair_code_hash,
    status,
    expires_at
  ) values (
    p_pair_id,
    p_requester_id,
    v_partner_id,
    crypt(v_new_pair_code, gen_salt('bf')),
    'pending',
    timezone('utc', now()) + interval '24 hour'
  )
  returning *
  into v_request;

  request_id := v_request.id;
  pair_id := v_request.pair_id;
  requested_by := v_request.requested_by;
  requested_for := v_request.requested_for;
  status := v_request.status;
  created_at := v_request.created_at;
  expires_at := v_request.expires_at;
  return next;
end;
$$;

create or replace function public.respond_pair_code_change(
  p_request_id uuid,
  p_approver_id uuid,
  p_pair_code text,
  p_action text,
  p_confirm_new_pair_code text default null
)
returns table (
  request_id uuid,
  pair_id uuid,
  status text,
  requested_by uuid,
  requested_for uuid,
  responded_by uuid,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.pair_code_change_requests%rowtype;
  v_pair_hash text;
  v_action text;
  v_confirm_new_code text;
begin
  v_action := lower(trim(coalesce(p_action, '')));
  if v_action not in ('approve', 'reject') then
    raise exception 'INVALID_ACTION';
  end if;

  select *
  into v_request
  from public.pair_code_change_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'REQUEST_ALREADY_RESOLVED';
  end if;

  if v_request.requested_for <> p_approver_id then
    raise exception 'REQUEST_ACCESS_DENIED';
  end if;

  if v_request.expires_at < timezone('utc', now()) then
    update public.pair_code_change_requests
    set
      status = 'expired',
      responded_at = timezone('utc', now()),
      responded_by = p_approver_id
    where id = v_request.id;
    raise exception 'REQUEST_EXPIRED';
  end if;

  select pair_code
  into v_pair_hash
  from public.pairs
  where id = v_request.pair_id
  for update;

  if v_pair_hash is null then
    raise exception 'PAIR_NOT_FOUND';
  end if;

  if crypt(upper(trim(coalesce(p_pair_code, ''))), v_pair_hash) <> v_pair_hash then
    raise exception 'INVALID_PAIR_CODE';
  end if;

  if v_action = 'approve' then
    v_confirm_new_code := upper(trim(coalesce(p_confirm_new_pair_code, '')));

    if v_confirm_new_code = '' then
      raise exception 'CONFIRM_NEW_CODE_REQUIRED';
    end if;

    if crypt(v_confirm_new_code, v_request.new_pair_code_hash) <> v_request.new_pair_code_hash then
      raise exception 'CONFIRM_NEW_CODE_MISMATCH';
    end if;

    update public.pairs
    set pair_code = v_request.new_pair_code_hash
    where id = v_request.pair_id;

    update public.pair_code_change_requests
    set
      status = 'approved',
      responded_at = timezone('utc', now()),
      responded_by = p_approver_id
    where id = v_request.id
    returning *
    into v_request;
  else
    update public.pair_code_change_requests
    set
      status = 'rejected',
      responded_at = timezone('utc', now()),
      responded_by = p_approver_id
    where id = v_request.id
    returning *
    into v_request;
  end if;

  request_id := v_request.id;
  pair_id := v_request.pair_id;
  status := v_request.status;
  requested_by := v_request.requested_by;
  requested_for := v_request.requested_for;
  responded_by := v_request.responded_by;
  responded_at := v_request.responded_at;
  return next;
end;
$$;

revoke all on function public.request_pair_code_change(uuid, uuid, text, text) from public;
grant execute on function public.request_pair_code_change(uuid, uuid, text, text) to service_role;

revoke all on function public.respond_pair_code_change(uuid, uuid, text, text, text) from public;
grant execute on function public.respond_pair_code_change(uuid, uuid, text, text, text) to service_role;

alter table public.pair_code_change_requests enable row level security;

drop policy if exists "service_role_full_pair_code_change_requests" on public.pair_code_change_requests;
create policy "service_role_full_pair_code_change_requests"
on public.pair_code_change_requests
as permissive
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

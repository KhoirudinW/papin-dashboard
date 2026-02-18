create extension if not exists pgcrypto;

create table if not exists public.redeem_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  benefit text not null,
  starts_at timestamptz null,
  expires_at timestamptz null,
  is_active boolean not null default true,
  max_total_claims integer null,
  total_claims integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint redeem_codes_uppercase check (code = upper(code)),
  constraint redeem_codes_max_total_claims_positive check (
    max_total_claims is null or max_total_claims >= 1
  ),
  constraint redeem_codes_total_claims_non_negative check (total_claims >= 0)
);

create index if not exists idx_redeem_codes_active_window
  on public.redeem_codes (is_active, starts_at, expires_at);

create table if not exists public.redeem_claims (
  id uuid primary key default gen_random_uuid(),
  redeem_code_id uuid not null references public.redeem_codes(id) on delete cascade,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  claimed_by uuid not null references public.user_profiles(id) on delete restrict,
  status text not null default 'active',
  claimed_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint redeem_claims_status_valid check (status in ('active', 'used', 'expired', 'revoked')),
  constraint redeem_claims_unique_pair_per_code unique (redeem_code_id, pair_id)
);

create index if not exists idx_redeem_claims_pair_claimed_at
  on public.redeem_claims (pair_id, claimed_at desc);

create or replace function public.set_redeem_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_redeem_codes_updated_at on public.redeem_codes;
create trigger trg_redeem_codes_updated_at
before update on public.redeem_codes
for each row execute function public.set_redeem_codes_updated_at();

create or replace function public.claim_redeem_code(
  p_pair_id uuid,
  p_profile_id uuid,
  p_pair_code text,
  p_code text
)
returns table (
  claim_id uuid,
  redeem_code text,
  title text,
  benefit text,
  expires_at timestamptz,
  claimed_at timestamptz,
  claim_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pair_hash text;
  v_now timestamptz := timezone('utc', now());
  v_code public.redeem_codes%rowtype;
  v_claim public.redeem_claims%rowtype;
  v_total_claims bigint;
begin
  select pair_code
  into v_pair_hash
  from public.pairs
  where id = p_pair_id;

  if v_pair_hash is null then
    raise exception 'PAIR_NOT_FOUND';
  end if;

  if crypt(upper(trim(p_pair_code)), v_pair_hash) <> v_pair_hash then
    raise exception 'INVALID_PAIR_CODE';
  end if;

  if not exists (
    select 1
    from public.user_profiles
    where id = p_profile_id
      and pair_id = p_pair_id
  ) then
    raise exception 'PROFILE_NOT_IN_PAIR';
  end if;

  select *
  into v_code
  from public.redeem_codes
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'REDEEM_NOT_FOUND';
  end if;

  if not v_code.is_active then
    raise exception 'REDEEM_INACTIVE';
  end if;

  if v_code.starts_at is not null and v_code.starts_at > v_now then
    raise exception 'REDEEM_NOT_STARTED';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < v_now then
    raise exception 'REDEEM_EXPIRED';
  end if;

  if exists (
    select 1
    from public.redeem_claims
    where redeem_code_id = v_code.id
      and pair_id = p_pair_id
  ) then
    raise exception 'REDEEM_ALREADY_CLAIMED';
  end if;

  if v_code.max_total_claims is not null then
    select count(*)
    into v_total_claims
    from public.redeem_claims
    where redeem_code_id = v_code.id;

    if v_total_claims >= v_code.max_total_claims then
      raise exception 'REDEEM_QUOTA_EXCEEDED';
    end if;
  end if;

  insert into public.redeem_claims (
    redeem_code_id,
    pair_id,
    claimed_by,
    status
  ) values (
    v_code.id,
    p_pair_id,
    p_profile_id,
    'active'
  )
  returning *
  into v_claim;

  update public.redeem_codes
  set total_claims = total_claims + 1
  where id = v_code.id;

  claim_id := v_claim.id;
  redeem_code := v_code.code;
  title := v_code.title;
  benefit := v_code.benefit;
  expires_at := v_code.expires_at;
  claimed_at := v_claim.claimed_at;
  claim_status := v_claim.status;
  return next;
end;
$$;

revoke all on function public.claim_redeem_code(uuid, uuid, text, text) from public;
grant execute on function public.claim_redeem_code(uuid, uuid, text, text) to service_role;

alter table public.redeem_codes enable row level security;
alter table public.redeem_claims enable row level security;

insert into public.redeem_codes (
  code,
  title,
  benefit,
  starts_at,
  expires_at,
  is_active,
  max_total_claims
)
values
  (
    'PAPLOVE7',
    'Starter Booster',
    'Tambah 7 hari akses Pro',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '365 day',
    true,
    500
  ),
  (
    'HEART25',
    'Monthly Discount',
    'Diskon 25% untuk 1 bulan pertama',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '365 day',
    true,
    1000
  ),
  (
    'COUPLEPRO14',
    'Couple Trial',
    'Trial Pro 14 hari',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '365 day',
    true,
    300
  )
on conflict (code) do update
set
  title = excluded.title,
  benefit = excluded.benefit,
  starts_at = excluded.starts_at,
  expires_at = excluded.expires_at,
  is_active = excluded.is_active,
  max_total_claims = excluded.max_total_claims,
  updated_at = timezone('utc', now());

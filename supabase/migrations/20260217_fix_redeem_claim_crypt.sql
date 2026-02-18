-- Fix redeem claim function on Supabase where pgcrypto functions live in `extensions` schema.
-- Error fixed: function crypt(text, text) does not exist

create extension if not exists pgcrypto with schema extensions;

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
set search_path = public, extensions
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

  if extensions.crypt(upper(trim(p_pair_code)), v_pair_hash) <> v_pair_hash then
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

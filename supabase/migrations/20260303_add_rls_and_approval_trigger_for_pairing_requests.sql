-- Harden pairing_requests access and ensure approved request can materialize into pairs.

create extension if not exists pgcrypto with schema extensions;

alter table if exists public.pairing_requests enable row level security;

drop policy if exists "service_role_full_pairing_requests" on public.pairing_requests;
create policy "service_role_full_pairing_requests"
on public.pairing_requests
as permissive
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.handle_pairing_request_approved()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_requester public.user_profiles%rowtype;
  v_responder public.user_profiles%rowtype;
  v_plain_pair_code text;
  v_pair_id uuid;
begin
  if new.status <> 'approved' then
    return new;
  end if;

  if old.status = 'approved' then
    return new;
  end if;

  select *
  into v_requester
  from public.user_profiles
  where id = new.requested_by
  for update;

  if not found then
    raise exception 'PAIRING_REQUEST_REQUESTER_NOT_FOUND';
  end if;

  select *
  into v_responder
  from public.user_profiles
  where id = new.requested_to
  for update;

  if not found then
    raise exception 'PAIRING_REQUEST_RESPONDER_NOT_FOUND';
  end if;

  -- If both already linked, pairing has been materialized elsewhere (for example API route).
  if v_requester.pair_id is not null and v_responder.pair_id is not null then
    return new;
  end if;

  -- Prevent half-linked/invalid state from creating duplicate pair rows.
  if v_requester.pair_id is not null or v_responder.pair_id is not null then
    raise exception 'PAIRING_ALREADY_LINKED_TO_OTHER_PAIR';
  end if;

  if v_requester.role not in ('A', 'B') or v_responder.role not in ('A', 'B') then
    raise exception 'PAIRING_ROLE_INVALID';
  end if;

  if v_requester.role = v_responder.role then
    raise exception 'PAIRING_ROLE_MUST_BE_DIFFERENT';
  end if;

  v_plain_pair_code := 'PAP' || cast((100000 + floor(random() * 900000)) as int)::text;

  insert into public.pairs (
    pair_code,
    streak
  )
  values (
    extensions.crypt(v_plain_pair_code, extensions.gen_salt('bf')),
    0
  )
  returning id
  into v_pair_id;

  update public.user_profiles
  set
    pair_id = v_pair_id,
    pair_code_plain = v_plain_pair_code
  where id = v_requester.id;

  update public.user_profiles
  set
    pair_id = v_pair_id,
    pair_code_plain = v_plain_pair_code
  where id = v_responder.id;

  return new;
end;
$$;

drop trigger if exists trg_pairing_request_approved on public.pairing_requests;
create trigger trg_pairing_request_approved
after update of status on public.pairing_requests
for each row
when (new.status = 'approved' and old.status is distinct from new.status)
execute function public.handle_pairing_request_approved();


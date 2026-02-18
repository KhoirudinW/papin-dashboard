-- Harden RLS for redeem and payment tables.
-- App client should not access these tables directly.
-- Access is intended via server routes that use service_role key.

alter table if exists public.redeem_codes enable row level security;
alter table if exists public.redeem_claims enable row level security;
alter table if exists public.payment_transactions enable row level security;

-- Remove old policies if they exist (idempotent migration)
drop policy if exists "service_role_full_redeem_codes" on public.redeem_codes;
drop policy if exists "service_role_full_redeem_claims" on public.redeem_claims;
drop policy if exists "service_role_full_payment_transactions" on public.payment_transactions;

-- Strict policies: only service_role can read/write.
-- This keeps browser clients (anon/authenticated) blocked by default.
create policy "service_role_full_redeem_codes"
on public.redeem_codes
as permissive
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service_role_full_redeem_claims"
on public.redeem_claims
as permissive
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service_role_full_payment_transactions"
on public.payment_transactions
as permissive
for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

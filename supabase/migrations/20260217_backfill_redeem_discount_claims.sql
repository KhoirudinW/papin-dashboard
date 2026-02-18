-- Backfill metadata for legacy HEART25 claims created before discount metadata flow.
-- Without this, old active claims may be ignored by checkout discount matcher.

update public.redeem_claims as rc
set metadata = coalesce(rc.metadata, '{}'::jsonb) || jsonb_build_object(
  'effect_type', 'discount_percent',
  'discount_percent', 25,
  'backfilled_at', timezone('utc', now())
)
from public.redeem_codes as r
where rc.redeem_code_id = r.id
  and upper(r.code) = 'HEART25'
  and rc.status = 'active'
  and (
    coalesce(lower(rc.metadata ->> 'effect_type'), '') <> 'discount_percent'
    or (rc.metadata ->> 'discount_percent') is null
  );

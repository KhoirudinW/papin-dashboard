-- Add structured effect metadata for built-in redeem codes
-- so redeem claim can apply real subscription effects.

update public.redeem_codes
set metadata = jsonb_build_object(
  'effect_type', 'activate_plan_days',
  'plan_name', 'Pro',
  'duration_days', 7
)
where code = 'PAPLOVE7';

update public.redeem_codes
set metadata = jsonb_build_object(
  'effect_type', 'activate_plan_days',
  'plan_name', 'Pro',
  'duration_days', 14
)
where code = 'COUPLEPRO14';

update public.redeem_codes
set metadata = jsonb_build_object(
  'effect_type', 'discount_percent',
  'discount_percent', 25,
  'duration_cycles', 1
)
where code = 'HEART25';

create extension if not exists pgcrypto;

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  amount numeric(12, 2) not null,
  currency text not null default 'IDR',
  transaction_status text not null default 'pending',
  status_code text null,
  fraud_status text null,
  payment_type text null,
  midtrans_transaction_id text null,
  gross_amount text null,
  snap_token text null,
  snap_redirect_url text null,
  transaction_time timestamptz null,
  expires_at timestamptz null,
  paid_at timestamptz null,
  raw_request jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_transactions_amount_positive check (amount > 0),
  constraint payment_transactions_status_valid check (
    transaction_status in (
      'pending',
      'capture',
      'settlement',
      'deny',
      'cancel',
      'expire',
      'failure',
      'refund',
      'partial_refund',
      'authorize',
      'chargeback'
    )
  )
);

create index if not exists idx_payment_transactions_pair_created
  on public.payment_transactions (pair_id, created_at desc);

create index if not exists idx_payment_transactions_status
  on public.payment_transactions (transaction_status);

create or replace function public.set_payment_transactions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_payment_transactions_updated_at on public.payment_transactions;
create trigger trg_payment_transactions_updated_at
before update on public.payment_transactions
for each row execute function public.set_payment_transactions_updated_at();

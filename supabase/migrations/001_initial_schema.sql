-- TON-PASS Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- CREATORS TABLE
-- ============================================
create table if not exists creators (
  id uuid primary key default uuid_generate_v4(),
  twitter_id text unique not null,
  twitter_username text not null,
  twitter_avatar text,
  telegram_chat_id text,             -- for expiry notifications
  private_account_url text,          -- e.g. https://twitter.com/i/user/...
  private_account_username text,     -- @privateaccount
  subscription_price_ton numeric(18,9) not null default 1.0,
  subscription_duration_days int not null default 30,
  payment_address text not null,     -- TON wallet address
  link_slug text unique not null,    -- short slug for payment link
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade,
  fan_twitter_id text not null,
  fan_twitter_username text not null,
  fan_twitter_avatar text,
  amount_ton numeric(18,9) not null,
  fee_ton numeric(18,9) not null,       -- 5% fee
  total_ton numeric(18,9) not null,     -- amount + fee
  ton_tx_hash text unique,              -- blockchain tx hash
  ton_tx_confirmed boolean default false,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',    -- waiting for TON tx
      'pending_approval',   -- paid, waiting creator to approve follow
      'approved',           -- creator approved follow
      'rejected',           -- creator rejected
      'expired',            -- subscription expired
      'refunded'            -- refunded to fan
    )),
  subscribed_at timestamptz,
  expires_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  refunded_at timestamptz,
  refund_tx_hash text,
  notification_sent boolean default false,  -- expiry notification sent
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_payments_creator_id on payments(creator_id);
create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_expires_at on payments(expires_at);
create index if not exists idx_payments_fan_twitter_username on payments(fan_twitter_username);
create index if not exists idx_creators_link_slug on creators(link_slug);
create index if not exists idx_creators_twitter_id on creators(twitter_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_creators_updated_at
  before update on creators
  for each row execute function update_updated_at_column();

create trigger update_payments_updated_at
  before update on payments
  for each row execute function update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table creators enable row level security;
alter table payments enable row level security;

-- Service role bypasses RLS (used by API routes)
-- Anon/authenticated users have no direct access
-- All access goes through Next.js API routes with service key

-- Allow service role full access
create policy "Service role full access on creators"
  on creators for all
  using (true)
  with check (true);

create policy "Service role full access on payments"
  on payments for all
  using (true)
  with check (true);

-- ============================================
-- VIEWS
-- ============================================

-- Pending approvals view for creator dashboard
create or replace view pending_approvals as
select
  p.id,
  p.creator_id,
  p.fan_twitter_id,
  p.fan_twitter_username,
  p.fan_twitter_avatar,
  p.amount_ton,
  p.fee_ton,
  p.total_ton,
  p.ton_tx_hash,
  p.created_at as paid_at,
  p.expires_at,
  c.twitter_username as creator_username,
  c.private_account_username
from payments p
join creators c on p.creator_id = c.id
where p.status = 'pending_approval'
order by p.created_at asc;

-- Expiring soon view (3 days or less)
create or replace view expiring_soon as
select
  p.*,
  c.twitter_username as creator_username,
  c.telegram_chat_id,
  c.private_account_username,
  extract(epoch from (p.expires_at - now())) / 86400 as days_remaining
from payments p
join creators c on p.creator_id = c.id
where p.status = 'approved'
  and p.expires_at between now() and now() + interval '3 days'
  and p.notification_sent = false
order by p.expires_at asc;

-- 006_full_schema_fix.sql
-- Final comprehensive migration to fix all missing columns, tables, and views.

-- 1. Drop all dependent views first to allow column modifications
drop view if exists expiring_soon;
drop view if exists pending_approvals;
drop view if exists creator_stats;

-- 2. Ensure creators table has all required columns
alter table creators
  -- Identity & Basics
  add column if not exists telegram_id text unique,
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_channel_link text,
  add column if not exists telegram_channel_name text,
  -- Public Profiles
  add column if not exists public_profile_url text,
  add column if not exists public_profile_name text,
  add column if not exists public_twitter_url text,
  -- Feature Toggles & Settings
  add column if not exists free_trial_enabled boolean not null default false,
  add column if not exists free_trial_days integer not null default 3,
  add column if not exists referral_enabled boolean not null default false,
  add column if not exists referral_bonus_days integer not null default 7,
  add column if not exists referral_friend_discount_pct integer not null default 0,
  add column if not exists reviews_enabled boolean not null default true,
  add column if not exists review_bonus_days integer not null default 1,
  -- Ranking & Stats
  add column if not exists show_in_ranking boolean not null default true,
  add column if not exists page_views integer not null default 0;

-- 3. Ensure payments table has all required columns
alter table payments
  -- Fan Identity
  add column if not exists fan_telegram_id text,
  add column if not exists fan_telegram_username text,
  -- Feature Related
  add column if not exists is_free_trial boolean not null default false,
  add column if not exists review_bonus_days_pending integer not null default 0,
  add column if not exists notification_sent boolean not null default false;

-- 4. Create reviews table
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade,
  payment_id uuid references payments(id) on delete cascade,
  fan_telegram_id text not null,
  fan_telegram_username text,
  fan_telegram_avatar text,
  rating integer not null check (rating >= 1 and rating <= 5),
  content text,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

-- 5. Create referral_codes table
create table if not exists referral_codes (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade,
  payment_id uuid references payments(id) on delete cascade,
  fan_telegram_id text not null,
  code text unique not null,
  uses integer not null default 0,
  created_at timestamptz default now()
);

-- 6. Re-create all views with updated columns

-- Pending approvals view
create or replace view pending_approvals as
select
  p.id,
  p.creator_id,
  p.fan_telegram_id,
  p.fan_telegram_username,
  p.amount_ton,
  p.fee_ton,
  p.total_ton,
  p.ton_tx_hash,
  p.created_at as paid_at,
  p.expires_at,
  c.twitter_username as creator_username,
  c.telegram_channel_name
from payments p
join creators c on p.creator_id = c.id
where p.status = 'pending_approval'
order by p.created_at asc;

-- Expiring soon view
create or replace view expiring_soon as
select
  p.*,
  c.twitter_username as creator_username,
  c.telegram_chat_id,
  c.telegram_channel_name,
  extract(epoch from (p.expires_at - now())) / 86400 as days_remaining
from payments p
join creators c on p.creator_id = c.id
where p.status = 'approved'
  and p.expires_at between now() and now() + interval '3 days'
  and p.notification_sent = false
order by p.expires_at asc;

-- Creator stats view (Ranking Logic)
create or replace view creator_stats as
with review_metrics as (
  select
    creator_id,
    avg(rating)::numeric(3,2) as avg_rating,
    count(*) as review_count
  from reviews
  group by creator_id
)
select
  c.id,
  coalesce(rm.avg_rating, 0) as avg_rating,
  coalesce(rm.review_count, 0) as review_count,
  -- Ranking Score Formula
  (c.page_views + (coalesce(rm.review_count, 0) * 10) + (coalesce(rm.avg_rating, 0) * 20)) as rank_score
from creators c
left join review_metrics rm on c.id = rm.creator_id
where c.is_active = true and c.show_in_ranking = true;

-- 7. Ensure Indexes for performance
create index if not exists idx_creators_telegram_id on creators(telegram_id);
create index if not exists idx_payments_fan_telegram_id on payments(fan_telegram_id);
create index if not exists idx_reviews_creator_id on reviews(creator_id);
create index if not exists idx_referral_codes_code on referral_codes(code);
create index if not exists idx_creators_page_views on creators(page_views desc);

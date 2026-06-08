-- TON-PASS v2: Switch from Twitter private account to Telegram private channel

-- Update creators table
alter table creators
  add column if not exists telegram_channel_link text,      -- private channel invite link
  add column if not exists telegram_channel_name text,      -- channel display name
  add column if not exists public_profile_url text,         -- creator's public profile (any platform)
  add column if not exists public_profile_name text;        -- display name for public profile

-- Update payments table  
alter table payments
  add column if not exists fan_telegram_username text,      -- fan's telegram username
  add column if not exists fan_telegram_id text,            -- fan's telegram user id
  add column if not exists invite_link_sent boolean not null default false,
  add column if not exists invite_link text;                -- one-time invite link sent to fan

-- Drop twitter-specific columns (optional, keep for migration safety)
-- alter table creators drop column if exists private_account_url;
-- alter table creators drop column if exists private_account_username;

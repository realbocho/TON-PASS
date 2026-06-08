-- Add ranking-related columns to creators table
alter table creators
  add column if not exists page_views integer not null default 0,
  add column if not exists public_twitter_url text,  -- custom public twitter URL for ranking
  add column if not exists show_in_ranking boolean not null default true;

-- Index for ranking page query
create index if not exists idx_creators_page_views on creators(page_views desc);

-- RPC function to increment page views atomically
create or replace function increment_page_views(slug_input text)
returns void as $$
begin
  update creators
  set page_views = page_views + 1
  where link_slug = slug_input;
end;
$$ language plpgsql security definer;

-- Dorm & Desk Tracker: initial schema.
-- Single-owner app: sign-ups are disabled in Supabase Auth, so "authenticated" = the owner.
-- The anon role gets no policies, so the public anon key can read nothing.
-- Scheduled jobs use the service role, which bypasses RLS.

create extension if not exists pgcrypto;

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table public.pickup_stores (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  external_store_id text not null,
  name text not null,
  unique (merchant_id, external_store_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('monitor', 'speaker')),
  msrp_cents integer not null check (msrp_cents >= 0),
  target_high_cents integer not null check (target_high_cents >= 0),
  target_low_cents integer not null check (target_low_cents >= 0),
  colour_prefs text[] not null default '{}',
  specs jsonb not null,
  active boolean not null default true,
  alerts_enabled boolean not null default true,
  reference_low_cents integer check (reference_low_cents >= 0),
  check (target_low_cents <= target_high_cents)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  url text not null check (url like 'https://%'),
  is_bundle boolean not null default false,
  bundle_contents text,
  auto_check boolean not null default true,
  unique (product_id, url)
);

create table public.price_logs (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  checked_at timestamptz not null default now(),
  source text not null check (source in ('scraped', 'manual')),
  status text not null check (status in ('ok', 'blocked', 'failed', 'not_found')),
  price_cents integer check (price_cents >= 0),
  was_price_cents integer check (was_price_cents >= 0),
  shipping_cents integer check (shipping_cents >= 0),
  in_stock_online boolean,
  pickup jsonb not null default '[]',
  condition text not null default 'new' check (condition in ('new', 'open_box', 'refurbished')),
  seller text not null default 'retailer' check (seller in ('retailer', 'marketplace')),
  colour text,
  error text
);
create index price_logs_listing_checked_idx on public.price_logs (listing_id, checked_at desc);

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('rfd', 'reddit')),
  source_id text not null,
  title text not null,
  url text not null,
  published_at timestamptz not null,
  excerpt text not null default '',
  score integer not null default 0,
  matched_product_ids uuid[] not null default '{}',
  tags text[] not null default '{}',
  unique (source, source_id)
);
create index news_items_published_idx on public.news_items (published_at desc);

create table public.alert_state (
  product_id uuid primary key references public.products(id) on delete cascade,
  last_alerted_cents integer,
  sent_kinds text[] not null default '{}',
  pickup_nearby boolean not null default false,
  above_target_since timestamptz,
  updated_at timestamptz not null default now()
);

create table public.alert_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null,
  price_cents integer,
  sent_at timestamptz not null default now()
);

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  ok_count integer not null default 0,
  failed_count integer not null default 0
);
create index job_runs_job_started_idx on public.job_runs (job, started_at desc);

-- Row-level security: owner (authenticated) only.
alter table public.merchants enable row level security;
alter table public.pickup_stores enable row level security;
alter table public.products enable row level security;
alter table public.listings enable row level security;
alter table public.price_logs enable row level security;
alter table public.news_items enable row level security;
alter table public.alert_state enable row level security;
alter table public.alert_log enable row level security;
alter table public.job_runs enable row level security;

create policy owner_all on public.merchants for all to authenticated using (true) with check (true);
create policy owner_all on public.pickup_stores for all to authenticated using (true) with check (true);
create policy owner_all on public.products for all to authenticated using (true) with check (true);
create policy owner_all on public.listings for all to authenticated using (true) with check (true);
create policy owner_all on public.price_logs for all to authenticated using (true) with check (true);
create policy owner_all on public.news_items for all to authenticated using (true) with check (true);
create policy owner_all on public.alert_state for all to authenticated using (true) with check (true);
create policy owner_all on public.alert_log for all to authenticated using (true) with check (true);
create policy owner_all on public.job_runs for all to authenticated using (true) with check (true);

-- Belt and braces: no table privileges for anon at all.
revoke all on all tables in schema public from anon;

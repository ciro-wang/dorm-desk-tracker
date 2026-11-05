-- Things the owner already bought (to catch price drops worth claiming), a chair category,
-- and listings priced in US dollars (converted to CAD when checked).

alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check check (category in ('monitor', 'speaker', 'chair'));

alter table public.listings add column if not exists currency text not null default 'CAD' check (currency in ('CAD', 'USD'));

-- price_cents stays in CAD; these keep the store's own price when it was converted.
alter table public.price_logs add column if not exists native_price_cents integer;
alter table public.price_logs add column if not exists native_currency text;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id),
  paid_cents integer not null check (paid_cents > 0),
  paid_total_cents integer check (paid_total_cents > 0),
  purchased_on date not null,
  claim_by date not null,
  claim_note text not null default '',
  last_alerted_cents integer,
  created_at timestamptz not null default now(),
  unique (product_id, merchant_id, purchased_on)
);
alter table public.purchases enable row level security;
create policy owner_only on public.purchases for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- Same as 0004, CAD listings only (US-store prices are shown for reference, not charted as the best price).
create or replace view public.listing_daily_best with (security_invoker = true) as
select
  l.id as listing_id,
  l.product_id,
  l.merchant_id,
  (pl.checked_at at time zone 'America/Toronto')::date as day,
  min(pl.price_cents + coalesce(pl.shipping_cents, 0)) as cents
from public.price_logs pl
join public.listings l on l.id = pl.listing_id
where pl.status = 'ok'
  and pl.condition = 'new'
  and (pl.seller = 'retailer' or l.trusted_seller)
  and pl.price_cents is not null
  and not l.is_bundle
  and l.currency = 'CAD'
group by l.id, l.product_id, l.merchant_id, day;

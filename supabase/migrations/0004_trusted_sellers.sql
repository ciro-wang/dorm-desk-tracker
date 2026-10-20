-- Per-listing "trusted seller": a marketplace seller the owner trusts (e.g. a brand's own store)
-- counts toward best price, history and alerts like the retailer itself.
alter table public.listings add column if not exists trusted_seller boolean not null default false;

-- Same as 0002, with trusted sellers counted (column list unchanged, so dependent views keep working).
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
group by l.id, l.product_id, l.merchant_id, day;

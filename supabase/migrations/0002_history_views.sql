-- Rollups so the app never pulls raw price logs (PostgREST caps responses at 1000 rows).
-- security_invoker = true: views run as the caller, so the owner-only RLS on base tables applies.

-- Latest check per listing.
create view public.latest_price_logs with (security_invoker = true) as
select distinct on (pl.listing_id) pl.*
from public.price_logs pl
order by pl.listing_id, pl.checked_at desc;

-- Daily lowest countable price per listing, by Toronto calendar day.
-- Countable = checked ok, new, sold by the retailer, not a bundle (same rule as lib/pricing/best-price.ts).
create view public.listing_daily_best with (security_invoker = true) as
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
  and pl.seller = 'retailer'
  and pl.price_cents is not null
  and not l.is_bundle
group by l.id, l.product_id, l.merchant_id, day;

-- Daily lowest countable price per product.
create view public.product_daily_best with (security_invoker = true) as
select product_id, day, min(cents) as cents
from public.listing_daily_best
group by product_id, day;

revoke all on public.latest_price_logs, public.listing_daily_best, public.product_daily_best from anon;

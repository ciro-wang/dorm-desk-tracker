-- Fixes from the pre-launch review.

-- Pickup alerts re-arm only after downtown pickup has been gone for 12 hours.
alter table public.alert_state add column if not exists pickup_gone_since timestamptz;

-- Newest successful check per listing, so a fresh manual price survives a later blocked scrape.
create view public.latest_ok_price_logs with (security_invoker = true) as
select distinct on (pl.listing_id) pl.*
from public.price_logs pl
where pl.status = 'ok'
order by pl.listing_id, pl.checked_at desc;

revoke all on public.latest_ok_price_logs from anon;

-- Owner-only access. Being signed in is not enough: the user must be listed in app_owner.
-- Add yourself once in the Supabase SQL editor (never commit your id or email):
--   insert into public.app_owner (user_id) select id from auth.users where email = '<your email>';
create table public.app_owner (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.app_owner enable row level security;
create policy owner_self on public.app_owner for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.app_owner from anon;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.app_owner where user_id = (select auth.uid())) $$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

drop policy owner_all on public.merchants;
create policy owner_only on public.merchants for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy owner_all on public.pickup_stores;
create policy owner_only on public.pickup_stores for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy owner_all on public.products;
create policy owner_only on public.products for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy owner_all on public.listings;
create policy owner_only on public.listings for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy owner_all on public.price_logs;
create policy owner_only on public.price_logs for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy owner_all on public.news_items;
create policy owner_only on public.news_items for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy owner_all on public.alert_state;
create policy owner_only on public.alert_state for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy owner_all on public.alert_log;
create policy owner_only on public.alert_log for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy owner_all on public.job_runs;
create policy owner_only on public.job_runs for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

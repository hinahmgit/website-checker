-- Website Checker — database schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.


-- Every website analysis that was run.
create table if not exists public.checks (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,            -- final URL after redirects
  input_url    text not null,            -- what the visitor typed
  domain       text not null,            -- normalised host, no "www."
  status       text not null default 'ok' check (status in ('ok', 'error')),
  error        text,
  platform     text,                     -- e.g. Shopify, WordPress, Custom
  theme        text,
  likely_plan  text,
  technologies jsonb not null default '[]'::jsonb,
  issues       jsonb not null default '[]'::jsonb,  -- UX/SEO opportunities
  scores       jsonb,                    -- PageSpeed: performance, seo, accessibility, best_practices
  details      jsonb,                    -- confidence, evidence, plan reasoning, page title…
  ip_hash      text,                     -- salted hash, used only for rate limiting
  created_at   timestamptz not null default now()
);

alter table public.checks add column if not exists details jsonb;

create index if not exists checks_created_at_idx on public.checks (created_at desc);
create index if not exists checks_domain_idx     on public.checks (domain, created_at);
create index if not exists checks_ip_idx         on public.checks (ip_hash, created_at desc);
create index if not exists checks_platform_idx   on public.checks (platform);

-- People who requested the full audit.
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  check_id   uuid references public.checks (id) on delete set null,
  name       text not null,
  email      text not null,
  website    text,
  domain     text,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- Lock the tables down: only the server (service_role key) may read or write.
alter table public.checks enable row level security;
alter table public.leads  enable row level security;
revoke all on public.checks, public.leads from anon, authenticated;

-- Checks with a flag for whether this was the first time the domain was ever checked.
create or replace view public.checks_with_flags
with (security_invoker = true) as
select
  c.*,
  c.created_at = min(c.created_at) over (partition by c.domain) as is_new_domain,
  count(*) over (partition by c.domain)                           as domain_check_count
from public.checks c;

revoke all on public.checks_with_flags from anon, authenticated;

-- All dashboard numbers in one round trip.
-- tz: IANA time zone for month/year boundaries, e.g. 'Asia/Karachi'.
create or replace function public.admin_stats(tz text default 'UTC')
returns jsonb
language sql
stable
set search_path = public
as $$
with
b as (
  select
    date_trunc('month', now() at time zone tz) at time zone tz                        as month_start,
    (date_trunc('month', now() at time zone tz) - interval '1 month') at time zone tz as prev_month_start,
    date_trunc('year',  now() at time zone tz) at time zone tz                        as year_start,
    (date_trunc('year',  now() at time zone tz) - interval '1 year') at time zone tz  as prev_year_start
),
first_seen as (
  select domain, min(created_at) as first_at from checks group by domain
),
latest as (
  select distinct on (domain) domain, platform, created_at
  from checks
  where status = 'ok'
  order by domain, created_at desc
)
select jsonb_build_object(
  'checks', jsonb_build_object(
    'total',      (select count(*) from checks),
    'this_month', (select count(*) from checks, b where created_at >= b.month_start),
    'last_month', (select count(*) from checks, b where created_at >= b.prev_month_start and created_at < b.month_start),
    'this_year',  (select count(*) from checks, b where created_at >= b.year_start),
    'last_year',  (select count(*) from checks, b where created_at >= b.prev_year_start and created_at < b.year_start),
    'errors',     (select count(*) from checks where status = 'error')
  ),
  'domains', jsonb_build_object(
    'unique_total', (select count(*) from first_seen),
    'new_this_month', (select count(*) from first_seen, b where first_at >= b.month_start),
    'new_last_month', (select count(*) from first_seen, b where first_at >= b.prev_month_start and first_at < b.month_start),
    'new_this_year',  (select count(*) from first_seen, b where first_at >= b.year_start),
    'new_last_year',  (select count(*) from first_seen, b where first_at >= b.prev_year_start and first_at < b.year_start),
    'repeat_checks',  (select count(*) from checks) - (select count(*) from first_seen)
  ),
  'leads', jsonb_build_object(
    'total',      (select count(*) from leads),
    'this_month', (select count(*) from leads, b where created_at >= b.month_start),
    'last_month', (select count(*) from leads, b where created_at >= b.prev_month_start and created_at < b.month_start),
    'this_year',  (select count(*) from leads, b where created_at >= b.year_start),
    'last_year',  (select count(*) from leads, b where created_at >= b.prev_year_start and created_at < b.year_start)
  ),
  'platforms', (
    select coalesce(jsonb_agg(jsonb_build_object('platform', p, 'count', n) order by n desc), '[]'::jsonb)
    from (select coalesce(platform, 'Unknown') p, count(*) n from checks where status = 'ok' group by 1) x
  ),
  'platforms_this_month', (
    select coalesce(jsonb_agg(jsonb_build_object('platform', p, 'count', n) order by n desc), '[]'::jsonb)
    from (
      select coalesce(platform, 'Unknown') p, count(*) n
      from checks, b where status = 'ok' and created_at >= b.month_start group by 1
    ) x
  ),
  'daily', (
    select jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count', coalesce(n, 0)) order by d)
    from generate_series(
      date_trunc('day', now() at time zone tz) - interval '29 days',
      date_trunc('day', now() at time zone tz),
      interval '1 day'
    ) d
    left join (
      select date_trunc('day', created_at at time zone tz) as bucket, count(*) as n from checks group by 1
    ) c on c.bucket = d
  ),
  'monthly', (
    select jsonb_agg(jsonb_build_object('date', to_char(m, 'YYYY-MM'), 'count', coalesce(n, 0)) order by m)
    from generate_series(
      date_trunc('month', now() at time zone tz) - interval '23 months',
      date_trunc('month', now() at time zone tz),
      interval '1 month'
    ) m
    left join (
      select date_trunc('month', created_at at time zone tz) as bucket, count(*) as n from checks group by 1
    ) c on c.bucket = m
  ),
  'top_domains', (
    select coalesce(jsonb_agg(row_to_json(t) order by t.checks desc, t.last_checked desc), '[]'::jsonb)
    from (
      select f.domain, count(*) as checks, max(c.created_at) as last_checked, l.platform
      from checks c
      join first_seen f on f.domain = c.domain
      left join latest l on l.domain = c.domain
      group by f.domain, l.platform
      order by count(*) desc, max(c.created_at) desc
      limit 10
    ) t
  )
);
$$;

revoke all on function public.admin_stats(text) from public, anon, authenticated;
grant execute on function public.admin_stats(text) to service_role;

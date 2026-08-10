create extension if not exists pgcrypto;

create table if not exists public.tracking_visitors (
  id uuid primary key default gen_random_uuid(), visitor_key text not null unique,
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.tracking_sessions (
  id uuid primary key default gen_random_uuid(), session_key text not null unique,
  visitor_id uuid references public.tracking_visitors(id) on delete set null,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  fbclid text, gclid text, ttclid text, referrer text, landing_page text,
  started_at timestamptz not null default now(), last_activity_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists tracking_sessions_visitor_idx on public.tracking_sessions(visitor_id,started_at desc);
create index if not exists tracking_sessions_campaign_idx on public.tracking_sessions(utm_source,utm_campaign,started_at desc);

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(), event_key text not null unique,
  session_id uuid references public.tracking_sessions(id) on delete cascade,
  visitor_id uuid references public.tracking_visitors(id) on delete set null,
  event_name text not null check (event_name in ('page_view','checkout_started','purchase')),
  page_url text, occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists tracking_events_session_idx on public.tracking_events(session_id,occurred_at desc);

create table if not exists public.nuvemshop_webhook_events (
  id uuid primary key default gen_random_uuid(), event_key text not null unique, event_type text not null,
  store_id text, resource_id text, payload jsonb not null, status text not null default 'received',
  error text, received_at timestamptz not null default now(), processed_at timestamptz
);
create table if not exists public.tracked_orders (
  id uuid primary key default gen_random_uuid(), store_id text not null, order_id text not null,
  order_number text, payment_status text, currency text not null default 'BRL', total numeric(14,2) not null default 0,
  customer_email_hash text, completed_at timestamptz, raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(store_id,order_id)
);
create table if not exists public.order_attributions (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.tracked_orders(id) on delete cascade,
  session_id uuid references public.tracking_sessions(id) on delete set null,
  visitor_id uuid references public.tracking_visitors(id) on delete set null,
  model text not null default 'last_non_direct' check(model in ('last_touch','last_non_direct')),
  confidence text not null default 'unattributed' check(confidence in ('exact_session','visitor_window','unattributed')),
  attributed_at timestamptz not null default now(), details jsonb not null default '{}'::jsonb
);

alter table public.tracking_visitors enable row level security;
alter table public.tracking_sessions enable row level security;
alter table public.tracking_events enable row level security;
alter table public.nuvemshop_webhook_events enable row level security;
alter table public.tracked_orders enable row level security;
alter table public.order_attributions enable row level security;
-- No public policies: tracking writes and order reads go through trusted server endpoints.

create or replace view public.marketing_attribution_summary with (security_invoker=true) as
select date_trunc('day',o.completed_at) as day,s.utm_source,s.utm_medium,s.utm_campaign,s.utm_content,
 count(*) as orders,sum(o.total) as revenue
from public.tracked_orders o join public.order_attributions a on a.order_id=o.id
left join public.tracking_sessions s on s.id=a.session_id
group by 1,2,3,4,5;

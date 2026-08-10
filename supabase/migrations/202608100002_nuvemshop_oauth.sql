create table if not exists public.nuvemshop_integrations (
  store_id text primary key,
  access_token text not null,
  token_type text not null default 'bearer',
  scope text,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.nuvemshop_integrations enable row level security;
-- Intentionally no public policies. Only server functions using the service role may access tokens.

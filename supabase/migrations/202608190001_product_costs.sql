create table if not exists public.product_costs (
  store_id text not null,
  product_id text not null,
  cost numeric(14,2) not null default 0 check (cost >= 0),
  updated_at timestamptz not null default now(),
  primary key (store_id, product_id)
);

alter table public.product_costs enable row level security;
-- Sem políticas públicas: leitura e gravação passam exclusivamente pela API autenticada.

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  vertical text not null,
  status text not null default 'draft' check (status in ('active', 'paused', 'draft')),
  monthly_value numeric not null default 0,
  active_agents integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.automations enable row level security;

create policy "select own automations"
on public.automations
for select
using (auth.uid() = user_id);

create policy "insert own automations"
on public.automations
for insert
with check (auth.uid() = user_id);
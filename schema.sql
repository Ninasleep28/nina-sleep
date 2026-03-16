-- Run this in the Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor

create table if not exists conversations (
  id           uuid primary key default gen_random_uuid(),
  phone_number text unique not null,
  messages     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at on every row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

-- Index for fast phone_number lookups
create index if not exists conversations_phone_number_idx
  on conversations (phone_number);

-- Run this once in your Supabase project's SQL Editor (Supabase dashboard ->
-- SQL Editor -> New query -> paste this -> Run).
-- It creates the two tables the app needs.

create table if not exists businesses (
  id text primary key,
  name text not null,
  contact text default '',
  phone text default '',
  email text default '',
  address text default '',
  notes text default '',
  created_by text default '',
  updated_by text default '',
  created_at timestamptz default now()
);

-- If your businesses table already existed before these columns were added,
-- these lines add them safely without touching your existing rows.
alter table businesses add column if not exists address text default '';
alter table businesses add column if not exists created_by text default '';
alter table businesses add column if not exists updated_by text default '';

create table if not exists calls (
  id text primary key,
  business_id text references businesses(id) on delete set null,
  caller text not null,
  date date not null,
  outcome text default 'Follow-up',
  amount numeric default 0,
  notes text default '',
  created_by text default ''
);

alter table calls add column if not exists created_by text default '';

create table if not exists settings (
  key text primary key,
  value text default ''
);

create table if not exists users (
  id text primary key,
  username text unique not null,
  password_hash text not null,
  role text not null default 'member', -- 'member' or 'admin'
  created_at timestamptz default now()
);

-- Row Level Security: Supabase turns this on by default for new projects.
-- Since this app's own backend (not the browser) holds the credentials and
-- is the only thing talking to Supabase, we allow the anon key full access
-- to these two tables. Do not expose your Supabase keys to the browser
-- directly if you use this policy.

alter table businesses enable row level security;
alter table calls enable row level security;
alter table settings enable row level security;
alter table users enable row level security;

create policy "Allow all for anon" on businesses
  for all using (true) with check (true);

create policy "Allow all for anon" on calls
  for all using (true) with check (true);

create policy "Allow all for anon" on settings
  for all using (true) with check (true);

create policy "Allow all for anon" on users
  for all using (true) with check (true);

-- One-time setup: set your team's signup invite code. Change 'change-me'
-- to whatever code you want to give out to your team, then run this once.
insert into settings (key, value) values ('inviteCode', 'change-me')
  on conflict (key) do nothing;

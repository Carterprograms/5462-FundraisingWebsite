-- Run this once in your Supabase project's SQL Editor (Supabase dashboard ->
-- SQL Editor -> New query -> paste this -> Run).
-- It creates the two tables the app needs.

create table if not exists businesses (
  id text primary key,
  name text not null,
  contact text default '',
  phone text default '',
  email text default '',
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists calls (
  id text primary key,
  business_id text references businesses(id) on delete set null,
  caller text not null,
  date date not null,
  outcome text default 'Follow-up',
  amount numeric default 0,
  notes text default ''
);

-- Row Level Security: Supabase turns this on by default for new projects.
-- Since this app's own backend (not the browser) holds the credentials and
-- is the only thing talking to Supabase, we allow the anon key full access
-- to these two tables. Do not expose your Supabase keys to the browser
-- directly if you use this policy.

alter table businesses enable row level security;
alter table calls enable row level security;

create policy "Allow all for anon" on businesses
  for all using (true) with check (true);

create policy "Allow all for anon" on calls
  for all using (true) with check (true);

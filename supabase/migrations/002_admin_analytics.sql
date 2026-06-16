-- Add analytics and subscription tracking columns to users_profiles

alter table public.users_profiles
add column if not exists last_active_at timestamptz;

alter table public.users_profiles
add column if not exists plan_status text default 'trial';

alter table public.users_profiles
add column if not exists billing_status text default 'free';

alter table public.users_profiles
add column if not exists subscription_active boolean default false;

alter table public.users_profiles
add column if not exists early_access_started_at timestamptz;

-- Create analytics_events table for tracking user actions

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  event_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security

alter table public.analytics_events enable row level security;

-- Allow logged-in users to insert their own analytics events

create policy if not exists "Users can insert their own analytics events"
on public.analytics_events
for insert
to authenticated
with check (auth.uid() = user_id);

-- Allow admins to read all analytics events

create policy if not exists "Admins can read all analytics events"
on public.analytics_events
for select
to authenticated
using (
  exists (
    select 1
    from public.users_profiles
    where users_profiles.id = auth.uid()
    and users_profiles.role = 'admin'
  )
);

-- Allow users to read their own analytics events

create policy if not exists "Users can read their own analytics events"
on public.analytics_events
for select
to authenticated
using (auth.uid() = user_id);

-- Update your own account as admin
-- Change the email below if your login email is different

update public.users_profiles
set
  role = 'admin',
  plan = 'agency',
  plan_status = 'early_access',
  billing_status = 'free_beta',
  subscription_active = true,
  early_access_started_at = coalesce(early_access_started_at, now()),
  updated_at = now()
where email = 'mohitsinghm2025@gmail.com';
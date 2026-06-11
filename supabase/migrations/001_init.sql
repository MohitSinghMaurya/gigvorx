-- ============================================================================
-- GigVorx · Supabase schema + RLS · v1
-- Paste this whole file into Supabase SQL editor (one go) and run.
-- Idempotent: safe to re-run.
-- ============================================================================

-- enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. USER PROFILES  (role + plan + trial)
-- ============================================================================
create table if not exists public.users_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  name          text,
  role          text not null default 'user' check (role in ('user','admin')),
  plan          text not null default 'trial' check (plan in ('trial','starter','pro','premium','agency')),
  trial_ends_at timestamptz default (now() + interval '7 days'),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================================
-- 2. CLIENTS (CRM contacts) + LEAD PIPELINE FIELDS
-- ============================================================================
create table if not exists public.clients (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  email             text,
  phone             text,
  company           text,
  service           text,
  budget            numeric default 0,
  deadline          date,
  notes             text,
  -- lead pipeline
  status            text not null default 'new_lead' check (status in
                    ('new_lead','contacted','interested','call_booked','brief_created','proposal_sent','invoice_sent','won','lost')),
  lead_source       text check (lead_source in
                    ('instagram','linkedin','facebook','twitter','referral','website','whatsapp','cold_outreach','other')),
  follow_up_date    date,
  last_contacted_at timestamptz,
  lead_notes        text,
  estimated_value   numeric default 0,
  is_lead           boolean default true,    -- true = still in pipeline; flips false on convert
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists clients_user_idx on public.clients(user_id);
create index if not exists clients_status_idx on public.clients(user_id, status);

-- ============================================================================
-- 3. BRIEFS + QUESTIONS
-- ============================================================================
create table if not exists public.briefs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  client_id     uuid references public.clients(id) on delete set null,
  title         text not null default 'Untitled brief',
  client_name   text,
  niche         text,
  status        text not null default 'draft' check (status in ('draft','sent','approved')),
  sections      jsonb default '{}'::jsonb,
  confirmation  boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists briefs_user_idx on public.briefs(user_id);

create table if not exists public.brief_questions (
  id          uuid primary key default gen_random_uuid(),
  brief_id    uuid not null references public.briefs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  position    int default 0,
  question    text,
  answer      text,
  is_custom   boolean default false,
  created_at  timestamptz default now()
);
create index if not exists brief_questions_brief_idx on public.brief_questions(brief_id);

-- ============================================================================
-- 4. INVOICES + LINE ITEMS
-- ============================================================================
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  template        text default 'modern',
  invoice_number  text not null,
  status          text not null default 'draft' check (status in ('draft','pending','paid','overdue')),
  client_name     text,
  client_email    text,
  client_address  text,
  issue_date      date default current_date,
  due_date        date,
  tax_rate        numeric default 0,
  discount        numeric default 0,
  subtotal        numeric default 0,
  tax_amt         numeric default 0,
  discount_amt    numeric default 0,
  total           numeric default 0,
  upi_id          text,
  logo            text,
  qr_image        text,
  notes           text,
  terms           text,
  paid_at         timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists invoices_user_idx on public.invoices(user_id);
create index if not exists invoices_status_idx on public.invoices(user_id, status);

create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  position    int default 0,
  description text,
  quantity    numeric default 1,
  rate        numeric default 0,
  created_at  timestamptz default now()
);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);

-- ============================================================================
-- 5. USER SETTINGS (business info, branding)
-- ============================================================================
create table if not exists public.user_settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  business_name  text,
  business_email text,
  phone          text,
  address        text,
  default_upi    text,
  logo_url       text,
  updated_at     timestamptz default now()
);

-- ============================================================================
-- 6. SUBSCRIPTIONS (billing audit trail · for future Razorpay/Stripe)
-- ============================================================================
create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan          text not null,
  status        text not null default 'active' check (status in ('active','cancelled','past_due','trialing')),
  provider      text default 'manual',       -- razorpay | stripe | manual
  provider_ref  text,                         -- external subscription id
  started_at    timestamptz default now(),
  ends_at       timestamptz,
  created_at    timestamptz default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

-- ============================================================================
-- 7. ACTIVITY LOG (lightweight audit feed for the dashboard)
-- ============================================================================
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  entity_type  text not null,    -- client | brief | invoice | lead | subscription
  entity_id    uuid,
  action       text not null,    -- created | updated | deleted | status_changed | marked_paid | converted
  meta         jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);
create index if not exists activity_user_idx on public.activity_logs(user_id, created_at desc);

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users_profiles (id, email, name, role, plan, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user',
    'trial',
    now() + interval '7 days'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- HELPER: is_admin()
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.users_profiles where id = auth.uid() and role = 'admin');
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.users_profiles enable row level security;
alter table public.clients         enable row level security;
alter table public.briefs          enable row level security;
alter table public.brief_questions enable row level security;
alter table public.invoices        enable row level security;
alter table public.invoice_items   enable row level security;
alter table public.user_settings   enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.activity_logs   enable row level security;

-- Drop existing policies (safe re-run)
do $$ declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- users_profiles: user can read+update own; admin can read all
create policy "profiles_self_read"   on public.users_profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles_self_update" on public.users_profiles for update using (auth.uid() = id);
create policy "profiles_self_insert" on public.users_profiles for insert with check (auth.uid() = id);

-- Generic helper macro: per-user CRUD + admin read
-- (Supabase doesn't support real macros, so we expand each table.)

-- clients
create policy "clients_user_all" on public.clients for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_admin_read" on public.clients for select using (public.is_admin());

-- briefs
create policy "briefs_user_all" on public.briefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "briefs_admin_read" on public.briefs for select using (public.is_admin());

-- brief_questions
create policy "brief_q_user_all" on public.brief_questions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "brief_q_admin_read" on public.brief_questions for select using (public.is_admin());

-- invoices
create policy "invoices_user_all" on public.invoices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices_admin_read" on public.invoices for select using (public.is_admin());

-- invoice_items
create policy "invoice_items_user_all" on public.invoice_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoice_items_admin_read" on public.invoice_items for select using (public.is_admin());

-- user_settings
create policy "settings_user_all" on public.user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions
create policy "subscriptions_user_read" on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());
create policy "subscriptions_user_insert" on public.subscriptions for insert with check (auth.uid() = user_id);

-- activity_logs
create policy "activity_user_read"   on public.activity_logs for select using (auth.uid() = user_id or public.is_admin());
create policy "activity_user_insert" on public.activity_logs for insert with check (auth.uid() = user_id);

-- ============================================================================
-- ADMIN ANALYTICS VIEWS (visible to admin only via the read policies above)
-- ============================================================================
create or replace view public.admin_user_summary as
  select
    p.id, p.email, p.name, p.role, p.plan, p.trial_ends_at, p.created_at,
    (select count(*) from public.clients   c where c.user_id = p.id) as total_clients,
    (select count(*) from public.briefs    b where b.user_id = p.id) as total_briefs,
    (select count(*) from public.invoices  i where i.user_id = p.id) as total_invoices,
    (select count(*) from public.clients   c where c.user_id = p.id and c.is_lead = true) as total_leads,
    (select count(*) from public.clients   c where c.user_id = p.id and c.status = 'won') as total_won
  from public.users_profiles p;

-- ============================================================================
-- DONE.  Next: in your app, create an admin user by manually updating one row:
--   update public.users_profiles set role='admin' where email='you@yourdomain.com';
-- ============================================================================

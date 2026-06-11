# GigVorx — Freelancer SaaS MVP

## Original Problem Statement (iterations)
**v1 (Jun 11, 2026)**: Build a SaaS MVP with sidebar layout, dashboard, client CRM, brief builder, invoice generator, analytics, admin and pricing pages. Modern-minimal design + localStorage persistence.
**v2 (Jun 11, 2026)**: (a) Wire Supabase auth + tables + RLS with graceful localStorage fallback. (b) Add Lead Pipeline feature on a separate /leads page with kanban board, status flow (New Lead → … → Won/Lost), lead source, follow-up dates, estimated deal value, AI message templates with click-to-WhatsApp. (c) Extend Analytics and Admin with lead metrics. (d) Re-theme to white/blue/sky-blue/black/light-gray and add brand logo image to sidebar/header/auth.

## User Choices (verbatim)
- Storage: localStorage primary; **Supabase scaffolded with fallback**
- PDF: client-side jsPDF / html2canvas
- AI: placeholders only
- Design: light theme primary + dark logo only in header/sidebar
- Brand logo: GV mark in app; full logo in landing/auth side panels
- Leads: separate /leads page that converts Won leads → /clients
- Auth: preserve existing flow + add Supabase auth path

## Tech Stack
- React 19 + react-router-dom 7 + Tailwind 3 + shadcn/ui
- Plus Jakarta Sans + JetBrains Mono
- Lucide icons
- jsPDF + html2canvas
- sonner toasts
- `@supabase/supabase-js` 2.x
- localStorage per-user key: `gv_v1:<userId>:<resource>`
- Brand image at `/app/frontend/src/assets/gigvorx-logo.png`

## Persistence model
- If `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set in `/app/frontend/.env`, the app uses Supabase Auth + RLS-protected tables.
- Otherwise it uses localStorage transparently. The `useCollection(key)` hook and `AuthContext` handle both paths.
- SQL migration ships at `/app/supabase/migrations/001_init.sql` — paste into Supabase SQL Editor to set up: `users_profiles`, `clients` (with lead-pipeline fields), `briefs`, `brief_questions`, `invoices`, `invoice_items`, `user_settings`, `subscriptions`, `activity_logs`, plus RLS policies + auth.users trigger + `admin_user_summary` view.

## User Personas
1. Solo freelancer
2. Studio / agency owner
3. Platform admin

## Implemented · iteration 1 (light theme rebuild)
- App shell (sidebar, header, dropdown, breadcrumbs, mobile drawer, trial indicator, upgrade CTA)
- Auth: localStorage-based, seeded demo + admin
- Public: Landing + Pricing (4 plans, Most Popular + Best for Agencies badges, comparison)
- App: Dashboard, Clients CRUD, Briefs (17 niche templates + Google-Docs-style editor), Invoices (3 templates + live preview + PDF + WhatsApp + Mark-paid), Analytics, Admin, Settings, NotFound
- Tested: 100% pass — `/app/test_reports/iteration_1.json`

## Implemented · iteration 2 (Jun 11, 2026 · Supabase + Leads + Brand)
- **Supabase wiring**: `@supabase/supabase-js` installed; `supabase.js` returns null when env missing; `AuthContext` dual-path; `useCollection` dual-path with camel↔snake column mapping
- **SQL migration**: `/app/supabase/migrations/001_init.sql` (idempotent, includes lead-pipeline fields + RLS + admin view + auto-profile trigger)
- **Brand**: Real GigVorx logo image used in sidebar (round mark + word lockup), public header, login/signup auth side panels (large hero version on dark navy)
- **Theme**: Refactored to light + electric blue + sky + light gray + navy. `bg-brand-gradient`, `bg-logo-gradient`, `text-gradient` utilities
- **Leads page** at `/leads`:
  - Stats: Total leads, Pipeline value, Won value, Conversion rate
  - Kanban board view with 9 columns (New Lead → Won / Lost), HTML5 drag-drop between columns
  - List view toggle
  - Filters: search + source filter
  - Lead drawer with name/company/email/phone/service/value/status/source/follow-up/last-contacted/notes
  - **AI message templates dialog** (6 templates) — First outreach, Follow-up, Discovery call booking, Proposal follow-up, Payment reminder, Thank-you Won — with `{name}/{company}/{service}` substitution, **click-to-WhatsApp** via wa.me, Copy to clipboard
  - Moving a lead to Won flips `isLead=false` so it appears in `/clients`
- **Clients page**: now filters to converted clients only (`isLead===false || status==='won'`)
- **Analytics**: new sections — Revenue, **Lead pipeline** (total leads/won/lost/conversion), Activity, **Leads by source** bar chart
- **Admin**: new **Lead pipeline (platform-wide)** section — users using pipeline, total leads tracked, avg leads per user, **most-used lead sources** bar list. Aggregates via direct localStorage key scan so any user's data is counted (fix from iteration_2 testing)
- **Hero CTA recolored** to blue gradient (fix from iteration_2 testing)

## Tested
- Iteration 1: 100% pass (`/app/test_reports/iteration_1.json`)
- Iteration 2: 19/20 pass initial → all action items fixed (`/app/test_reports/iteration_2.json`)

## Backlog / next steps
- **P1**: Provide real Supabase URL + anon key in `.env` and run `001_init.sql` migration in Supabase SQL editor
- **P1**: Razorpay / Stripe wired to the upgrade flow (currently updates plan locally)
- **P2**: Real WhatsApp Business API (currently wa.me link)
- **P2**: Claude / GPT integration for AI brief generation (UI already prepped)
- **P2**: Team workspaces (Premium/Agency tier infra)
- **P3**: Activity log writes (table exists, no writes yet from app)
- **P3**: Email reminders for overdue invoices + follow-up reminders for leads
- **P3**: Client portal for brief approval

## Files of note
- `/app/supabase/migrations/001_init.sql` — Supabase schema + RLS + auth trigger + admin view
- `/app/frontend/.env.example` — env var template
- `/app/frontend/src/lib/supabase.js`, `/app/frontend/src/contexts/AuthContext.jsx`, `/app/frontend/src/lib/useCollection.js` — dual-path data layer
- `/app/frontend/src/lib/pipeline.js` — Lead statuses + sources + 6 AI templates
- `/app/frontend/src/pages/Leads.jsx` — full pipeline UI
- `/app/frontend/src/components/Brand.jsx` — Brand + BrandLockup + BrandLogoLarge

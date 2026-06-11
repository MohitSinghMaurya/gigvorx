# GigVorx — Freelancer SaaS MVP (Production-quality v2)

## Original Problem Statement
Improve a SaaS MVP and make it production-like. Fix bugs, broken routes/buttons, layout, responsiveness. Add app layout (sidebar, header, dropdown, trial indicator, upgrade button, mobile menu, breadcrumbs). Improve Client Brief Builder (Google-Docs-style editor, sections, Save/Preview/PDF/WhatsApp, prebuilt niche questions, editable custom questions). Improve Invoice Generator (multiple templates, logo, UPI, QR, invoice #, due date, tax/GST, discount, notes/terms, status badge, Save/Preview/PDF/WhatsApp/Mark-as-paid, thank-you after paid). Improve Analytics (user + admin) and Pricing (4 tiers, badges, comparison table, upgrade flow, future-updates note). Add localStorage persistence. Keep code clean and ready for Supabase, Razorpay, Stripe, WhatsApp API, AI APIs.

## User Choices (explicit)
- Storage: **localStorage** (no backend changes)
- PDF: **client-side jsPDF / html2canvas**
- AI: **placeholder only** — no AI integration yet
- Design: **modern minimal** (Plus Jakarta Sans, neutral palette, violet/indigo accents)
- Auth: **preserve existing flow**, only improve UI. Local session, no backend auth

## Tech Stack
- React 19 + react-router-dom 7
- Tailwind CSS 3 + shadcn/ui (Radix)
- Plus Jakarta Sans + JetBrains Mono via Google Fonts
- Lucide icons
- jsPDF + html2canvas for PDF
- sonner for toasts
- localStorage with per-user namespacing: `gv_v1:<userId>:<resource>`

## User Personas
1. **Solo freelancer** — wants briefs, invoices, basic CRM, fast turnarounds
2. **Small studio / agency owner** — wants branding, GST/UPI, analytics, plan upgrades
3. **Platform admin** — needs visibility into users, trials, revenue, feature usage

## Implemented (June 11, 2026)
### Layout
- Persistent sidebar with brand, primary nav (Dashboard/Clients/Briefs/Invoices/Analytics), secondary (Settings, Admin)
- Trial countdown card in sidebar with Upgrade Now CTA
- Top header with breadcrumbs, trial status badge, gradient Upgrade button, user-avatar dropdown (Profile, Billing, Admin, Logout)
- Mobile sidebar drawer (hamburger toggle)

### Auth
- localStorage session (`gv_session` → userId)
- Seeded users: demo (trial) + admin (agency, role=admin)
- Signup/Login/Logout, 7-day trial auto-created on signup
- Protected and PublicOnly route guards

### Public
- Landing — hero with gradient, niche chips (17), features grid, testimonials, CTA
- Pricing (public + in-app) — 4 plans, Most Popular & Best for Agencies badges, comparison table, future-updates note

### App pages
- Dashboard — 4 stat cards, recent activity feed, 3-step quick-start checklist
- Clients — CRUD with table, search, edit, delete with confirm dialog
- Briefs — niche picker with 17 niche templates + Blank, Google-Docs-style editor with sections (Project Overview, Client Details, Requirements, Timeline, Budget, Deliverables, Notes), Q&A with add/edit/remove, Confirmation checkbox, Preview dialog, PDF download (jsPDF), WhatsApp share, Save
- Invoices — list with status pills + search, editor with 3 templates (Classic, Modern, Minimal), invoice #, status, issue/due dates, line items, GST + discount, UPI ID, logo upload, QR upload, notes, terms, **live preview pane**, Save/Preview/PDF (html2canvas)/WhatsApp/Mark-as-paid with thank-you dialog
- Analytics — revenue, pending, overdue, conversion stats, 6-month revenue bar chart, invoice status breakdown
- Admin — total users, active/expired trials, paid users, revenue (MRR placeholder), feature usage (briefs/invoices/clients aggregated), signups chart, plan distribution, full user table
- Settings — profile, business info (used in invoices), plan badge, logout

## Tested (100% pass, iteration_1.json)
Landing · Public pricing · Signup · Demo login · Admin login · Sidebar navigation · Header (trial badge, Upgrade, dropdown) · Breadcrumbs · Clients CRUD · Briefs flow (niche picker + editor + PDF + WhatsApp) · Invoices flow (templates + live preview + PDF + WhatsApp + Mark paid) · Analytics · In-app pricing/upgrade · Settings · Persistence after reload · Per-user data isolation · Mobile menu · No console errors

## Future / Backlog
- **P1**: Supabase auth + Postgres migration
- **P1**: Razorpay / Stripe real billing integration on Upgrade flow
- **P1**: WhatsApp Business API for native sending (currently uses wa.me link)
- **P2**: AI brief generation (Claude/GPT) with Emergent LLM key — placeholder ready
- **P2**: Team workspaces (Premium/Agency tier infra)
- **P2**: Custom domain + white-label invoices (Agency tier)
- **P3**: Email reminders for overdue invoices
- **P3**: Client portal where clients can view/approve briefs
- **P3**: Calendar integration for deadline tracking

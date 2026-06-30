import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles, ArrowRight, FileText, Receipt, Users, BarChart3, MessageCircle,
  Globe, CheckCircle2, Star, Zap, Shield, Clock, Play, TrendingUp,
  MessageSquare, Palette, Monitor, Video, Search, Share2, Briefcase
} from "lucide-react";
import { NICHES } from "@/lib/niches";
import ExitIntentPopup from "@/components/ExitIntentPopup";
const NICHE_TEMPLATE_COUNT = 26;

const FEATURES = [
  { icon: Sparkles, title: "AI-ready Brief Builder", desc: `${NICHE_TEMPLATE_COUNT} niche templates, Google-Docs-style editor, instant share.` },
  { icon: Receipt, title: "Modern Invoice Generator", desc: "Multiple templates, GST, UPI, QR code, and PDF in one click." },
  { icon: Users, title: "Client CRM", desc: "Every client, brief, and invoice in one connected workspace." },
  { icon: BarChart3, title: "Real Analytics", desc: "Revenue, paid, pending, overdue — see your business clearly." },
  { icon: MessageCircle, title: "WhatsApp Sharing", desc: "Send briefs and invoices via WhatsApp without leaving the app." },
  { icon: Shield, title: "Yours Forever", desc: "Local-first storage and exports. Your data never leaves you." },
];

const NICHE_ICONS = {
  "web-design": Monitor,
  "social-media": Share2,
  "video-editing": Video,
  "seo": Search,
  "graphic-design": Palette,
  "default": Briefcase,
};

const TESTIMONIALS = [
  { name: "Priya Sharma", role: "Designer · Mumbai", text: "Cut my onboarding time in half. The niche brief templates feel like they were written by a senior strategist.", initials: "PS" },
  { name: "Rohit Mehra", role: "SEO Agency · Delhi", text: "Finally, an invoicing tool that respects how Indian freelancers actually work — UPI, GST, WhatsApp.", initials: "RM" },
  { name: "Fatima Khan", role: "Shopify Expert · Bangalore", text: "The brief editor alone is worth the price. Clients pay 30% faster after seeing how organised I look.", initials: "FK" },
  { name: "Sarah Mitchell", role: "Web Designer · London", text: "GigVorx cut my client onboarding from 3 hours to 15 minutes. The AI briefs ask exactly the right questions.", initials: "SM" },
  { name: "Marcus Johnson", role: "Video Editor · New York", text: "The dual currency feature is perfect. My US clients see $, my Indian clients see INR. Seamless.", initials: "MJ" },
  { name: "Emma Chen", role: "Social Media Agency · Sydney", text: "My clients actually fill out the briefs now. The niche-specific questions make them feel professional.", initials: "EC" },
];

const STATS = [
  { label: "Freelancers", value: "2,000+", icon: Users },
  { label: "Countries", value: "40+", icon: Globe },
  { label: "Briefs created", value: "15,000+", icon: MessageSquare },
  { label: "Average rating", value: "4.9/5", icon: Star },
];

const BEFORE_ITEMS = [
  { icon: MessageCircle, text: "Chasing clients across WhatsApp, email, and DMs" },
  { icon: FileText, text: "Writing the same proposal from scratch every time" },
  { icon: Receipt, text: "Creating invoices in Excel or Word — unprofessional" },
  { icon: Clock, text: "Spending 3+ hours on client onboarding per project" },
];

const AFTER_ITEMS = [
  { icon: Zap, text: "One smart link collects everything you need" },
  { icon: FileText, text: "AI generates niche-specific briefs in 60 seconds" },
  { icon: Receipt, text: "Professional GST/VAT invoices with one click" },
  { icon: CheckCircle2, text: "Clients complete briefs 5x faster with smart questions" },
];

const WORKFLOW_STEPS = [
  { title: "Client fills smart brief", description: "AI asks niche-specific questions. Client uploads logos, references, and answers in one link." },
  { title: "You review & send proposal", description: "GigVorx auto-generates a professional proposal from the brief data. Edit and send in seconds." },
  { title: "Invoice & get paid", description: "One-click invoice creation with your branding, dual currency, and payment links." },
];

const COMPETITORS = [
  { name: "GigVorx", isUs: true },
  { name: "HoneyBook", isUs: false },
  { name: "Dubsado", isUs: false },
  { name: "Bonsai", isUs: false },
  { name: "17hats", isUs: false },
];

const COMPARISON_FEATURES = [
  { label: "AI-powered briefs", gigvorx: true, honeybook: false, dubsado: false, bonsai: false, hats17: false },
  { label: "WhatsApp follow-ups", gigvorx: true, honeybook: false, dubsado: false, bonsai: false, hats17: false },
  { label: "Dual currency (INR + USD)", gigvorx: true, honeybook: false, dubsado: false, bonsai: false, hats17: false },
  { label: "Niche-specific questions", gigvorx: true, honeybook: false, dubsado: false, bonsai: false, hats17: false },
  { label: "Free tier", gigvorx: true, honeybook: false, dubsado: false, bonsai: false, hats17: false },
  { label: "India-first focus", gigvorx: true, honeybook: false, dubsado: false, bonsai: false, hats17: false },
  { label: "Global expansion", gigvorx: true, honeybook: true, dubsado: true, bonsai: true, hats17: true },
  { label: "Built by a freelancer", gigvorx: true, honeybook: false, dubsado: false, bonsai: false, hats17: false },
];

const PRICING_COMPARISON = [
  { name: "GigVorx", price: "INR 499 (~$6)", highlight: true },
  { name: "HoneyBook", price: "$29/mo", highlight: false },
  { name: "Dubsado", price: "$35/mo", highlight: false },
  { name: "Bonsai", price: "$25/mo", highlight: false },
  { name: "17hats", price: "$13/mo", highlight: false },
];

export default function Landing() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("scroll") === "reviews") {
      setTimeout(() => {
        const el = document.getElementById("testimonials");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-grid opacity-[0.15]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-sky-200 via-blue-100 to-blue-200 rounded-full blur-3xl opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-6 border-foreground/20 bg-background/80 backdrop-blur px-3 py-1.5" data-testid="hero-badge">
              <Sparkles className="w-3 h-3 mr-1.5" /> Trusted by 2,000+ freelancers in 40+ countries
            </Badge>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] text-foreground">
              Turn client chaos into<br />
              <span className="text-gradient">professional workflows</span>.
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              The all-in-one workspace for freelancers and agencies. Generate AI client briefs, send proposals, create GST/VAT invoices, and follow up via WhatsApp — all in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Web Designers", "Social Media Managers", "Video Editors", "SEO Freelancers", "Graphic Designers", "Agencies"].map((niche) => (
                <span key={niche} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
                  {niche}
                </span>
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link to="/signup">
                <Button size="lg" data-testid="hero-cta-signup" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:opacity-90 h-12 px-7 text-base font-semibold shadow-lg shadow-blue-500/25">
                  Start free trial — No credit card <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" data-testid="hero-cta-demo" className="h-12 px-7 text-base font-semibold">
                  <Play className="w-4 h-4 mr-2" /> See how it works
                </Button>
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                Free forever plan
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                Works in 40+ countries
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Setup in 5 minutes
              </span>
            </div>
          </div>

          {/* preview card */}
          <div className="mt-16 relative">
            <div className="rounded-2xl border bg-background shadow-2xl shadow-foreground/5 overflow-hidden">
              <div className="h-9 bg-muted/50 border-b flex items-center px-4 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
                {[
                  { label: "Total revenue", value: "INR 4,82,500 / $5,800", trend: "+24%" },
                  { label: "Active clients", value: "37", trend: "+6" },
                  { label: "Briefs sent", value: "128", trend: "+18" },
                ].map(s => (
                  <div key={s.label} className="p-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
                    <p className="text-3xl font-bold mt-2 tracking-tight">{s.value}</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">{s.trend} this month</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF STATS */}
      <section className="py-14 border-b bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat) => (
              <Card key={stat.label} className="p-5 text-center">
                <stat.icon className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* NICHES */}
      <section className="py-14 border-b bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs uppercase tracking-widest text-center text-muted-foreground font-semibold mb-6">
  {NICHE_TEMPLATE_COUNT} niche brief templates ready to send
</p>
          <div className="flex flex-wrap justify-center gap-2">
            {NICHES.map(n => {
              const Icon = NICHE_ICONS[n.slug] || NICHE_ICONS.default;
              return (
                <span key={n.slug} className="text-xs px-3 py-1.5 rounded-full bg-background border font-medium hover:border-foreground transition-colors flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  {n.name}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium border-rose-200 bg-rose-50 text-rose-700">
              The freelancer problem
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Stop the client chaos.<br />
              <span className="text-gradient">Start the professional workflow.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            <Card className="p-8 h-full border-rose-200 bg-rose-50/30">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                  <span className="text-rose-600 font-bold text-sm">X</span>
                </div>
                <h3 className="text-lg font-bold text-rose-700">Before GigVorx</h3>
              </div>
              <div className="space-y-4">
                {BEFORE_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <item.icon className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-rose-800/80">{item.text}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-8 h-full border-emerald-200 bg-emerald-50/30">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-emerald-700">With GigVorx</h3>
              </div>
              <div className="space-y-4">
                {AFTER_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <item.icon className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-emerald-800/80">{item.text}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-center mb-10">
              From first contact to getting paid — <span className="text-gradient">in minutes, not hours</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {WORKFLOW_STEPS.map((step, i) => (
                <Card key={step.title} className="p-6 h-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white flex items-center justify-center text-sm font-bold mb-4">
                    {i + 1}
                  </div>
                  <h4 className="font-semibold mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </Card>
              ))}
            </div>
          </div>
          <div className="text-center">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/25 text-base px-8 h-12">
                Try it free — No credit card required
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">Setup takes 5 minutes. Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Everything in one place</p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">Run your freelance business like a real company.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-background p-8 hover:bg-muted/30 transition-colors">
                <f.icon className="w-6 h-6 text-foreground mb-5" strokeWidth={1.75} />
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 border-t bg-muted/20" id="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium border-emerald-200 bg-emerald-50 text-emerald-700">
              <Users className="w-3 h-3 mr-1" />
              Join 2,000+ freelancers worldwide
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Loved by freelancers in <span className="text-gradient">40+ countries</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              From solo designers to 10-person agencies — GigVorx is the workflow tool freelancers actually enjoy using.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <Card key={t.name} className="p-7 hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-foreground leading-relaxed mb-5 text-sm">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-white text-sm font-bold flex items-center justify-center">{t.initials}</div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMPETITOR COMPARISON */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium border-blue-200 bg-blue-50 text-blue-700">
              <Zap className="w-3 h-3 mr-1" />
              Why freelancers choose GigVorx
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              The freelancer tool that <span className="text-gradient">actually gets it</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              We built GigVorx because we were tired of tools made by people who never freelanced. See how we stack up.
            </p>
          </div>
          <div className="overflow-x-auto mb-16">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-4 font-semibold min-w-[200px]">Feature</th>
                  {COMPETITORS.map((comp) => (
                    <th key={comp.name} className={`text-center p-4 font-semibold min-w-[100px] ${comp.isUs ? 'text-blue-600 bg-blue-50/50' : ''}`}>
                      {comp.name}
                      {comp.isUs && <span className="ml-1.5 text-[10px] bg-gradient-to-r from-blue-500 to-violet-500 text-white px-1.5 py-0.5 rounded">You</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feature, i) => (
                  <tr key={feature.label} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{feature.label}</td>
                    <td className="p-4 text-center bg-blue-50/30">
                      {feature.gigvorx ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {feature.honeybook ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {feature.dubsado ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {feature.bonsai ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {feature.hats17 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mb-16">
            <h3 className="text-xl font-bold text-center mb-8">Starting price comparison</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {PRICING_COMPARISON.map((item) => (
                <Card key={item.name} className={`p-4 text-center ${item.highlight ? 'border-blue-400 bg-blue-50/30' : ''}`}>
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className={`text-lg font-bold mt-1 ${item.highlight ? 'text-blue-600' : ''}`}>{item.price}</p>
                  {item.highlight && <span className="mt-2 inline-block text-[10px] bg-gradient-to-r from-blue-500 to-violet-500 text-white px-2 py-0.5 rounded">Best value</span>}
                </Card>
              ))}
            </div>
          </div>
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 mb-16">
            <div className="max-w-2xl mx-auto text-center">
              <Zap className="w-8 h-8 text-blue-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-3">
                Built by a 16-year-old freelancer who was tired of expensive, clunky tools
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                I started GigVorx because I needed a tool that understood what freelancers actually go through — chasing clients on WhatsApp, writing the same proposals, creating invoices in Excel. Every feature exists because I personally needed it. No corporate bloat, no features you'll never use.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <CheckCircle2 className="w-4 h-4" />
                  No VC funding = no pressure to maximize profits
                </span>
                <span className="flex items-center gap-1.5 text-blue-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Every feature ships in days, not quarters
                </span>
                <span className="flex items-center gap-1.5 text-blue-700">
                  <CheckCircle2 className="w-4 h-4" />
                  WhatsApp me directly for support
                </span>
              </div>
            </div>
          </Card>
          <div className="text-center">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/25 text-base px-8 h-12">
                Try GigVorx free — No credit card
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              2,000+ freelancers already made the switch. Join them.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-5">Stop juggling tools. Start closing clients.</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-9">Set up in 60 seconds. No credit card. Cancel anytime.</p>
          <Link to="/signup">
            <Button size="lg" data-testid="footer-cta-signup" className="bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 text-white h-12 px-8 text-base font-semibold shadow-lg shadow-blue-500/25">
              Get started free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Exit Intent Popup */}
      <ExitIntentPopup />
    </div>
  );
}
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles, ArrowRight, FileText, Receipt, Users, BarChart3, MessageCircle,
  Globe, CheckCircle2, Star, Zap, Shield, Clock
} from "lucide-react";
import { NICHES } from "@/lib/niches";

const FEATURES = [
  { icon: Sparkles, title: "AI-ready Brief Builder", desc: "17 niche templates, Google-Docs-style editor, instant share." },
  { icon: Receipt, title: "Modern Invoice Generator", desc: "Multiple templates, GST, UPI, QR code, and PDF in one click." },
  { icon: Users, title: "Client CRM", desc: "Every client, brief, and invoice in one connected workspace." },
  { icon: BarChart3, title: "Real Analytics", desc: "Revenue, paid, pending, overdue — see your business clearly." },
  { icon: MessageCircle, title: "WhatsApp Sharing", desc: "Send briefs and invoices via WhatsApp without leaving the app." },
  { icon: Shield, title: "Yours Forever", desc: "Local-first storage and exports. Your data never leaves you." },
];

const TESTIMONIALS = [
  { name: "Priya Sharma", role: "Designer · Mumbai", text: "Cut my onboarding time in half. The niche brief templates feel like they were written by a senior strategist.", initials: "PS" },
  { name: "Rohit Mehra", role: "SEO Agency · Delhi", text: "Finally, an invoicing tool that respects how Indian freelancers actually work — UPI, GST, WhatsApp.", initials: "RM" },
  { name: "Fatima Khan", role: "Shopify Expert · Bangalore", text: "The brief editor alone is worth the price. Clients pay 30% faster after seeing how organised I look.", initials: "FK" },
];

export default function Landing() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-grid opacity-[0.15]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-sky-200 via-blue-100 to-blue-200 rounded-full blur-3xl opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-6 border-foreground/20 bg-background/80 backdrop-blur px-3 py-1.5" data-testid="hero-badge">
              <Sparkles className="w-3 h-3 mr-1.5" /> New · Brief editor & multi-template invoices
            </Badge>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] text-foreground">
              The freelancer's<br />
              <span className="text-gradient">operating system</span>.
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Briefs, invoices, clients and analytics — designed for freelancers and agencies who care about how they show up. Built for India. Loved everywhere.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link to="/signup">
                <Button size="lg" data-testid="hero-cta-signup" className="bg-foreground text-background hover:bg-foreground/90 h-12 px-7 text-base font-semibold">
                  Start 7-day free trial <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" data-testid="hero-cta-demo" className="h-12 px-7 text-base font-semibold">
                  Try the demo
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card · No setup · Cancel anytime
            </p>
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
                  { label: "Total revenue", value: "₹4,82,500", trend: "+24%" },
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

      {/* NICHES */}
      <section className="py-14 border-b bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs uppercase tracking-widest text-center text-muted-foreground font-semibold mb-6">17 niche brief templates ready to send</p>
          <div className="flex flex-wrap justify-center gap-2">
            {NICHES.map(n => (
              <span key={n.slug} className="text-xs px-3 py-1.5 rounded-full bg-background border font-medium hover:border-foreground transition-colors">{n.name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-semibold text-brand uppercase tracking-widest mb-3">Everything in one place</p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">Run your freelance business like a real company.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border">
            {FEATURES.map((f, idx) => (
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
            <h2 className="text-4xl font-bold tracking-tight">Loved by freelancers everywhere</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <Card key={t.name} className="p-7 hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-foreground leading-relaxed mb-5 text-sm">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold flex items-center justify-center">{t.initials}</div>
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

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-5">Stop juggling tools. Start closing clients.</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-9">Set up in 60 seconds. No credit card. Cancel anytime.</p>
          <Link to="/signup">
            <Button size="lg" data-testid="footer-cta-signup" className="bg-brand-gradient hover:opacity-90 text-white h-12 px-8 text-base font-semibold shadow-lg shadow-blue-500/25">
              Get started free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

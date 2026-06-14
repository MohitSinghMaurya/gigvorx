import { Link, useNavigate } from "react-router-dom";
import { PLANS, COMPARISON_ROWS } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, X } from "lucide-react";

export default function Pricing({ inApp = false }) {
  const { user } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const getPrice = (plan) => {
    if (currency === "USD") return `$${plan.priceUSD}`;
    return `₹${plan.price.toLocaleString("en-IN")}`;
  };

  return (
    <>
      {/* Tally Script */}
      <script async src="https://tally.so/widgets/embed.js"></script>

      <div className={inApp ? "" : "py-20"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-4"><Sparkles className="w-3 h-3 mr-1.5" />Simple pricing, no surprises</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">Pick a plan that grows with you.</h1>
            <p className="mt-4 text-lg text-muted-foreground">Start with Starter. Upgrade anytime. All upcoming features and updates are included on every active subscription.</p>

            {/* Currency Toggle */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrency("INR")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  currency === "INR"
                    ? "bg-foreground text-background shadow-md"
                    : "border border-border text-muted-foreground hover:border-foreground/40"
                }`}
              >
                ₹ INR
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  currency === "USD"
                    ? "bg-foreground text-background shadow-md"
                    : "border border-border text-muted-foreground hover:border-foreground/40"
                }`}
              >
                $ USD
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {PLANS.map(plan => {
              const popular = plan.badge === "Most Popular";
              const agency = plan.badge === "Best for Agencies";
              const isCurrent = user?.plan === plan.id;
              return (
                <Card
                  key={plan.id}
                  data-testid={`plan-card-${plan.id}`}
                  className={`relative p-6 transition-all ${popular ? "border-foreground shadow-2xl shadow-foreground/10 lg:scale-[1.02]" : agency ? "border-violet-300" : "hover:border-foreground/40"}`}
                >
                  {plan.badge && (
                    <Badge
                      data-testid={`plan-badge-${plan.id}`}
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${popular ? "bg-brand-gradient text-white" : "bg-violet-600 text-white"}`}
                    >
                      {plan.badge}
                    </Badge>
                  )}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">{getPrice(plan)}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>

                  {/* Early Access Button — replaces old pay/upgrade button */}
                  <button
                    data-testid={`plan-cta-${plan.id}`}
                    data-tally-open="81Ej0x"
                    data-tally-emoji-text="👋"
                    data-tally-emoji-animation="wave"
                    className={`mt-5 w-full py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                      popular
                        ? "bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20"
                        : "border border-border hover:border-foreground/40 text-foreground"
                    }`}
                  >
                    Join Early Access →
                  </button>

                  <div className="mt-6 space-y-2.5">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="text-foreground/90">{f}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight mb-6 text-center">Compare features</h2>
            <div className="overflow-x-auto border rounded-2xl bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    {PLANS.map(p => (
                      <th key={p.id} className="p-4 font-semibold text-center min-w-[120px]">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr key={row.label} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="p-4 font-medium">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="p-4 text-center text-muted-foreground">
                          {v === "✓" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : v === "—" ? <X className="w-4 h-4 text-muted-foreground/50 mx-auto" /> : <span className="text-foreground">{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Early Access Banner */}
          <div className="rounded-2xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-6 md:p-8 text-center max-w-3xl mx-auto mb-8">
            <Sparkles className="w-6 h-6 mx-auto mb-3 text-blue-600" />
            <p className="font-semibold text-lg">🚀 Paid plans launching soon — join early access today.</p>
            <p className="text-sm text-muted-foreground mt-2">Early access members get a special discount when payments go live. Lock in your spot now.</p>
            <button
              data-tally-open="81Ej0x"
              data-tally-emoji-text="👋"
              data-tally-emoji-animation="wave"
              className="mt-4 px-6 py-2.5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all"
            >
              Get Early Access →
            </button>
          </div>

          <div className="rounded-2xl border bg-muted/30 p-6 md:p-8 text-center max-w-3xl mx-auto">
            <Sparkles className="w-6 h-6 mx-auto mb-3 text-foreground" />
            <p className="font-semibold text-lg">Active subscribers get every future update — free.</p>
            <p className="text-sm text-muted-foreground mt-2">AI brief generation, Razorpay & Stripe payments, WhatsApp Business API, custom domains and team workspaces are all on the roadmap and included on your active plan.</p>
          </div>
        </div>
      </div>
    </>
  );
}
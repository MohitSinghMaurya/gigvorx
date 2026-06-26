import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Shield, Zap, Crown, Building2, ArrowRight, CreditCard, RotateCcw, Clock } from "lucide-react";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceINR: 499,
    priceUSD: 6,
    period: "/mo",
    description: "Perfect for freelancers just getting started",
    badge: null,
    popular: false,
    features: [
      { text: "Up to 10 active clients", included: true },
      { text: "10 briefs per month", included: true },
      { text: "10 invoices per month", included: true },
      { text: "5 brief niches", included: true },
      { text: "WhatsApp sharing", included: true },
      { text: "Basic analytics", included: true },
      { text: "PDF downloads", included: true },
      { text: "Custom branding", included: false },
      { text: "AI brief generation", included: false },
      { text: "Team members", included: false },
    ],
    cta: "Start free trial",
    trustLines: ["No credit card required", "Cancel anytime"],
  },
  {
    id: "pro",
    name: "Pro",
    priceINR: 999,
    priceUSD: 12,
    period: "/mo",
    description: "For serious freelancers and small studios",
    badge: "Most Popular",
    popular: true,
    features: [
      { text: "Unlimited clients", included: true, highlight: true },
      { text: "Unlimited briefs & invoices", included: true, highlight: true },
      { text: "All 17 brief niches", included: true },
      { text: "Custom invoice templates", included: true },
      { text: "Branding (logo, UPI, QR)", included: true },
      { text: "Full analytics dashboard", included: true },
      { text: "Priority support", included: true },
      { text: "All upcoming features", included: true },
      { text: "AI brief generation", included: false },
      { text: "Team members", included: false },
    ],
    cta: "Start free trial",
    trustLines: ["No credit card required", "Cancel anytime", "Setup in 5 minutes"],
  },
  {
    id: "premium",
    name: "Premium",
    priceINR: 1699,
    priceUSD: 20,
    period: "/mo",
    description: "For power users who want it all",
    badge: null,
    popular: false,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Up to 3 team members", included: true, highlight: true },
      { text: "Advanced analytics & exports", included: true },
      { text: "Custom domains", included: true, comingSoon: true },
      { text: "AI brief generation", included: true, comingSoon: true },
      { text: "Razorpay / Stripe integration", included: true },
      { text: "1-on-1 onboarding call", included: true },
      { text: "White-label invoices", included: false },
      { text: "API access", included: false },
      { text: "Dedicated account manager", included: false },
    ],
    cta: "Start free trial",
    trustLines: ["No credit card required", "Cancel anytime"],
  },
  {
    id: "agency",
    name: "Agency",
    priceINR: 3000,
    priceUSD: 35,
    period: "/mo",
    description: "For growing agencies and teams",
    badge: "Best for Agencies",
    popular: false,
    features: [
      { text: "Everything in Premium", included: true },
      { text: "Up to 10 team members", included: true, highlight: true },
      { text: "White-label invoices & briefs", included: true },
      { text: "Client portal access", included: true },
      { text: "API access", included: true, comingSoon: true },
      { text: "Dedicated account manager", included: true },
      { text: "Custom integrations", included: true },
      { text: "SLA guarantee", included: true },
      { text: "Priority everything", included: true },
      { text: "Early access to new features", included: true },
    ],
    cta: "Contact sales",
    trustLines: ["Custom onboarding", "SLA guarantee"],
  },
];

const COMPARISON_FEATURES = [
  { label: "Active clients", starter: "10", pro: "Unlimited", premium: "Unlimited", agency: "Unlimited" },
  { label: "Briefs / invoices per month", starter: "10 each", pro: "Unlimited", premium: "Unlimited", agency: "Unlimited" },
  { label: "Brief niches", starter: "5", pro: "All 17", premium: "All 17", agency: "All 17" },
  { label: "Invoice templates", starter: "1", pro: "3", premium: "All", agency: "All" },
  { label: "Custom branding", starter: "—", pro: "✓", premium: "✓", agency: "✓" },
  { label: "WhatsApp & PDF sharing", starter: "✓", pro: "✓", premium: "✓", agency: "✓" },
  { label: "Analytics dashboard", starter: "Basic", pro: "Full", premium: "Advanced", agency: "Advanced" },
  { label: "Team members", starter: "1", pro: "1", premium: "3", agency: "10" },
  { label: "AI brief generation", starter: "—", pro: "—", premium: "Coming soon", agency: "Coming soon" },
  { label: "White-label", starter: "—", pro: "—", premium: "—", agency: "✓" },
  { label: "Priority support", starter: "—", pro: "✓", premium: "✓", agency: "Dedicated" },
  { label: "API access", starter: "—", pro: "—", premium: "—", agency: "Coming soon" },
];

function formatPriceINR(price) {
  return "INR " + price.toLocaleString("en-IN");
}

function formatPriceUSD(price) {
  return "$" + price;
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user, activateEarlyAccessPlan } = useAuth();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [hoveredPlan, setHoveredPlan] = useState(null);

  const handleSelectPlan = async (planId) => {
    if (!user) {
      navigate("/signup");
      return;
    }
    try {
      await activateEarlyAccessPlan(planId);
      navigate("/dashboard");
    } catch (error) {
      console.error("Plan activation failed:", error);
    }
  };

  const discount = billingCycle === "yearly" ? 0.17 : 0;

  return (
    <div className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium border-blue-200 bg-blue-50 text-blue-700">
            <Sparkles className="w-3 h-3 mr-1" />
            Start free — No credit card required
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Simple pricing for <span className="text-gradient">every freelancer</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Whether you are a solo designer in Mumbai or a 10-person agency in London, 
            we have a plan that fits. All prices shown in both INR and USD.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1 rounded-xl bg-muted border">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Yearly
              <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700 px-1.5 py-0">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {PLANS.map((plan, i) => {
            const priceINR = billingCycle === "yearly" 
              ? Math.round(plan.priceINR * 12 * (1 - discount) / 12)
              : plan.priceINR;
            const priceUSD = billingCycle === "yearly"
              ? Math.round(plan.priceUSD * 12 * (1 - discount) / 12)
              : plan.priceUSD;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                <Card 
                  className={`relative p-6 h-full flex flex-col transition-all duration-300 ${
                    plan.popular 
                      ? "border-blue-400 shadow-lg shadow-blue-500/10 scale-[1.02]" 
                      : hoveredPlan === plan.id 
                        ? "border-foreground/20 shadow-md" 
                        : ""
                  }`}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 px-3 py-1 text-xs font-semibold">
                        <Crown className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Plan badge */}
                  {plan.badge && !plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="outline" className="bg-background px-3 py-1 text-xs font-semibold border-amber-200 text-amber-700">
                        <Building2 className="w-3 h-3 mr-1" />
                        {plan.badge}
                      </Badge>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  {/* DUAL CURRENCY PRICING */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight">
                        {formatPriceINR(priceINR)}
                      </span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      (~{formatPriceUSD(priceUSD)}{plan.period})
                    </p>
                    {billingCycle === "yearly" && (
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        Billed annually — 2 months free
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full mb-4 ${
                      plan.popular 
                        ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:opacity-90 shadow-sm shadow-blue-500/20" 
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>

                  {/* Trust lines */}
                  <div className="space-y-1.5 mb-6">
                    {plan.trustLines.map((line, idx) => (
                      <p key={idx} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        {idx === 0 && <CreditCard className="w-3 h-3" />}
                        {idx === 1 && <RotateCcw className="w-3 h-3" />}
                        {idx === 2 && <Clock className="w-3 h-3" />}
                        {line}
                      </p>
                    ))}
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${feature.highlight ? "text-blue-500" : "text-emerald-500"}`} />
                        ) : (
                          <X className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground/30" />
                        )}
                        <span className={`text-sm ${
                          !feature.included ? "text-muted-foreground/50" : feature.highlight ? "font-medium" : ""
                        }`}>
                          {feature.text}
                          {feature.comingSoon && (
                            <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 border-amber-200 text-amber-600">
                              Soon
                            </Badge>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison table */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Compare all features</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold">Starter</th>
                  <th className="text-center p-4 font-semibold text-blue-600">Pro</th>
                  <th className="text-center p-4 font-semibold">Premium</th>
                  <th className="text-center p-4 font-semibold">Agency</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{row.label}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.starter}</td>
                    <td className="p-4 text-center font-medium text-blue-600">{row.pro}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.premium}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ / Trust section */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              SSL Secure
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-500" />
              PCI Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Instant setup
            </span>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Questions? Email us at{" "}
            <a href="mailto:gigvorx@gmail.com" className="text-foreground underline">
              gigvorx@gmail.com
            </a>
            {" "}or WhatsApp{" "}
            <a href="https://wa.me/918273278896" className="text-foreground underline">
              +91 82732 78896
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
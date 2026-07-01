import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  CreditCard,
  Crown,
  RotateCcw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { COMPARISON_ROWS, PLANS_INR } from "@/lib/plans";

function formatPriceINR(price) {
  return `INR ${price.toLocaleString("en-IN")}`;
}

function formatPriceUSD(price) {
  return `$${price}`;
}

function getYearlyMonthlyPrice(price) {
  return Math.round((price * 12 * 0.83) / 12);
}

function getCtaText(user) {
  return user ? "Choose plan" : "Start 7-day trial";
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user, upgradePlan } = useAuth();

  const [billingCycle, setBillingCycle] = useState("monthly");
  const [hoveredPlan, setHoveredPlan] = useState(null);

  const handleSelectPlan = async (planId) => {
    if (!user) {
      localStorage.setItem("gigvorx_requested_plan", planId);
      navigate("/signup");
      return;
    }

    try {
      await upgradePlan(planId);
      navigate("/pricing-app");
    } catch (error) {
      console.error("Plan request failed:", error);
      navigate("/pricing-app");
    }
  };

  return (
    <div className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <Badge
            variant="outline"
            className="mb-4 border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Start your 7-day trial — No credit card required
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple pricing for{" "}
            <span className="text-gradient">freelancers and agencies</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start with a 7-day free trial, then choose the plan that fits your
            client-work workflow.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-xl border bg-muted p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                billingCycle === "yearly"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Yearly
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700"
              >
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS_INR.map((plan, index) => {
            const priceINR =
              billingCycle === "yearly"
                ? getYearlyMonthlyPrice(plan.price)
                : plan.price;

            const priceUSD =
              billingCycle === "yearly"
                ? getYearlyMonthlyPrice(plan.priceUSD)
                : plan.priceUSD;

            const isPopular = plan.badge === "Most Popular";
            const isHovered = hoveredPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                <Card
                  className={`relative flex h-full flex-col p-6 transition-all duration-300 ${
                    isPopular
                      ? "scale-[1.02] border-blue-400 shadow-lg shadow-blue-500/10"
                      : isHovered
                      ? "border-foreground/20 shadow-md"
                      : ""
                  }`}
                >
                  {isPopular ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="border-0 bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-1 text-xs font-semibold text-white">
                        <Crown className="mr-1 h-3 w-3" />
                        Most Popular
                      </Badge>
                    </div>
                  ) : null}

                  {plan.badge && !isPopular ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-background px-3 py-1 text-xs font-semibold text-amber-700"
                      >
                        <Building2 className="mr-1 h-3 w-3" />
                        {plan.badge}
                      </Badge>
                    </div>
                  ) : null}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight">
                        {formatPriceINR(priceINR)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      (~{formatPriceUSD(priceUSD)}
                      {plan.period})
                    </p>

                    {billingCycle === "yearly" ? (
                      <p className="mt-1 text-xs font-medium text-emerald-600">
                        Billed annually — about 2 months free
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`mb-4 w-full ${
                      isPopular
                        ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-sm shadow-blue-500/20 hover:opacity-90"
                        : ""
                    }`}
                    variant={isPopular ? "default" : "outline"}
                  >
                    {getCtaText(user)}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>

                  <div className="mb-6 space-y-1.5">
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <CreditCard className="h-3 w-3" />
                      No credit card required for trial
                    </p>
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <RotateCcw className="h-3 w-3" />
                      Cancel anytime
                    </p>
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Trial starts after signup
                    </p>
                  </div>

                  <div className="flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Compare all features
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-semibold">Feature</th>
                  <th className="p-4 text-center font-semibold">Starter</th>
                  <th className="p-4 text-center font-semibold text-blue-600">
                    Pro
                  </th>
                  <th className="p-4 text-center font-semibold">Premium</th>
                  <th className="p-4 text-center font-semibold">Agency</th>
                </tr>
              </thead>

              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    <td className="p-4 font-medium">{row.label}</td>
                    <td className="p-4 text-center text-muted-foreground">
                      {row.values[0]}
                    </td>
                    <td className="p-4 text-center font-medium text-blue-600">
                      {row.values[1]}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {row.values[2]}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {row.values[3]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" />
              Secure workspace
            </span>

            <span className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-blue-500" />
              Payment setup after trial
            </span>

            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Instant setup
            </span>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Questions? Email us at{" "}
            <a href="mailto:gigvorx@gmail.com" className="text-foreground underline">
              gigvorx@gmail.com
            </a>{" "}
            or WhatsApp{" "}
            <a
              href="https://wa.me/918273278896"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline"
            >
              +91 82732 78896
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
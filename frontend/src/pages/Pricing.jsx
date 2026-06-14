import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PLANS, COMPARISON_ROWS } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, X } from "lucide-react";

export default function Pricing({ inApp = false }) {
  const navigate = useNavigate();
  const { user, activateEarlyAccessPlan } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const TALLY_FORM_ID = "81Ej0x";

  const getPrice = (plan) => {
    if (currency === "USD") return `$${plan.priceUSD}`;
    return `₹${plan.price.toLocaleString("en-IN")}`;
  };

  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://tally.so/widgets/embed.js"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://tally.so/widgets/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const earlyAccess = params.get("earlyAccess");
    const selectedPlan = params.get("plan");

    async function handleEarlyAccessRedirect() {
      if (earlyAccess === "success" && selectedPlan) {
        localStorage.setItem("gigvorx_early_access_plan", selectedPlan);
        localStorage.setItem("gigvorx_plan_status", "early_access");
        localStorage.setItem("gigvorx_billing_status", "free_beta");
        localStorage.setItem("gigvorx_subscription_active", "true");
        localStorage.setItem(
          "gigvorx_early_access_started_at",
          new Date().toISOString()
        );

        if (user && activateEarlyAccessPlan) {
          await activateEarlyAccessPlan(selectedPlan);
        } else {
          localStorage.setItem("gigvorx_pending_plan", selectedPlan);
        }

        alert(
          `Early access activated! Your ${selectedPlan.toUpperCase()} plan is now selected.`
        );

        navigate("/pricing-app", { replace: true });
      }
    }

    handleEarlyAccessRedirect();
  }, [navigate, user, activateEarlyAccessPlan]);

  const openEarlyAccessForm = (plan) => {
    const selectedPlan = plan?.id || "pro";
    const selectedPlanName = plan?.name || "Pro";

    localStorage.setItem("gigvorx_pending_plan", selectedPlan);

    const openPopup = () => {
      if (window.Tally && typeof window.Tally.openPopup === "function") {
        window.Tally.openPopup(TALLY_FORM_ID, {
          emoji: {
            text: "👋",
            animation: "wave",
          },
          hiddenFields: {
            selected_plan: selectedPlan,
            selected_plan_name: selectedPlanName,
            user_email: user?.email || "",
            user_id: user?.id || "",
            source: "pricing_page",
          },
          onSubmit: async () => {
            localStorage.setItem("gigvorx_early_access_plan", selectedPlan);
            localStorage.setItem("gigvorx_plan_status", "early_access");
            localStorage.setItem("gigvorx_billing_status", "free_beta");
            localStorage.setItem("gigvorx_subscription_active", "true");
            localStorage.setItem(
              "gigvorx_early_access_started_at",
              new Date().toISOString()
            );

            if (user && activateEarlyAccessPlan) {
              await activateEarlyAccessPlan(selectedPlan);
            } else {
              localStorage.setItem("gigvorx_pending_plan", selectedPlan);
            }

            navigate(`/pricing-app?earlyAccess=success&plan=${selectedPlan}`, {
              replace: true,
            });
          },
        });
      } else {
        window.open(
          `https://tally.so/r/${TALLY_FORM_ID}?selected_plan=${encodeURIComponent(
            selectedPlan
          )}&selected_plan_name=${encodeURIComponent(selectedPlanName)}`,
          "_blank"
        );
      }
    };

    if (window.Tally && typeof window.Tally.openPopup === "function") {
      openPopup();
    } else {
      setTimeout(openPopup, 800);
    }
  };

  return (
    <div className={inApp ? "" : "py-20"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Simple pricing, no surprises
          </Badge>

          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
            Pick a plan that grows with you.
          </h1>

          <p className="mt-4 text-lg text-muted-foreground">
            Start with Starter. Upgrade anytime. All upcoming features and
            updates are included on every active subscription.
          </p>

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
          {PLANS.map((plan) => {
            const popular = plan.badge === "Most Popular";
            const agency = plan.badge === "Best for Agencies";

            const activePlan =
              user?.plan || localStorage.getItem("gigvorx_early_access_plan");

            const isCurrent = activePlan === plan.id;

            return (
              <Card
                key={plan.id}
                data-testid={`plan-card-${plan.id}`}
                className={`relative p-6 transition-all ${
                  popular
                    ? "border-foreground shadow-2xl shadow-foreground/10 lg:scale-[1.02]"
                    : agency
                    ? "border-violet-300"
                    : "hover:border-foreground/40"
                }`}
              >
                {plan.badge && (
                  <Badge
                    data-testid={`plan-badge-${plan.id}`}
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${
                      popular
                        ? "bg-brand-gradient text-white"
                        : "bg-violet-600 text-white"
                    }`}
                  >
                    {plan.badge}
                  </Badge>
                )}

                <h3 className="text-lg font-bold">{plan.name}</h3>

                <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                  {plan.description}
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {getPrice(plan)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                </div>

                <button
                  type="button"
                  data-testid={`plan-cta-${plan.id}`}
                  onClick={() => openEarlyAccessForm(plan)}
                  className={`mt-5 w-full py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                    isCurrent
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : popular
                      ? "bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20"
                      : "border border-border hover:border-foreground/40 text-foreground"
                  }`}
                >
                  {isCurrent ? "Early Access Active" : "Join Early Access →"}
                </button>

                <div className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
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
          <h2 className="text-2xl font-bold tracking-tight mb-6 text-center">
            Compare features
          </h2>

          <div className="overflow-x-auto border rounded-2xl bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  {PLANS.map((p) => (
                    <th
                      key={p.id}
                      className="p-4 font-semibold text-center min-w-[120px]"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={row.label}
                    className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="p-4 font-medium">{row.label}</td>

                    {row.values.map((v, i) => (
                      <td
                        key={i}
                        className="p-4 text-center text-muted-foreground"
                      >
                        {v === "✓" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : v === "—" ? (
                          <X className="w-4 h-4 text-muted-foreground/50 mx-auto" />
                        ) : (
                          <span className="text-foreground">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-6 md:p-8 text-center max-w-3xl mx-auto mb-8">
          <Sparkles className="w-6 h-6 mx-auto mb-3 text-blue-600" />

          <p className="font-semibold text-lg">
            🚀 Paid plans launching soon — join early access today.
          </p>

          <p className="text-sm text-muted-foreground mt-2">
            Early access members get a special discount when payments go live.
            Lock in your spot now.
          </p>

          <button
            type="button"
            onClick={() =>
              openEarlyAccessForm({
                id: "pro",
                name: "Pro",
              })
            }
            className="mt-4 px-6 py-2.5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            Get Early Access →
          </button>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-6 md:p-8 text-center max-w-3xl mx-auto">
          <Sparkles className="w-6 h-6 mx-auto mb-3 text-foreground" />

          <p className="font-semibold text-lg">
            Active subscribers get every future update — free.
          </p>

          <p className="text-sm text-muted-foreground mt-2">
            AI brief generation, Razorpay & Stripe payments, WhatsApp Business
            API, custom domains and team workspaces are all on the roadmap and
            included on your active plan.
          </p>
        </div>
      </div>
    </div>
  );
}
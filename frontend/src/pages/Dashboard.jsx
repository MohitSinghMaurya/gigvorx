import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readSetting, writeSetting, readGlobal } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  Receipt,
  TrendingUp,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  X,
  Globe,
  User,
  Building2,
  Link2,
  CreditCard,
  ListChecks,
  AlertTriangle,
  Crown,
} from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;

function getTrialStatus(user) {
  const isTrial = user?.plan === "trial";
  if (!isTrial) return null;

  const trialEnd = user?.trialEndsAt || user?.trial_ends_at;

  if (!trialEnd) {
    return {
      label: "Trial: starts today",
      description: "Your 7-day free trial starts with your account.",
      tone: "blue",
    };
  }

  const msLeft = new Date(trialEnd).getTime() - Date.now();

  if (msLeft <= 0) {
    return {
      label: "Trial expired — upgrade to continue",
      description:
        "Choose a paid plan to keep creating briefs, invoices, and client records.",
      tone: "rose",
    };
  }

  const daysLeft = Math.ceil(msLeft / DAY_MS);

  if (daysLeft <= 1) {
    return {
      label: "Trial ends today",
      description: "Upgrade today to avoid interruption.",
      tone: "amber",
    };
  }

  return {
    label: `Trial: ${daysLeft} days left`,
    description:
      "Your 7-day trial is active. Upgrade anytime to keep your workflow after trial.",
    tone: "blue",
  };
}

function StatCard({ label, value, sub, icon: Icon, accent, testid }) {
  return (
    <Card
      data-testid={testid}
      className="p-5 transition-all hover:border-foreground/20 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </Card>
  );
}

function getItemTime(item) {
  return item?.created_at || item?.createdAt || null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      if (isSupabaseEnabled) {
        const [invRes, briefRes, clientRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, invoice_number, client_name, status, total, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("briefs")
            .select("id, title, status, share_token, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("clients")
            .select("id, name, is_lead, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        setInvoices(invRes.data || []);
        setBriefs(briefRes.data || []);
        setClients(clientRes.data || []);
      } else {
        const localInvoices = readGlobal("invoices", []).filter(
          (item) => item?.user_id === user.id || item?.userId === user.id
        );
        const localBriefs = readGlobal("briefs", []).filter(
          (item) => item?.user_id === user.id || item?.userId === user.id
        );
        const localClients = readGlobal("clients", []).filter(
          (item) => item?.user_id === user.id || item?.userId === user.id
        );

        setInvoices(
          [...localInvoices].sort(
            (a, b) => new Date(getItemTime(b)) - new Date(getItemTime(a))
          )
        );
        setBriefs(
          [...localBriefs].sort(
            (a, b) => new Date(getItemTime(b)) - new Date(getItemTime(a))
          )
        );
        setClients(
          [...localClients].sort(
            (a, b) => new Date(getItemTime(b)) - new Date(getItemTime(a))
          )
        );
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    fetchAll();
    const dismissed = readSetting(user.id, "onboarding_dismissed", false);
    setOnboardingDismissed(dismissed);
  }, [user?.id, fetchAll]);

  const stats = useMemo(() => {
    const paid = invoices.filter((invoice) => invoice.status === "paid");
    const pending = invoices.filter((invoice) => invoice.status === "pending");
    const overdue = invoices.filter((invoice) => invoice.status === "overdue");

    const revenue = paid.reduce(
      (sum, invoice) => sum + (parseFloat(invoice.total) || 0),
      0
    );
    const pendingAmt = pending.reduce(
      (sum, invoice) => sum + (parseFloat(invoice.total) || 0),
      0
    );

    return { paid, pending, overdue, revenue, pendingAmt };
  }, [invoices]);

  const onboardingSteps = useMemo(() => {
    const hasBusinessInfo = user?.id
      ? !!readSetting(user.id, "business", null)?.name
      : false;

    const hasSharedBrief = briefs.some((brief) => brief.share_token);

    return [
      {
        id: "currency",
        label: "Select your currency",
        desc: "Choose your currency so invoices show the right symbol",
        done: !!currency,
        icon: Globe,
        to: "/settings",
      },
      {
        id: "profile",
        label: "Complete your profile",
        desc: "Add your name so it appears correctly across the app",
        done: !!user?.name,
        icon: User,
        to: "/settings",
      },
      {
        id: "business",
        label: "Add business info",
        desc: "This appears on invoices and client-facing documents",
        done: hasBusinessInfo,
        icon: Building2,
        to: "/settings",
      },
      {
        id: "client",
        label: "Add your first client",
        desc: "Start building your client list",
        done: clients.length > 0,
        icon: Users,
        to: "/clients/new",
      },
      {
        id: "brief",
        label: "Create a brief",
        desc: "Collect project requirements from a client",
        done: briefs.length > 0,
        icon: FileText,
        to: "/briefs/new",
      },
      {
        id: "share",
        label: "Share an intake link",
        desc: "Let clients fill the brief without signing up",
        done: hasSharedBrief,
        icon: Link2,
        to: "/briefs",
      },
      {
        id: "invoice",
        label: "Create an invoice",
        desc: "Send your first professional invoice",
        done: invoices.length > 0,
        icon: Receipt,
        to: "/invoices/new",
      },
      {
        id: "payment",
        label: "Track a payment",
        desc: "Mark an invoice as paid once payment is received",
        done: stats.paid.length > 0,
        icon: CreditCard,
        to: "/invoices",
      },
    ];
  }, [user, currency, clients, briefs, invoices, stats.paid.length]);

  const completedCount = onboardingSteps.filter((step) => step.done).length;
  const totalSteps = onboardingSteps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const allDone = completedCount === totalSteps;

  const dismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    if (user?.id) {
      writeSetting(user.id, "onboarding_dismissed", true);
    }
  }, [user?.id]);

  const recentActivity = useMemo(() => {
    const all = [
      ...invoices.map((invoice) => ({
        type: "invoice",
        id: invoice.id,
        title: `${invoice.invoice_number || "Invoice"} · ${
          invoice.client_name || "Client"
        }`,
        time: getItemTime(invoice),
        status: invoice.status,
      })),
      ...briefs.map((brief) => ({
        type: "brief",
        id: brief.id,
        title: brief.title || "Untitled Brief",
        time: getItemTime(brief),
        status: brief.status || "draft",
      })),
      ...clients.map((client) => ({
        type: "client",
        id: client.id,
        title: client.name || "Unnamed Client",
        time: getItemTime(client),
        status: null,
      })),
    ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 6);

    return all;
  }, [invoices, briefs, clients]);

  const hello = (user?.name || user?.email || "there").split(" ")[0];
  const trialStatus = getTrialStatus(user);
  const showOnboarding = !allDone && !onboardingDismissed && !loading;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Welcome back, {hello} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s what&apos;s happening across your business today.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/briefs/new")}>
            <FileText className="mr-1.5 h-4 w-4" />
            New brief
          </Button>
          <Button
            onClick={() => navigate("/invoices/new")}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New invoice
          </Button>
        </div>
      </div>

      {trialStatus && (
        <Card
          className={`border p-5 ${
            trialStatus.tone === "rose"
              ? "border-rose-200 bg-rose-50"
              : trialStatus.tone === "amber"
              ? "border-amber-200 bg-amber-50"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  trialStatus.tone === "rose"
                    ? "bg-rose-100 text-rose-700"
                    : trialStatus.tone === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {trialStatus.tone === "rose" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>

              <div>
                <p
                  className={`font-semibold ${
                    trialStatus.tone === "rose"
                      ? "text-rose-800"
                      : trialStatus.tone === "amber"
                      ? "text-amber-800"
                      : "text-blue-800"
                  }`}
                >
                  {trialStatus.label}
                </p>
                <p
                  className={`mt-0.5 text-sm ${
                    trialStatus.tone === "rose"
                      ? "text-rose-700"
                      : trialStatus.tone === "amber"
                      ? "text-amber-700"
                      : "text-blue-700"
                  }`}
                >
                  {trialStatus.description}
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate("/pricing-app")}
              className="shrink-0 bg-brand-gradient text-white hover:opacity-90"
            >
              <Crown className="mr-1.5 h-4 w-4" />
              Upgrade
            </Button>
          </div>
        </Card>
      )}

      {showOnboarding && (
        <Card className="relative overflow-hidden border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 p-6">
          <button
            onClick={dismissOnboarding}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/60"
            title="Skip guide"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-1 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold">
              Get your first client workflow running
            </h3>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            {completedCount} of {totalSteps} steps completed — finish these to
            unlock the full GigVorx workflow.
          </p>

          <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/60">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {onboardingSteps.map((step, index) => (
              <Link
                key={step.id}
                to={step.to}
                className={`flex items-center gap-3 rounded-lg border bg-white/70 p-3 transition-colors hover:bg-white ${
                  step.done ? "opacity-60" : ""
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-blue-300 bg-white text-blue-600"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      step.done ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-blue-100 pt-4">
            <p className="text-xs text-muted-foreground">
              Don&apos;t want to follow steps? You can skip this anytime.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissOnboarding}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip guide
            </Button>
          </div>
        </Card>
      )}

      {allDone && !onboardingDismissed && !loading && (
        <Card className="flex items-center justify-between gap-4 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">
                You&apos;re all set up! 🎉
              </p>
              <p className="text-xs text-emerald-700">
                Your GigVorx workspace is fully configured. Keep adding clients
                and growing your business.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={dismissOnboarding}
            className="shrink-0 text-emerald-700 hover:text-emerald-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Card
              key={item}
              className="flex h-28 items-center justify-center p-5"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            testid="stat-revenue"
            label="Revenue (paid)"
            value={formatCurrency(stats.revenue, currency)}
            sub={`${stats.paid.length} invoices paid`}
            icon={TrendingUp}
            accent="bg-emerald-600"
          />
          <StatCard
            testid="stat-pending"
            label="Pending"
            value={formatCurrency(stats.pendingAmt, currency)}
            sub={`${stats.pending.length} awaiting`}
            icon={Clock}
            accent="bg-amber-500"
          />
          <StatCard
            testid="stat-clients"
            label="Active clients"
            value={clients.length}
            sub={`${briefs.length} briefs created`}
            icon={Users}
            accent="bg-violet-600"
          />
          <StatCard
            testid="stat-overdue"
            label="Overdue"
            value={stats.overdue.length}
            sub={stats.overdue.length ? "Needs follow-up" : "All clear 🎉"}
            icon={AlertCircle}
            accent="bg-rose-600"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Recent activity</h3>
              <p className="text-xs text-muted-foreground">
                Latest invoices, briefs, and clients.
              </p>
            </div>

            <Link
              to="/invoices"
              className="flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p>
                No activity yet. Create your first brief or invoice to get
                started.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/clients/new")}
                >
                  Add client
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-white hover:bg-primary/90"
                  onClick={() => navigate("/briefs/new")}
                >
                  New brief
                </Button>
              </div>
            </div>
          ) : (
            <div className="-mx-6 divide-y">
              {recentActivity.map((activity) => (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex cursor-pointer items-center justify-between px-6 py-3 transition-colors hover:bg-muted/20"
                  onClick={() => navigate(`/${activity.type}s/${activity.id}`)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      {activity.type === "invoice" && (
                        <Receipt className="h-4 w-4" />
                      )}
                      {activity.type === "brief" && (
                        <FileText className="h-4 w-4" />
                      )}
                      {activity.type === "client" && (
                        <Users className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(activity.time)}
                      </p>
                    </div>
                  </div>

                  {activity.status && (
                    <Badge
                      variant={activity.status === "paid" ? "default" : "outline"}
                      className={`text-xs capitalize ${
                        activity.status === "paid"
                          ? "bg-emerald-600 text-white"
                          : activity.status === "overdue"
                          ? "border-rose-300 text-rose-700"
                          : activity.status === "approved"
                          ? "border-green-300 text-green-700"
                          : ""
                      }`}
                    >
                      {activity.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold">Quick start</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Build your workspace in 3 steps.
          </p>

          <div className="space-y-3">
            {[
              {
                done: clients.length > 0,
                label: "Add your first client",
                to: "/clients/new",
              },
              {
                done: briefs.length > 0,
                label: "Send your first brief",
                to: "/briefs/new",
              },
              {
                done: invoices.length > 0,
                label: "Send your first invoice",
                to: "/invoices/new",
              },
            ].map((step, index) => (
              <Link
                key={step.label}
                to={step.to}
                className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-foreground/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      step.done
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <span
                    className={`text-sm font-medium ${
                      step.done ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
            ))}
          </div>

          {!loading && stats.revenue > 0 && (
            <div className="mt-6 space-y-2 border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                This month
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Earned</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(stats.revenue, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold text-amber-600">
                  {formatCurrency(stats.pendingAmt, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Clients</span>
                <span className="font-semibold">{clients.length}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
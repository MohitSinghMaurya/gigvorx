// frontend/src/pages/Dashboard.jsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { supabase } from "@/lib/supabase";
import { readSetting, writeSetting } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, Receipt, TrendingUp, ArrowUpRight, Plus,
  CheckCircle2, Clock, AlertCircle, ArrowRight, Sparkles, Loader2,
  X, Globe, User, Building2, Link2, CreditCard, ListChecks,
} from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, accent, testid }) {
  return (
    <Card data-testid={testid} className="p-5 hover:shadow-md hover:border-foreground/20 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className="text-3xl font-bold tracking-tight mt-2">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg ${accent} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </Card>
  );
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

  useEffect(() => {
    if (user?.id) {
      fetchAll();
      const dismissed = readSetting(user.id, "onboarding_dismissed", false);
      setOnboardingDismissed(dismissed);
    }
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, briefRes, clientRes] = await Promise.all([
        supabase.from("invoices").select("id, invoice_number, client_name, status, total, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("briefs").select("id, title, status, share_token, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("clients").select("id, name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setInvoices(invRes.data || []);
      setBriefs(briefRes.data || []);
      setClients(clientRes.data || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === "paid");
    const pending = invoices.filter(i => i.status === "pending");
    const overdue = invoices.filter(i => i.status === "overdue");
    const revenue = paid.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const pendingAmt = pending.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    return { paid, pending, overdue, revenue, pendingAmt };
  }, [invoices]);

  // ─── ONBOARDING STEPS — 8 steps, each checks real data to mark itself done ───
  const onboardingSteps = useMemo(() => {
    const hasBusinessInfo = user?.id
      ? !!readSetting(user.id, "business", null)?.name
      : false;
    const hasSharedBrief = briefs.some(b => b.share_token);

    return [
      {
        id: "currency",
        label: "Select your currency",
        desc: "Choose ₹ or $ so all your invoices show the right symbol",
        done: !!currency,
        icon: Globe,
        to: "/settings",
      },
      {
        id: "profile",
        label: "Complete your profile",
        desc: "Add your name so it shows correctly across the app",
        done: !!user?.name,
        icon: User,
        to: "/settings",
      },
      {
        id: "business",
        label: "Add business info",
        desc: "This appears on every invoice you send",
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
        desc: "Let your client fill the brief without signing up",
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
        desc: "Mark an invoice as paid once you receive payment",
        done: stats.paid.length > 0,
        icon: CreditCard,
        to: "/invoices",
      },
    ];
  }, [user, currency, clients, briefs, invoices, stats.paid.length]);

  const completedCount = onboardingSteps.filter(s => s.done).length;
  const totalSteps = onboardingSteps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const allDone = completedCount === totalSteps;

  // FIXED: clean function, no require(), just writeSetting imported at top
  const dismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    if (user?.id) {
      writeSetting(user.id, "onboarding_dismissed", true);
    }
  }, [user]);

  const recentActivity = useMemo(() => {
    const all = [
      ...invoices.map(i => ({
        type: "invoice",
        id: i.id,
        title: `${i.invoice_number || "Invoice"} · ${i.client_name || "Client"}`,
        time: i.created_at,
        status: i.status,
      })),
      ...briefs.map(b => ({
        type: "brief",
        id: b.id,
        title: b.title || "Untitled Brief",
        time: b.created_at,
        status: b.status || "draft",
      })),
      ...clients.map(c => ({
        type: "client",
        id: c.id,
        title: c.name,
        time: c.created_at,
        status: null,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);
    return all;
  }, [invoices, briefs, clients]);

  const hello = (user?.name || user?.email || "there").split(" ")[0];
  const showOnboarding = !allDone && !onboardingDismissed && !loading;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Welcome back, {hello} 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your business today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/briefs/new")}>
            <FileText className="w-4 h-4 mr-1.5" />New brief
          </Button>
          <Button onClick={() => navigate("/invoices/new")} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-1.5" />New invoice
          </Button>
        </div>
      </div>

      {/* ── ONBOARDING CHECKLIST — shows until all 8 steps done or dismissed ── */}
      {showOnboarding && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-violet-50 border-blue-100 relative overflow-hidden">
          <button
            onClick={dismissOnboarding}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/60 text-muted-foreground transition-colors"
            title="Skip guide"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg">Get your first client workflow running</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {completedCount} of {totalSteps} steps completed — finish these to unlock the full GigVorx workflow.
          </p>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/60 overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onboardingSteps.map((step, i) => (
              <Link
                key={step.id}
                to={step.to}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-white/70 hover:bg-white transition-colors ${
                  step.done ? "opacity-60" : ""
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step.done ? "bg-emerald-500 text-white" : "bg-white border-2 border-blue-300 text-blue-600"
                }`}>
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${step.done ? "line-through text-muted-foreground" : ""}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{step.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-blue-100 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Don't want to follow steps? You can skip this anytime.
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

      {/* All steps complete celebration banner */}
      {allDone && !onboardingDismissed && !loading && (
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">You're all set up! 🎉</p>
              <p className="text-xs text-emerald-700">
                Your GigVorx workspace is fully configured. Keep adding clients and growing your business.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissOnboarding}
            className="text-emerald-700 hover:text-emerald-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </Card>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-5 flex items-center justify-center h-28">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            sub={`${briefs.length} briefs sent`}
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

      {/* Two-col content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-lg">Recent activity</h3>
              <p className="text-xs text-muted-foreground">Latest invoices, briefs and clients.</p>
            </div>
            <Link to="/invoices" className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No activity yet. Create your first brief or invoice to get started.</p>
              <div className="mt-4 flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => navigate("/clients/new")}>Add client</Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={() => navigate("/briefs/new")}>New brief</Button>
              </div>
            </div>
          ) : (
            <div className="divide-y -mx-6">
              {recentActivity.map(a => (
                <div
                  key={`${a.type}-${a.id}`}
                  className="px-6 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/${a.type}s/${a.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      {a.type === "invoice" && <Receipt className="w-4 h-4" />}
                      {a.type === "brief" && <FileText className="w-4 h-4" />}
                      {a.type === "client" && <Users className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(a.time)}</p>
                    </div>
                  </div>
                  {a.status && (
                    <Badge
                      variant={a.status === "paid" ? "default" : "outline"}
                      className={`text-xs capitalize ${
                        a.status === "paid" ? "bg-emerald-600 text-white" :
                        a.status === "overdue" ? "border-rose-300 text-rose-700" :
                        a.status === "approved" ? "border-green-300 text-green-700" : ""
                      }`}
                    >
                      {a.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg">Quick start</h3>
          <p className="text-xs text-muted-foreground mb-4">Build your workspace in 3 steps.</p>
          <div className="space-y-3">
            {[
              { done: clients.length > 0, label: "Add your first client", to: "/clients/new" },
              { done: briefs.length > 0, label: "Send your first brief", to: "/briefs/new" },
              { done: invoices.length > 0, label: "Send your first invoice", to: "/invoices/new" },
            ].map((s, i) => (
              <Link
                key={s.label}
                to={s.to}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-foreground/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${s.done ? "line-through text-muted-foreground" : ""}`}>
                    {s.label}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
            ))}
          </div>

          {/* Revenue summary */}
          {!loading && stats.revenue > 0 && (
            <div className="mt-6 pt-4 border-t space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This month</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Earned</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(stats.revenue, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold text-amber-600">{formatCurrency(stats.pendingAmt, currency)}</span>
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
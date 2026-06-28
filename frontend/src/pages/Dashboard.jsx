import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, Receipt, TrendingUp, ArrowUpRight, Plus,
  CheckCircle2, Clock, AlertCircle, ArrowRight, Sparkles, Loader2,
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

  useEffect(() => {
    if (user?.id) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, briefRes, clientRes] = await Promise.all([
        supabase.from("invoices").select("id, invoice_number, client_name, status, total, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("briefs").select("id, title, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
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

  const hello = (user?.user_metadata?.name || user?.email || "there").split(" ")[0];

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
          <Button onClick={() => navigate("/invoices/new")} className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
            <Plus className="w-4 h-4 mr-1.5" />New invoice
          </Button>
        </div>
      </div>

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
                <Button size="sm" className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white" onClick={() => navigate("/briefs/new")}>New brief</Button>
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
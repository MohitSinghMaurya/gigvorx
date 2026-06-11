import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCollection } from "@/lib/useCollection";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, Receipt, TrendingUp, ArrowUpRight, Plus,
  CheckCircle2, Clock, AlertCircle, ArrowRight, Sparkles,
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
  const { items: clients } = useCollection("clients");
  const { items: briefs } = useCollection("briefs");
  const { items: invoices } = useCollection("invoices");
  const navigate = useNavigate();

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
      ...invoices.map(i => ({ type: "invoice", id: i.id, title: `${i.invoiceNumber || "Invoice"} · ${i.clientName || "Client"}`, time: i.createdAt, status: i.status })),
      ...briefs.map(b => ({ type: "brief", id: b.id, title: b.title || "Untitled brief", time: b.createdAt, status: b.status || "draft" })),
      ...clients.map(c => ({ type: "client", id: c.id, title: c.name, time: c.createdAt, status: null })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);
    return all;
  }, [invoices, briefs, clients]);

  const hello = (user?.name || "there").split(" ")[0];

  return (
    <div className="space-y-8">
      {/* greeting + quick actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Welcome back, {hello} 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your business today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/briefs/new")} data-testid="quick-new-brief"><FileText className="w-4 h-4 mr-1.5" />New brief</Button>
          <Button onClick={() => navigate("/invoices/new")} data-testid="quick-new-invoice" className="bg-foreground text-background hover:bg-foreground/90"><Plus className="w-4 h-4 mr-1.5" />New invoice</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard testid="stat-revenue" label="Revenue (paid)" value={formatCurrency(stats.revenue)} sub={`${stats.paid.length} invoices paid`} icon={TrendingUp} accent="bg-emerald-600" />
        <StatCard testid="stat-pending" label="Pending" value={formatCurrency(stats.pendingAmt)} sub={`${stats.pending.length} awaiting`} icon={Clock} accent="bg-amber-500" />
        <StatCard testid="stat-clients" label="Active clients" value={clients.length} sub={`${briefs.length} briefs sent`} icon={Users} accent="bg-violet-600" />
        <StatCard testid="stat-overdue" label="Overdue" value={stats.overdue.length} sub={stats.overdue.length ? "Needs follow-up" : "All clear 🎉"} icon={AlertCircle} accent="bg-rose-600" />
      </div>

      {/* Two-col content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-lg">Recent activity</h3>
              <p className="text-xs text-muted-foreground">Latest invoices, briefs and clients.</p>
            </div>
            <Link to="/invoices" className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No activity yet. Create your first brief or invoice to get started.</p>
              <div className="mt-4 flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => navigate("/clients/new")}>Add client</Button>
                <Button size="sm" className="bg-foreground text-background" onClick={() => navigate("/briefs/new")}>New brief</Button>
              </div>
            </div>
          ) : (
            <div className="divide-y -mx-6">
              {recentActivity.map(a => (
                <div key={`${a.type}-${a.id}`} className="px-6 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/${a.type}s/${a.id}`)}>
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
                    <Badge variant={a.status === "paid" ? "default" : "outline"} className={`text-xs ${a.status === "paid" ? "bg-emerald-600" : a.status === "overdue" ? "border-rose-300 text-rose-700" : ""}`}>{a.status}</Badge>
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
              { done: clients.length > 0, label: "Add your first client", to: "/clients/new", testid: "qs-add-client" },
              { done: briefs.length > 0, label: "Send your first brief", to: "/briefs/new", testid: "qs-add-brief" },
              { done: invoices.length > 0, label: "Send your first invoice", to: "/invoices/new", testid: "qs-add-invoice" },
            ].map((s, i) => (
              <Link key={s.label} to={s.to} data-testid={s.testid} className="flex items-center justify-between p-3 rounded-lg border hover:border-foreground/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.label}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

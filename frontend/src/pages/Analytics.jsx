import { useMemo } from "react";
import { useCollection } from "@/lib/useCollection";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, FileText, Receipt, CheckCircle2, Clock, AlertCircle, Percent } from "lucide-react";

function Stat({ label, value, sub, icon: Icon, accent }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight mt-2">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg ${accent} flex items-center justify-center`}><Icon className="w-4 h-4 text-white" /></div>
      </div>
    </Card>
  );
}

function Bar({ value, max, color }) {
  const pct = max ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full ${color}`} style={{ width: pct + "%" }} /></div>;
}

export default function Analytics() {
  const { items: clients } = useCollection("clients");
  const { items: briefs } = useCollection("briefs");
  const { items: invoices } = useCollection("invoices");

  const data = useMemo(() => {
    const paid = invoices.filter(i => i.status === "paid");
    const pending = invoices.filter(i => i.status === "pending");
    const overdue = invoices.filter(i => i.status === "overdue");
    const draft = invoices.filter(i => i.status === "draft");
    const revenue = paid.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const pendingAmt = pending.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const overdueAmt = overdue.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const sent = briefs.filter(b => b.status === "sent" || b.status === "approved").length;
    const approved = briefs.filter(b => b.status === "approved").length;
    const conversion = briefs.length ? Math.round((approved / briefs.length) * 100) : 0;

    // monthly revenue (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString("en-US", { month: "short" });
      const total = paid.filter(p => {
        const pd = new Date(p.paidAt || p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).reduce((s, x) => s + (parseFloat(x.total) || 0), 0);
      months.push({ key, total });
    }
    const monthMax = Math.max(1, ...months.map(m => m.total));

    return { paid, pending, overdue, draft, revenue, pendingAmt, overdueAmt, sent, approved, conversion, months, monthMax };
  }, [invoices, briefs]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Clear, no-fluff metrics for your freelance business.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Revenue" value={formatCurrency(data.revenue)} sub={`${data.paid.length} paid`} icon={TrendingUp} accent="bg-emerald-600" />
        <Stat label="Pending" value={formatCurrency(data.pendingAmt)} sub={`${data.pending.length} awaiting`} icon={Clock} accent="bg-amber-500" />
        <Stat label="Overdue" value={formatCurrency(data.overdueAmt)} sub={`${data.overdue.length} overdue`} icon={AlertCircle} accent="bg-rose-600" />
        <Stat label="Conversion" value={data.conversion + "%"} sub={`${data.approved}/${briefs.length || 0} briefs approved`} icon={Percent} accent="bg-violet-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Clients" value={clients.length} sub="All time" icon={Users} accent="bg-sky-600" />
        <Stat label="Invoices" value={invoices.length} sub={`${data.draft.length} drafts`} icon={Receipt} accent="bg-indigo-600" />
        <Stat label="Briefs" value={briefs.length} sub={`${data.sent} sent`} icon={FileText} accent="bg-fuchsia-600" />
        <Stat label="Briefs approved" value={data.approved} sub="Closed deals" icon={CheckCircle2} accent="bg-emerald-700" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Revenue · last 6 months</h3>
              <p className="text-xs text-muted-foreground">Based on invoices marked as paid.</p>
            </div>
            <p className="text-2xl font-bold tracking-tight">{formatCurrency(data.revenue)}</p>
          </div>
          <div className="flex items-end gap-3 h-48">
            {data.months.map(m => {
              const h = data.monthMax ? Math.max(4, (m.total / data.monthMax) * 100) : 4;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-2" data-testid={`bar-${m.key}`}>
                  <div className="text-[10px] font-mono font-semibold text-muted-foreground">{m.total > 0 ? Math.round(m.total / 1000) + "k" : ""}</div>
                  <div className="w-full bg-gradient-to-t from-violet-500 to-indigo-500 rounded-t-md transition-all" style={{ height: h + "%" }} />
                  <div className="text-xs text-muted-foreground">{m.key}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg">Invoice status</h3>
          <p className="text-xs text-muted-foreground mb-5">Current breakdown.</p>
          <div className="space-y-4">
            {[
              { label: "Paid", val: data.paid.length, color: "bg-emerald-500", total: invoices.length },
              { label: "Pending", val: data.pending.length, color: "bg-amber-500", total: invoices.length },
              { label: "Overdue", val: data.overdue.length, color: "bg-rose-500", total: invoices.length },
              { label: "Draft", val: data.draft.length, color: "bg-muted-foreground/40", total: invoices.length },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-xs font-medium mb-1.5"><span>{row.label}</span><span className="text-muted-foreground">{row.val}</span></div>
                <Bar value={row.val} max={Math.max(1, row.total)} color={row.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

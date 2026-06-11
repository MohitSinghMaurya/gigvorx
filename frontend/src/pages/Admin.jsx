import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { readGlobal } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, daysFromNow, formatCurrency } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { Users, UserCheck, UserX, CreditCard, FileText, Receipt, BarChart3 } from "lucide-react";

function Stat({ label, value, sub, icon: Icon, accent, testid }) {
  return (
    <Card className="p-5" data-testid={testid}>
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

export default function Admin() {
  const { user } = useAuth();
  const users = readGlobal("users", []);

  const stats = useMemo(() => {
    const trials = users.filter(u => u.plan === "trial");
    const paid = users.filter(u => u.plan && u.plan !== "trial");
    const expired = trials.filter(u => u.trialEndsAt && daysFromNow(u.trialEndsAt) <= 0);
    const planCounts = PLANS.reduce((acc, p) => { acc[p.id] = users.filter(u => u.plan === p.id).length; return acc; }, {});
    const revenue = PLANS.reduce((s, p) => s + (planCounts[p.id] || 0) * p.price, 0);

    // signups by month (last 6)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString("en-US", { month: "short" });
      const count = users.filter(u => {
        const cd = new Date(u.createdAt);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ key, count });
    }
    const monthMax = Math.max(1, ...months.map(m => m.count));

    // Aggregate feature usage from all users' localStorage
    // Iterate localStorage keys directly so we pick up any user data, not only seeded users.
    let totalBriefs = 0, totalInvoices = 0, totalClients = 0, totalLeads = 0;
    let usersWithLeads = 0;
    const sourceCounts = {};
    const seen = new Set();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("gv_v1:") || key.startsWith("gv_v1:global:")) continue;
        const m = key.match(/^gv_v1:([^:]+):(.+)$/);
        if (!m) continue;
        const [, userId, resource] = m;
        seen.add(userId);
        const list = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(list)) continue;
        if (resource === "briefs") totalBriefs += list.length;
        else if (resource === "invoices") totalInvoices += list.length;
        else if (resource === "clients") {
          totalClients += list.length;
          const leads = list.filter(c => c && c.status); // any contact with a pipeline status counts
          totalLeads += leads.length;
          if (leads.length > 0) usersWithLeads += 1;
          leads.forEach(l => { if (l.leadSource) sourceCounts[l.leadSource] = (sourceCounts[l.leadSource] || 0) + 1; });
        }
      }
    } catch {}
    const userCountForAvg = Math.max(users.length, seen.size, 1);
    const avgLeadsPerUser = Math.round((totalLeads / userCountForAvg) * 10) / 10;
    const topSources = Object.entries(sourceCounts).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    return { trials, paid, expired, planCounts, revenue, months, monthMax, totalBriefs, totalInvoices, totalClients, totalLeads, usersWithLeads, avgLeadsPerUser, topSources };
  }, [users]);

  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Platform-wide stats and user management.</p>
        </div>
        <Badge variant="outline" className="border-violet-300 text-violet-700"><BarChart3 className="w-3 h-3 mr-1.5" />Superuser</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat testid="admin-total-users" label="Total users" value={users.length} sub="All accounts" icon={Users} accent="bg-foreground" />
        <Stat testid="admin-trials" label="Active trials" value={stats.trials.length - stats.expired.length} sub={`${stats.expired.length} expired`} icon={UserCheck} accent="bg-amber-500" />
        <Stat testid="admin-paid" label="Paid users" value={stats.paid.length} sub={`${PLANS.length} plans`} icon={CreditCard} accent="bg-emerald-600" />
        <Stat testid="admin-revenue" label="Revenue (MRR)" value={formatCurrency(stats.revenue)} sub="Placeholder · Razorpay coming soon" icon={BarChart3} accent="bg-brand-gradient" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Briefs created" value={stats.totalBriefs} sub="Across all users" icon={FileText} accent="bg-fuchsia-600" />
        <Stat label="Invoices created" value={stats.totalInvoices} sub="Across all users" icon={Receipt} accent="bg-indigo-600" />
        <Stat label="Clients tracked" value={stats.totalClients} sub="Across all users" icon={Users} accent="bg-sky-600" />
      </div>

      {/* Lead pipeline platform metrics */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Lead pipeline (platform-wide)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat testid="admin-leads-users" label="Users using pipeline" value={stats.usersWithLeads} sub={`${users.length ? Math.round(stats.usersWithLeads/users.length*100) : 0}% of all users`} icon={Users} accent="bg-blue-600" />
          <Stat testid="admin-total-leads" label="Total leads tracked" value={stats.totalLeads} sub="Across all users" icon={Users} accent="bg-sky-600" />
          <Stat testid="admin-avg-leads" label="Avg leads per user" value={stats.avgLeadsPerUser} sub="Placeholder · all-time avg" icon={BarChart3} accent="bg-cyan-600" />
        </div>
        {stats.topSources.length > 0 && (
          <Card className="p-6 mt-4">
            <h3 className="font-bold text-lg mb-1">Most used lead sources</h3>
            <p className="text-xs text-muted-foreground mb-4">Top 5 channels driving leads across the platform.</p>
            <div className="space-y-3">
              {stats.topSources.map(s => {
                return (
                  <div key={s.id}>
                    <div className="flex justify-between text-xs font-medium mb-1.5"><span className="capitalize">{s.id.replace(/_/g, " ")}</span><span className="text-muted-foreground">{s.count} leads</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-sky-500" style={{ width: Math.max(2, (s.count / stats.topSources[0].count) * 100) + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-bold text-lg mb-1">Signups · last 6 months</h3>
          <p className="text-xs text-muted-foreground mb-6">New account creations.</p>
          <div className="flex items-end gap-3 h-44">
            {stats.months.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-[10px] font-mono font-semibold text-muted-foreground">{m.count}</div>
                <div className="w-full bg-foreground rounded-t-md" style={{ height: `${(m.count / stats.monthMax) * 100}%`, minHeight: 4 }} />
                <div className="text-xs text-muted-foreground">{m.key}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-1">Plan distribution</h3>
          <p className="text-xs text-muted-foreground mb-5">Active subscriptions by tier.</p>
          <div className="space-y-3">
            {[{ id: "trial", name: "Trial" }, ...PLANS].map(p => {
              const count = p.id === "trial" ? stats.trials.length : (stats.planCounts[p.id] || 0);
              const pct = users.length ? Math.round((count / users.length) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span>{p.name}</span><span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${p.id === "trial" ? "bg-amber-400" : p.id === "pro" ? "bg-foreground" : "bg-violet-500"}`} style={{ width: pct + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold text-lg">All users</h3>
          <p className="text-xs text-muted-foreground">{users.length} total accounts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left p-4 font-semibold">User</th>
                <th className="text-left p-4 font-semibold">Plan</th>
                <th className="text-left p-4 font-semibold">Trial ends</th>
                <th className="text-left p-4 font-semibold">Created</th>
                <th className="text-left p-4 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => {
                const expired = u.trialEndsAt && daysFromNow(u.trialEndsAt) <= 0;
                return (
                  <tr key={u.id} className="hover:bg-muted/20" data-testid={`admin-user-${u.id}`}>
                    <td className="p-4">
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="p-4"><Badge variant="outline" className="capitalize">{u.plan}</Badge></td>
                    <td className="p-4 text-muted-foreground">
                      {u.trialEndsAt ? (
                        <span className={expired ? "text-rose-600" : ""}>{expired ? "Expired" : formatDate(u.trialEndsAt)}</span>
                      ) : "—"}
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="p-4">{u.role === "admin" ? <Badge className="bg-violet-600">Admin</Badge> : <span className="text-muted-foreground text-xs">User</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

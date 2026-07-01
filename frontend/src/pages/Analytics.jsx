import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readGlobal } from "@/lib/storage";
import { formatCurrency } from "@/lib/format";
import { useCurrency } from "@/lib/CurrencyContext";
import { LEAD_SOURCES } from "@/lib/pipeline";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Percent,
  Target,
  PartyPopper,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";

function Stat({ label, value, sub, icon: Icon, accent }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </Card>
  );
}

function Bar({ value, max, color }) {
  const pct = max ? Math.max(2, Math.round((value / max) * 100)) : 0;

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function getCreatedAt(item) {
  return item?.created_at || item?.createdAt;
}

function getInvoiceTotal(invoice) {
  return parseFloat(invoice?.total) || 0;
}

function isLead(contact) {
  return contact?.is_lead === true || contact?.isLead === true;
}

export default function Analytics() {
  const { user } = useAuth();
  const { currency } = useCurrency();

  const [contacts, setContacts] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingState, setLoadingState] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;

    setLoadingState(true);

    try {
      if (isSupabaseEnabled) {
        const [clientsRes, briefsRes, invoicesRes] = await Promise.all([
          supabase.from("clients").select("*").eq("user_id", user.id),
          supabase.from("briefs").select("*").eq("user_id", user.id),
          supabase.from("invoices").select("*").eq("user_id", user.id),
        ]);

        setContacts(clientsRes.data || []);
        setBriefs(briefsRes.data || []);
        setInvoices(invoicesRes.data || []);
      } else {
        setContacts(
          readGlobal("clients", []).filter(
            (item) => item?.user_id === user.id || item?.userId === user.id
          )
        );

        setBriefs(
          readGlobal("briefs", []).filter(
            (item) => item?.user_id === user.id || item?.userId === user.id
          )
        );

        setInvoices(
          readGlobal("invoices", []).filter(
            (item) => item?.user_id === user.id || item?.userId === user.id
          )
        );
      }
    } catch (err) {
      console.error("Analytics fetch failed:", err);
      setContacts([]);
      setBriefs([]);
      setInvoices([]);
    } finally {
      setLoadingState(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const data = useMemo(() => {
    const paid = invoices.filter((invoice) => invoice.status === "paid");
    const pending = invoices.filter((invoice) => invoice.status === "pending");
    const overdue = invoices.filter((invoice) => invoice.status === "overdue");
    const draft = invoices.filter(
      (invoice) => !invoice.status || invoice.status === "draft"
    );

    const revenue = paid.reduce(
      (sum, invoice) => sum + getInvoiceTotal(invoice),
      0
    );
    const pendingAmt = pending.reduce(
      (sum, invoice) => sum + getInvoiceTotal(invoice),
      0
    );
    const overdueAmt = overdue.reduce(
      (sum, invoice) => sum + getInvoiceTotal(invoice),
      0
    );

    const leads = contacts.filter(isLead);
    const activeClients = contacts.filter((contact) => !isLead(contact));

    const won = leads.filter((contact) => contact.status === "won");
    const lost = leads.filter((contact) => contact.status === "lost");
    const open = leads.filter(
      (contact) => contact.status && !["won", "lost"].includes(contact.status)
    );

    const leadConversion = leads.length
      ? Math.round((won.length / leads.length) * 100)
      : 0;

    const wonRevenue = won.reduce(
      (sum, lead) =>
        sum + (parseFloat(lead.estimatedValue || lead.estimated_value) || 0),
      0
    );

    const bySource = LEAD_SOURCES.map((source) => ({
      ...source,
      count: leads.filter(
        (lead) =>
          lead.leadSource === source.id || lead.lead_source === source.id
      ).length,
    })).sort((a, b) => b.count - a.count);

    const srcMax = Math.max(1, ...bySource.map((source) => source.count));

    const approved = briefs.filter((brief) => brief.status === "approved").length;
    const sent = briefs.filter(
      (brief) => brief.status === "sent" || brief.status === "approved"
    ).length;

    const briefConv = briefs.length
      ? Math.round((approved / briefs.length) * 100)
      : 0;

    const months = [];

    for (let index = 5; index >= 0; index--) {
      const date = new Date();
      date.setMonth(date.getMonth() - index);

      const key = date.toLocaleString("en-US", { month: "short" });

      const total = paid
        .filter((invoice) => {
          const paidDate = new Date(
            invoice.paid_at || invoice.paidAt || getCreatedAt(invoice)
          );

          return (
            paidDate.getMonth() === date.getMonth() &&
            paidDate.getFullYear() === date.getFullYear()
          );
        })
        .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);

      months.push({ key, total });
    }

    const monthMax = Math.max(1, ...months.map((month) => month.total));

    return {
      paid,
      pending,
      overdue,
      draft,
      revenue,
      pendingAmt,
      overdueAmt,
      allLeads: leads,
      activeClients,
      won,
      lost,
      open,
      leadConversion,
      wonRevenue,
      bySource,
      srcMax,
      sent,
      approved,
      briefConv,
      months,
      monthMax,
    };
  }, [invoices, briefs, contacts]);

  if (loadingState) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">Loading your data...</p>
        </div>

        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="animate-pulse p-5">
              <div className="mb-3 h-4 w-2/3 rounded bg-muted" />
              <div className="h-8 w-1/2 rounded bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track revenue, leads, invoices, briefs, and conversion.
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Revenue
        </p>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Revenue"
            value={formatCurrency(data.revenue, currency)}
            sub={`${data.paid.length} paid`}
            icon={TrendingUp}
            accent="bg-emerald-600"
          />

          <Stat
            label="Pending"
            value={formatCurrency(data.pendingAmt, currency)}
            sub={`${data.pending.length} awaiting`}
            icon={Clock}
            accent="bg-amber-500"
          />

          <Stat
            label="Overdue"
            value={formatCurrency(data.overdueAmt, currency)}
            sub={`${data.overdue.length} overdue`}
            icon={AlertCircle}
            accent="bg-rose-600"
          />

          <Stat
            label="Won deals value"
            value={formatCurrency(data.wonRevenue, currency)}
            sub={`${data.won.length} won leads`}
            icon={PartyPopper}
            accent="bg-brand-gradient"
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Lead pipeline
        </p>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Total leads"
            value={data.allLeads.length}
            sub={`${data.open.length} in pipeline`}
            icon={Target}
            accent="bg-sky-600"
          />

          <Stat
            label="Won leads"
            value={data.won.length}
            sub="Converted opportunities"
            icon={CheckCircle2}
            accent="bg-emerald-600"
          />

          <Stat
            label="Lost leads"
            value={data.lost.length}
            sub="Closed-lost"
            icon={AlertCircle}
            accent="bg-rose-500"
          />

          <Stat
            label="Conversion rate"
            value={`${data.leadConversion}%`}
            sub="Lead → Won"
            icon={ArrowRightLeft}
            accent="bg-indigo-600"
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Activity
        </p>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Invoices"
            value={invoices.length}
            sub={`${data.draft.length} drafts`}
            icon={Receipt}
            accent="bg-blue-600"
          />

          <Stat
            label="Briefs"
            value={briefs.length}
            sub={`${data.sent} sent · ${data.briefConv}% approved`}
            icon={FileText}
            accent="bg-violet-600"
          />

          <Stat
            label="Clients"
            value={data.activeClients.length}
            sub="Active client records"
            icon={Users}
            accent="bg-cyan-600"
          />

          <Stat
            label="Brief conversion"
            value={`${data.briefConv}%`}
            sub={`${data.approved} approved`}
            icon={Percent}
            accent="bg-fuchsia-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h3 className="text-lg font-bold">Revenue · last 6 months</h3>
              <p className="text-xs text-muted-foreground">
                Based on invoices marked as paid.
              </p>
            </div>

            <p className="text-2xl font-bold tracking-tight">
              {formatCurrency(data.revenue, currency)}
            </p>
          </div>

          <div className="flex h-48 items-end gap-3">
            {data.months.map((month) => {
              const height = data.monthMax
                ? Math.max(4, (month.total / data.monthMax) * 100)
                : 4;

              return (
                <div
                  key={month.key}
                  className="flex flex-1 flex-col items-center gap-2"
                  data-testid={`bar-${month.key}`}
                >
                  <div className="font-mono text-[10px] font-semibold text-muted-foreground">
                    {month.total > 0 ? `${Math.round(month.total / 1000)}k` : ""}
                  </div>

                  <div
                    className="w-full rounded-t-md bg-brand-gradient transition-all"
                    style={{ height: `${height}%` }}
                  />

                  <div className="text-xs text-muted-foreground">
                    {month.key}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold">Invoice status</h3>
          <p className="mb-5 text-xs text-muted-foreground">
            Current breakdown.
          </p>

          <div className="space-y-4">
            {[
              { label: "Paid", value: data.paid.length, color: "bg-emerald-500" },
              {
                label: "Pending",
                value: data.pending.length,
                color: "bg-amber-500",
              },
              { label: "Overdue", value: data.overdue.length, color: "bg-rose-500" },
              {
                label: "Draft",
                value: data.draft.length,
                color: "bg-muted-foreground/40",
              },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex justify-between text-xs font-medium">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">{row.value}</span>
                </div>

                <Bar
                  value={row.value}
                  max={Math.max(1, invoices.length)}
                  color={row.color}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold">Leads by source</h3>
        <p className="mb-5 text-xs text-muted-foreground">
          Where your pipeline is coming from.
        </p>

        <div className="space-y-3">
          {data.bySource.map((source) => (
            <div key={source.id} data-testid={`source-${source.id}`}>
              <div className="mb-1.5 flex justify-between text-xs font-medium">
                <span>{source.label}</span>
                <span className="text-muted-foreground">
                  {source.count} {source.count === 1 ? "lead" : "leads"}
                </span>
              </div>

              <Bar
                value={source.count}
                max={data.srcMax}
                color="bg-gradient-to-r from-blue-500 to-sky-500"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
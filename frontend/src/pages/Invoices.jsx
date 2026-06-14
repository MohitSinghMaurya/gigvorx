import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollection } from "@/lib/useCollection";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCurrency } from "@/contexts/CurrencyContext";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Receipt, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-rose-100 text-rose-700 border-rose-200",
  draft: "bg-muted text-muted-foreground border-border",
};

export default function Invoices() {
  const { currency } = useCurrency();
  const { items, remove } = useCollection("invoices");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const { canAddInvoice, limits, usage, isPro } = usePlanLimits();

  const filtered = useMemo(() => items.filter(i => {
    const matchesQ = !query || i.invoiceNumber?.toLowerCase().includes(query.toLowerCase()) || i.clientName?.toLowerCase().includes(query.toLowerCase());
    const matchesS = filter === "all" || i.status === filter;
    return matchesQ && matchesS;
  }), [items, query, filter]);

  const handleNewInvoice = () => {
    if (!canAddInvoice) {
      toast.error(`You've used all ${limits.invoices} invoices this month. Upgrade to Pro for unlimited invoices.`);
      navigate("/pricing-app");
      return;
    }
    navigate("/invoices/new");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Track every invoice from draft to paid.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Monthly usage indicator */}
          {!isPro && (
            <div className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg border bg-muted/30">
              <span className={usage.invoices >= limits.invoices ? "text-rose-600 font-semibold" : ""}>
                {usage.invoices}/{limits.invoices} invoices this month
              </span>
            </div>
          )}
          <Button
            onClick={handleNewInvoice}
            data-testid="new-invoice-btn"
            className="bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />New invoice
          </Button>
        </div>
      </div>

      {/* Warning when close to limit */}
      {!isPro && usage.invoices >= limits.invoices - 2 && usage.invoices < limits.invoices && (
        <div className="px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center justify-between">
          <span>You have <span className="font-semibold">{limits.invoices - usage.invoices} invoice{limits.invoices - usage.invoices !== 1 ? "s" : ""}</span> left this month.</span>
          <Button size="sm" variant="outline" onClick={() => navigate("/pricing-app")} className="border-amber-300 text-amber-700 hover:bg-amber-100 h-7 text-xs">Upgrade</Button>
        </div>
      )}

      {/* Red banner when limit reached */}
      {!isPro && usage.invoices >= limits.invoices && (
        <div className="px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <span className="font-semibold">Monthly invoice limit reached. Upgrade to Pro for unlimited invoices.</span>
          <Button size="sm" onClick={() => navigate("/pricing-app")} className="bg-rose-600 text-white hover:bg-rose-700 h-7 text-xs ml-3">Upgrade Now</Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="invoice-search" placeholder="Search invoices…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          {["all", "draft", "pending", "paid", "overdue"].map(s => (
            <button
              key={s}
              data-testid={`filter-${s}`}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >{s}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">{items.length === 0 ? "No invoices yet" : "No matches"}</p>
          <p className="text-sm text-muted-foreground mb-5">{items.length === 0 ? "Send your first professional invoice in under a minute." : "Try a different filter or search."}</p>
          {items.length === 0 && (
            <Button onClick={handleNewInvoice} data-testid="empty-new-invoice" className="bg-brand-gradient text-white">
              <Plus className="w-4 h-4 mr-1.5" />Create invoice
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-semibold">Invoice #</th>
                  <th className="text-left p-4 font-semibold">Client</th>
                  <th className="text-left p-4 font-semibold">Issue</th>
                  <th className="text-left p-4 font-semibold">Due</th>
                  <th className="text-right p-4 font-semibold">Amount</th>
                  <th className="text-center p-4 font-semibold">Status</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)} data-testid={`invoice-row-${inv.id}`}>
                    <td className="p-4 font-mono font-semibold">{inv.invoiceNumber}</td>
                    <td className="p-4">{inv.clientName || "—"}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(inv.issueDate || inv.createdAt)}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="p-4 text-right font-semibold">{formatCurrency(inv.total || 0, currency)}</td>
                    <td className="p-4 text-center">
                      <Badge variant="outline" className={`capitalize ${STATUS_STYLES[inv.status || "draft"]}`}>{inv.status || "draft"}</Badge>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/invoices/${inv.id}`)} data-testid={`edit-invoice-${inv.id}`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="hover:text-destructive" data-testid={`delete-invoice-${inv.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => { remove(inv.id); toast.success("Invoice deleted"); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
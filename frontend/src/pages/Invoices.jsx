import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCurrency } from "@/lib/CurrencyContext";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Receipt, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-rose-100 text-rose-700 border-rose-200",
  draft: "bg-muted text-muted-foreground border-border",
};

export default function Invoices() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const { canAddInvoice, limits, usage, isPro } = usePlanLimits();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (user?.id) fetchInvoices();
  }, [user]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invId) => {
    setDeleting(invId);
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invId)
        .eq("user_id", user.id);
      if (error) throw error;
      setInvoices(prev => prev.filter(i => i.id !== invId));
      toast.success("Invoice deleted");
    } catch (err) {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(null);
    }
  };

  const handleNewInvoice = () => {
    if (!canAddInvoice) {
      toast.error(`You've used all ${limits.invoices} invoices this month. Upgrade to Pro for unlimited invoices.`);
      navigate("/pricing-app");
      return;
    }
    navigate("/invoices/new");
  };

  const filtered = useMemo(() => invoices.filter(i => {
    const matchesQ = !query ||
      i.invoice_number?.toLowerCase().includes(query.toLowerCase()) ||
      i.client_name?.toLowerCase().includes(query.toLowerCase());
    const matchesS = filter === "all" || i.status === filter;
    return matchesQ && matchesS;
  }), [invoices, query, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Track every invoice from draft to paid.</p>
        </div>
        <div className="flex items-center gap-3">
          {!isPro && (
            <div className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg border bg-muted/30">
              <span className={usage.invoices >= limits.invoices ? "text-rose-600 font-semibold" : ""}>
                {usage.invoices}/{limits.invoices} invoices this month
              </span>
            </div>
          )}
          <Button
            onClick={handleNewInvoice}
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />New Invoice
          </Button>
        </div>
      </div>

      {/* Limit warnings */}
      {!isPro && usage.invoices >= limits.invoices - 2 && usage.invoices < limits.invoices && (
        <div className="px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center justify-between">
          <span>You have <span className="font-semibold">{limits.invoices - usage.invoices} invoice{limits.invoices - usage.invoices !== 1 ? "s" : ""}</span> left this month.</span>
          <Button size="sm" variant="outline" onClick={() => navigate("/pricing-app")} className="border-amber-300 text-amber-700 hover:bg-amber-100 h-7 text-xs">Upgrade</Button>
        </div>
      )}
      {!isPro && usage.invoices >= limits.invoices && (
        <div className="px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <span className="font-semibold">Monthly invoice limit reached. Upgrade to Pro for unlimited invoices.</span>
          <Button size="sm" onClick={() => navigate("/pricing-app")} className="bg-rose-600 text-white hover:bg-rose-700 h-7 text-xs ml-3">Upgrade Now</Button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice # or client..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          {["all", "draft", "pending", "paid", "overdue"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                filter === s
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">
            {invoices.length === 0 ? "No invoices yet" : "No matches"}
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            {invoices.length === 0
              ? "Send your first professional invoice in under a minute."
              : "Try a different filter or search term."}
          </p>
          {invoices.length === 0 && (
            <Button onClick={handleNewInvoice} className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
              <Plus className="w-4 h-4 mr-1.5" />Create Invoice
            </Button>
          )}
        </Card>
      )}

      {/* Invoices table */}
      {!loading && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-semibold">Invoice #</th>
                  <th className="text-left p-4 font-semibold">Client</th>
                  <th className="text-left p-4 font-semibold">Issue Date</th>
                  <th className="text-left p-4 font-semibold">Due Date</th>
                  <th className="text-right p-4 font-semibold">Amount</th>
                  <th className="text-center p-4 font-semibold">Status</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(inv => (
                  <tr
                    key={inv.id}
                    className="hover:bg-muted/20 cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="p-4 font-mono font-semibold">
                      {inv.invoice_number || "—"}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{inv.client_name || "—"}</p>
                        {inv.client_gst && (
                          <p className="text-xs text-muted-foreground">GST: {inv.client_gst}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(inv.issue_date || inv.created_at)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {formatCurrency(inv.total || 0, currency)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge
                        variant="outline"
                        className={`capitalize ${STATUS_STYLES[inv.status || "draft"]}`}
                      >
                        {inv.status || "draft"}
                      </Badge>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="hover:text-destructive"
                              title="Delete"
                            >
                              {deleting === inv.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete invoice {inv.invoice_number} and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(inv.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
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

          {/* Summary footer */}
          <div className="border-t px-4 py-3 bg-muted/20 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-4 text-muted-foreground">
              <span>
                Paid: <span className="font-semibold text-emerald-600">
                  {formatCurrency(
                    filtered.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0),
                    currency
                  )}
                </span>
              </span>
              <span>
                Pending: <span className="font-semibold text-amber-600">
                  {formatCurrency(
                    filtered.filter(i => i.status === "pending").reduce((s, i) => s + (i.total || 0), 0),
                    currency
                  )}
                </span>
              </span>
              <span>
                Total: <span className="font-semibold">
                  {formatCurrency(
                    filtered.reduce((s, i) => s + (i.total || 0), 0),
                    currency
                  )}
                </span>
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
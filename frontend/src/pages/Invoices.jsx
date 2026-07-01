import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readGlobal, writeGlobal } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCurrency } from "@/lib/CurrencyContext";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Receipt,
  Edit2,
  Trash2,
  Loader2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-rose-100 text-rose-700 border-rose-200",
  draft: "bg-muted text-muted-foreground border-border",
};

const STATUS_FILTERS = ["all", "draft", "pending", "paid", "overdue"];

function getCreatedAt(invoice) {
  return invoice?.created_at || invoice?.createdAt;
}

function getInvoiceTotal(invoice) {
  return parseFloat(invoice?.total) || 0;
}

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

  const fetchInvoices = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setInvoices(data || []);
      } else {
        const localInvoices = readGlobal("invoices", [])
          .filter(
            (invoice) =>
              invoice?.user_id === user.id || invoice?.userId === user.id
          )
          .sort(
            (a, b) => new Date(getCreatedAt(b)) - new Date(getCreatedAt(a))
          );

        setInvoices(localInvoices);
      }
    } catch (err) {
      console.error("Failed to load invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = async (invoiceId) => {
    if (!user?.id) return;

    setDeleting(invoiceId);

    try {
      if (isSupabaseEnabled) {
        const { error } = await supabase
          .from("invoices")
          .delete()
          .eq("id", invoiceId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        writeGlobal(
          "invoices",
          readGlobal("invoices", []).filter(
            (invoice) => invoice.id !== invoiceId
          )
        );
      }

      setInvoices((prev) =>
        prev.filter((invoice) => invoice.id !== invoiceId)
      );
      toast.success("Invoice deleted");
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(null);
    }
  };

  const handleNewInvoice = () => {
    if (!canAddInvoice) {
      toast.error("Invoice limit reached. Upgrade to create more invoices.");
      navigate("/pricing-app");
      return;
    }

    navigate("/invoices/new");
  };

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesQuery =
        !search ||
        invoice.invoice_number?.toLowerCase().includes(search) ||
        invoice.client_name?.toLowerCase().includes(search) ||
        invoice.client_email?.toLowerCase().includes(search);

      const matchesStatus = filter === "all" || invoice.status === filter;

      return matchesQuery && matchesStatus;
    });
  }, [invoices, query, filter]);

  const summary = useMemo(() => {
    const paid = filtered
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);

    const pending = filtered
      .filter((invoice) => invoice.status === "pending")
      .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);

    const total = filtered.reduce(
      (sum, invoice) => sum + getInvoiceTotal(invoice),
      0
    );

    return { paid, pending, total };
  }, [filtered]);

  const invoicesLeft =
    limits.invoices === Infinity
      ? Infinity
      : Math.max(0, limits.invoices - usage.invoices);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-1 text-muted-foreground">
            Track every invoice from draft to paid.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isPro && (
            <div className="rounded-lg border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <span
                className={
                  usage.invoices >= limits.invoices
                    ? "font-semibold text-rose-600"
                    : ""
                }
              >
                {usage.invoices}/{limits.invoices} invoices this month
              </span>
            </div>
          )}

          <Button
            onClick={handleNewInvoice}
            className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {!isPro &&
        usage.invoices >= limits.invoices - 2 &&
        usage.invoices < limits.invoices && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            <span>
              You have{" "}
              <span className="font-semibold">
                {invoicesLeft} invoice{invoicesLeft !== 1 ? "s" : ""}
              </span>{" "}
              left this month.
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/pricing-app")}
              className="h-7 border-amber-300 text-xs text-amber-700 hover:bg-amber-100"
            >
              <Crown className="mr-1 h-3.5 w-3.5" />
              Upgrade
            </Button>
          </div>
        )}

      {!isPro && usage.invoices >= limits.invoices && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <span className="font-semibold">
            Monthly invoice limit reached. Upgrade to create more invoices.
          </span>

          <Button
            size="sm"
            onClick={() => navigate("/pricing-app")}
            className="ml-3 h-7 bg-rose-600 text-xs text-white hover:bg-rose-700"
          >
            Upgrade Now
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice # or client..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === status
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <Receipt className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />

          <p className="mb-1 font-semibold">
            {invoices.length === 0 ? "No invoices yet" : "No matches"}
          </p>

          <p className="mb-5 text-sm text-muted-foreground">
            {invoices.length === 0
              ? "Send your first professional invoice and track payment status."
              : "Try a different filter or search term."}
          </p>

          {invoices.length === 0 && (
            <Button
              onClick={handleNewInvoice}
              className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Invoice
            </Button>
          )}
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="p-4 text-left font-semibold">Invoice #</th>
                  <th className="p-4 text-left font-semibold">Client</th>
                  <th className="p-4 text-left font-semibold">Issue Date</th>
                  <th className="p-4 text-left font-semibold">Due Date</th>
                  <th className="p-4 text-right font-semibold">Amount</th>
                  <th className="p-4 text-center font-semibold">Status</th>
                  <th className="w-20" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/20"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <td className="p-4 font-mono font-semibold">
                      {invoice.invoice_number || "—"}
                    </td>

                    <td className="p-4">
                      <div>
                        <p className="font-medium">
                          {invoice.client_name || "—"}
                        </p>

                        {invoice.client_gst && (
                          <p className="text-xs text-muted-foreground">
                            GST: {invoice.client_gst}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-muted-foreground">
                      {formatDate(invoice.issue_date || getCreatedAt(invoice))}
                    </td>

                    <td className="p-4 text-muted-foreground">
                      {formatDate(invoice.due_date)}
                    </td>

                    <td className="p-4 text-right font-semibold">
                      {formatCurrency(getInvoiceTotal(invoice), currency)}
                    </td>

                    <td className="p-4 text-center">
                      <Badge
                        variant="outline"
                        className={`capitalize ${
                          STATUS_STYLES[invoice.status || "draft"] ||
                          STATUS_STYLES.draft
                        }`}
                      >
                        {invoice.status || "draft"}
                      </Badge>
                    </td>

                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="hover:text-destructive"
                              title="Delete"
                            >
                              {deleting === invoice.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this invoice?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete invoice{" "}
                                {invoice.invoice_number || "—"} and cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(invoice.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

          <div className="flex flex-col justify-between gap-3 border-t bg-muted/20 px-4 py-3 text-sm sm:flex-row sm:items-center">
            <span className="text-muted-foreground">
              {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
            </span>

            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <span>
                Paid:{" "}
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(summary.paid, currency)}
                </span>
              </span>

              <span>
                Pending:{" "}
                <span className="font-semibold text-amber-600">
                  {formatCurrency(summary.pending, currency)}
                </span>
              </span>

              <span>
                Total:{" "}
                <span className="font-semibold">
                  {formatCurrency(summary.total, currency)}
                </span>
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
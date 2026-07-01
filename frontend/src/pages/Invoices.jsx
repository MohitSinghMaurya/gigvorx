import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Edit2,
  Loader2,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { usePlanLimits } from "@/lib/usePlanLimits";

import PaymentReminderDialog from "@/components/PaymentReminderDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_STYLES = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  overdue: "bg-rose-100 text-rose-700 border-rose-200",
  draft: "bg-muted text-muted-foreground border-border",
};

function isOverdue(invoice) {
  if (!invoice?.due_date) return false;
  if (invoice.status === "paid" || invoice.status === "draft") return false;

  const dueDate = new Date(invoice.due_date);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function getInvoiceStatus(invoice) {
  if (invoice?.status === "paid") return "paid";
  if (invoice?.status === "draft") return "draft";
  if (invoice?.status === "overdue" || isOverdue(invoice)) return "overdue";
  return "pending";
}

function getStatusLabel(status) {
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";
  if (status === "draft") return "Draft";
  return "Pending";
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
  const [reminderInvoice, setReminderInvoice] = useState(null);
  const [reminderOpen, setReminderOpen] = useState(false);

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

      setInvoices((prev) => prev.filter((invoice) => invoice.id !== invId));
      toast.success("Invoice deleted");
    } catch (err) {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(null);
    }
  };

  const handleNewInvoice = () => {
    if (!canAddInvoice) {
      toast.error(
        `You've used all ${limits.invoices} invoices this month. Upgrade to Pro for unlimited invoices.`
      );
      navigate("/pricing-app");
      return;
    }

    navigate("/invoices/new");
  };

  const openReminder = (invoice) => {
    const status = getInvoiceStatus(invoice);

    if (status === "paid") {
      toast.info("This invoice is already paid");
      return;
    }

    if (status === "draft") {
      toast.info("Reminder is available after invoice is pending or overdue");
      return;
    }

    setReminderInvoice({
      ...invoice,
      status,
      clientName: invoice.client_name,
      clientEmail: invoice.client_email,
      invoiceNumber: invoice.invoice_number,
      dueDate: invoice.due_date,
    });
    setReminderOpen(true);
  };

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      const status = getInvoiceStatus(invoice);

      const matchesQuery =
        !query ||
        invoice.invoice_number?.toLowerCase().includes(query.toLowerCase()) ||
        invoice.client_name?.toLowerCase().includes(query.toLowerCase()) ||
        invoice.client_email?.toLowerCase().includes(query.toLowerCase());

      const matchesStatus = filter === "all" || status === filter;

      return matchesQuery && matchesStatus;
    });
  }, [invoices, query, filter]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, invoice) => {
        const status = getInvoiceStatus(invoice);
        const total = Number(invoice.total || 0);

        acc.total += total;

        if (status === "paid") acc.paid += total;
        if (status === "pending") acc.pending += total;
        if (status === "overdue") acc.overdue += total;

        return acc;
      },
      {
        paid: 0,
        pending: 0,
        overdue: 0,
        total: 0,
      }
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-1 text-muted-foreground">
            Track pending, paid, and overdue invoices with payment reminders.
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
                {limits.invoices - usage.invoices} invoice
                {limits.invoices - usage.invoices !== 1 ? "s" : ""}
              </span>{" "}
              left this month.
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/pricing-app")}
              className="h-7 border-amber-300 text-xs text-amber-700 hover:bg-amber-100"
            >
              Upgrade
            </Button>
          </div>
        )}

      {!isPro && usage.invoices >= limits.invoices && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <span className="font-semibold">
            Monthly invoice limit reached. Upgrade to Pro for unlimited
            invoices.
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
            placeholder="Search by invoice, client, or email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {["all", "draft", "pending", "paid", "overdue"].map((status) => (
            <button
              key={status}
              type="button"
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
              ? "Send your first professional invoice in under a minute."
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
                  <th className="w-28 p-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((invoice) => {
                  const status = getInvoiceStatus(invoice);

                  return (
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

                          {invoice.client_email && (
                            <p className="text-xs text-muted-foreground">
                              {invoice.client_email}
                            </p>
                          )}

                          {invoice.client_gst && (
                            <p className="text-xs text-muted-foreground">
                              GST: {invoice.client_gst}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-muted-foreground">
                        {formatDate(invoice.issue_date || invoice.created_at)}
                      </td>

                      <td
                        className={`p-4 ${
                          status === "overdue"
                            ? "font-medium text-rose-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatDate(invoice.due_date)}
                      </td>

                      <td className="p-4 text-right font-semibold">
                        {formatCurrency(invoice.total || 0, currency)}
                      </td>

                      <td className="p-4 text-center">
                        <Badge
                          variant="outline"
                          className={`capitalize ${
                            STATUS_STYLES[status] || STATUS_STYLES.draft
                          }`}
                        >
                          {getStatusLabel(status)}
                        </Badge>
                      </td>

                      <td
                        className="p-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1">
                          {status !== "paid" && status !== "draft" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openReminder(invoice)}
                              title="Payment reminder"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}

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
                                  {invoice.invoice_number} and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>

                                <AlertDialogAction
                                  onClick={() => handleDelete(invoice.id)}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
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
                Overdue:{" "}
                <span className="font-semibold text-rose-600">
                  {formatCurrency(summary.overdue, currency)}
                </span>
              </span>

              <span>
                Total:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(summary.total, currency)}
                </span>
              </span>
            </div>
          </div>
        </Card>
      )}

      <PaymentReminderDialog
        invoice={reminderInvoice}
        open={reminderOpen}
        onOpenChange={setReminderOpen}
      />
    </div>
  );
}
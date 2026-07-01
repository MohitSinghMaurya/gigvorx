import { useEffect, useMemo, useState } from "react";
import { Copy, Mail, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function readField(item, camelKey, snakeKey, fallback = "") {
  return item?.[camelKey] ?? item?.[snakeKey] ?? fallback;
}

function formatMoney(invoice) {
  const currency = invoice?.currency || "INR";
  const total =
    Number(invoice?.total) ||
    Number(invoice?.amount) ||
    Number(invoice?.grand_total) ||
    Number(invoice?.grandTotal) ||
    0;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(total);
  } catch {
    return `${currency} ${total.toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return "not mentioned";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isInvoiceOverdue(invoice) {
  const status = String(invoice?.status || "").toLowerCase();
  const dueDate = readField(invoice, "dueDate", "due_date", "");

  if (status === "paid") return false;
  if (status === "overdue") return true;
  if (!dueDate) return false;

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

function getInvoiceStatus(invoice) {
  const status = String(invoice?.status || "pending").toLowerCase();

  if (status === "paid") return "paid";
  if (status === "overdue" || isInvoiceOverdue(invoice)) return "overdue";

  return "pending";
}

function buildReminderMessage(invoice) {
  const clientName = readField(invoice, "clientName", "client_name", "there");
  const invoiceNumber = readField(
    invoice,
    "invoiceNumber",
    "invoice_number",
    "your invoice"
  );
  const dueDate = formatDate(readField(invoice, "dueDate", "due_date", ""));
  const amount = formatMoney(invoice);
  const status = getInvoiceStatus(invoice);

  if (status === "overdue") {
    return `Hi ${clientName},

This is a friendly reminder that invoice ${invoiceNumber} for ${amount} is currently overdue. The due date was ${dueDate}.

Please let me know once the payment is completed. If you need the invoice shared again, I can resend it.

Thank you.`;
  }

  return `Hi ${clientName},

This is a friendly reminder for invoice ${invoiceNumber} for ${amount}. The invoice is currently pending and due on ${dueDate}.

Please let me know once the payment is completed. If you need the invoice shared again, I can resend it.

Thank you.`;
}

export function PaymentReminderDialog({ invoice, open, onOpenChange }) {
  const [message, setMessage] = useState("");

  const status = useMemo(() => getInvoiceStatus(invoice), [invoice]);
  const clientEmail = readField(invoice, "clientEmail", "client_email", "");
  const invoiceNumber = readField(
    invoice,
    "invoiceNumber",
    "invoice_number",
    "Invoice"
  );

  useEffect(() => {
    if (invoice && open) {
      setMessage(buildReminderMessage(invoice));
    }
  }, [invoice, open]);

  if (!invoice) return null;

  const statusClass =
    status === "overdue"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "paid"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Payment reminder copied");
    } catch {
      toast.error("Could not copy reminder");
    }
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openEmail = () => {
    const subject = `Payment reminder - ${invoiceNumber}`;
    const href = `mailto:${clientEmail || ""}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`;

    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Payment reminder</DialogTitle>
              <DialogDescription>
                Generate a polite reminder for pending or overdue invoice
                payments.
              </DialogDescription>
            </div>

            <Badge className={statusClass}>
              {status === "overdue"
                ? "Overdue"
                : status === "paid"
                  ? "Paid"
                  : "Pending"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">
                  {readField(invoice, "clientName", "client_name", "Client")}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Invoice</p>
                <p className="font-medium">{invoiceNumber}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">{formatMoney(invoice)}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Due date</p>
                <p className="font-medium">
                  {formatDate(readField(invoice, "dueDate", "due_date", ""))}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Reminder message
            </label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={10}
              className="resize-none"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={copyMessage}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={openEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>

              <Button type="button" onClick={openWhatsApp}>
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange?.(false)}
              >
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentReminderDialog;
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Plus,
  QrCode,
  Save,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";

import PaymentReminderDialog from "@/components/PaymentReminderDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Clean invoice" },
  { id: "modern", name: "Modern", desc: "Gradient header" },
  { id: "minimal", name: "Minimal", desc: "Simple layout" },
  { id: "corporate", name: "Corporate", desc: "Blue business" },
  { id: "teal", name: "Teal Pro", desc: "Professional teal" },
  { id: "orange", name: "Orange Bold", desc: "Bold orange" },
];

const STATUS_STYLES = {
  paid: "bg-emerald-600 text-white border-emerald-600",
  pending: "bg-amber-500 text-white border-amber-500",
  overdue: "bg-rose-600 text-white border-rose-600",
  draft: "bg-muted text-muted-foreground border-border",
};

function emptyItem(description = "", quantity = 1, rate = 0) {
  return {
    id: Math.random().toString(36).slice(2),
    description,
    quantity,
    rate,
  };
}

function generateInvoiceNumber() {
  const now = new Date();

  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, "0")}`;
}

function getDefaultForm() {
  return {
    template: "modern",
    invoice_number: generateInvoiceNumber(),
    status: "draft",
    client_name: "",
    client_email: "",
    client_address: "",
    client_gst: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    items: [emptyItem()],
    tax_rate: 18,
    discount: 0,
    notes: "Thank you for your business!",
    terms:
      "Payment due within 14 days. Work starts after advance payment if advance is mentioned in this invoice.",
    logo: "",
    upi_id: "",
    qr_image: "",
    payment_type: "upi",
    bank_name: "",
    bank_account: "",
    bank_ifsc: "",
    business_name: "",
    business_email: "",
    business_phone: "",
    business_address: "",
    business_gst: "",
    paid_at: null,
  };
}

function isOverdue(form) {
  if (!form?.due_date) return false;
  if (form.status === "paid" || form.status === "draft") return false;

  const dueDate = new Date(form.due_date);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function getSmartStatus(form) {
  if (form.status === "paid") return "paid";
  if (form.status === "draft") return "draft";
  if (form.status === "overdue" || isOverdue(form)) return "overdue";
  return "pending";
}

function getStatusLabel(status) {
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";
  if (status === "draft") return "Draft";
  return "Pending";
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [emptyItem()];

  return items.map((item) => ({
    id: item.id || Math.random().toString(36).slice(2),
    description: item.description || "",
    quantity: item.quantity || 1,
    rate: item.rate || 0,
  }));
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency } = useCurrency();

  const editing = Boolean(id);
  const previewRef = useRef(null);

  const [form, setForm] = useState(getDefaultForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [preview, setPreview] = useState(false);
  const [paidDialog, setPaidDialog] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  useEffect(() => {
    if (editing && user?.id) loadInvoice();
  }, [editing, id, user?.id]);

  const totals = useMemo(() => {
    const subtotal = (form.items || []).reduce((sum, item) => {
      return (
        sum +
        (Number.parseFloat(item.quantity) || 0) *
          (Number.parseFloat(item.rate) || 0)
      );
    }, 0);

    const discountAmt = (subtotal * (Number.parseFloat(form.discount) || 0)) / 100;
    const taxable = subtotal - discountAmt;
    const taxAmt = (taxable * (Number.parseFloat(form.tax_rate) || 0)) / 100;
    const total = taxable + taxAmt;

    return {
      subtotal,
      discountAmt,
      taxAmt,
      total,
    };
  }, [form.items, form.discount, form.tax_rate]);

  const smartStatus = getSmartStatus(form);

  const setField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const setItem = (itemId, patch) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      ),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const addAdvanceItem = () => {
    const suggestedAdvance = Math.round(totals.total * 0.5);

    setForm((prev) => ({
      ...prev,
      status: prev.status === "draft" ? "pending" : prev.status,
      items: [
        ...prev.items,
        emptyItem(
          "Advance payment before project start",
          1,
          suggestedAdvance > 0 ? suggestedAdvance : 0
        ),
      ],
      terms:
        prev.terms ||
        "Work starts after advance payment. Final files are handed over after full payment.",
    }));

    toast.success("Advance payment item added");
  };

  const removeItem = (itemId) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter((item) => item.id !== itemId)
          : prev.items,
    }));
  };

  const handleImage = (file, key) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setField(key, reader.result);
    reader.readAsDataURL(file);
  };

  const loadInvoice = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        toast.error("Invoice not found");
        navigate("/invoices");
        return;
      }

      setForm((prev) => ({
        ...prev,
        ...data,
        items: normalizeItems(data.items),
      }));
    } catch (err) {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form.client_name.trim()) {
      toast.error("Client name is required");
      return;
    }

    const finalStatus = getSmartStatus(form);

    setSaving(true);

    const payload = {
      user_id: user.id,
      template: form.template,
      invoice_number: form.invoice_number,
      status: finalStatus,
      client_name: form.client_name,
      client_email: form.client_email,
      client_address: form.client_address,
      client_gst: form.client_gst,
      issue_date: form.issue_date,
      due_date: form.due_date,
      items: normalizeItems(form.items),
      tax_rate: Number.parseFloat(form.tax_rate) || 0,
      discount: Number.parseFloat(form.discount) || 0,
      notes: form.notes,
      terms: form.terms,
      logo: form.logo,
      upi_id: form.upi_id,
      qr_image: form.qr_image,
      payment_type: form.payment_type,
      bank_name: form.bank_name,
      bank_account: form.bank_account,
      bank_ifsc: form.bank_ifsc,
      business_name: form.business_name,
      business_email: form.business_email,
      business_phone: form.business_phone,
      business_address: form.business_address,
      business_gst: form.business_gst,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmt,
      tax_amount: totals.taxAmt,
      total: totals.total,
      updated_at: new Date().toISOString(),
    };

    if (finalStatus === "paid") {
      payload.paid_at = form.paid_at || new Date().toISOString();
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from("invoices")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setField("status", finalStatus);
        toast.success("Invoice saved");
      } else {
        const { data: newInvoice, error } = await supabase
          .from("invoices")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        toast.success("Invoice created");
        navigate(`/invoices/${newInvoice.id}`, { replace: true });
      }
    } catch (err) {
      toast.error(`Error saving invoice: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    if (!editing) {
      toast.error("Save the invoice first");
      return;
    }

    setSaving(true);

    try {
      const paidAt = new Date().toISOString();

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: paidAt,
          updated_at: paidAt,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setForm((prev) => ({
        ...prev,
        status: "paid",
        paid_at: paidAt,
      }));

      setPaidDialog(true);
    } catch (err) {
      toast.error("Failed to mark as paid");
    } finally {
      setSaving(false);
    }
  };

  const markPending = () => {
    setForm((prev) => ({
      ...prev,
      status: "pending",
    }));

    toast.success("Invoice marked as pending");
  };

  const downloadPDF = async () => {
    const node = previewRef.current;

    if (!node) {
      setPreview(true);
      setTimeout(downloadPDF, 350);
      return;
    }

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const image = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);

      pdf.addImage(
        image,
        "JPEG",
        0,
        0,
        canvas.width * ratio,
        canvas.height * ratio
      );

      pdf.save(`${form.invoice_number}.pdf`);
    } catch (err) {
      toast.error("PDF generation failed");
    }
  };

  const shareWA = () => {
    const itemsList = (form.items || [])
      .filter((item) => item.description)
      .map((item) => {
        const amount =
          (Number.parseFloat(item.quantity) || 0) *
          (Number.parseFloat(item.rate) || 0);

        return `• ${item.description} × ${item.quantity} — ${formatCurrency(
          amount,
          currency
        )}`;
      })
      .join("\n");

    const message = `Hi ${form.client_name || "there"},

Please find invoice ${form.invoice_number} for ${formatCurrency(
      totals.total,
      currency
    )}.

Status: ${getStatusLabel(smartStatus)}
Due date: ${formatDate(form.due_date)}

${itemsList || "Invoice details are added in the invoice."}

Payment details:
${getPaymentText(form)}

Thank you.
- ${form.business_name || "GigVorx"}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const reminderInvoice = {
    ...form,
    total: totals.total,
    status: smartStatus,
    clientName: form.client_name,
    clientEmail: form.client_email,
    invoiceNumber: form.invoice_number,
    dueDate: form.due_date,
  };

  const formForTemplate = {
    ...form,
    status: smartStatus,
    invoiceNumber: form.invoice_number,
    clientName: form.client_name,
    clientEmail: form.client_email,
    clientAddress: form.client_address,
    clientGst: form.client_gst,
    issueDate: form.issue_date,
    dueDate: form.due_date,
    taxRate: form.tax_rate,
    upiId: form.upi_id,
    qrImage: form.qr_image,
    paymentType: form.payment_type,
    bankName: form.bank_name,
    bankAccount: form.bank_account,
    bankIfsc: form.bank_ifsc,
    business: {
      name: form.business_name,
      email: form.business_email,
      phone: form.business_phone,
      address: form.business_address,
      gst: form.business_gst,
    },
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/invoices")}
          className="-ml-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(true)}>
            <Eye className="mr-1.5 h-4 w-4" />
            Preview
          </Button>

          <Button variant="outline" size="sm" onClick={downloadPDF}>
            <Download className="mr-1.5 h-4 w-4" />
            Download PDF
          </Button>

          <Button variant="outline" size="sm" onClick={shareWA}>
            <MessageCircle className="mr-1.5 h-4 w-4" />
            WhatsApp
          </Button>

          {smartStatus !== "paid" && smartStatus !== "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReminderOpen(true)}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Reminder
            </Button>
          )}

          {form.status === "draft" && (
            <Button variant="outline" size="sm" onClick={markPending}>
              Mark pending
            </Button>
          )}

          {smartStatus !== "paid" && (
            <Button
              variant="outline"
              size="sm"
              onClick={markPaid}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Mark as paid
            </Button>
          )}

          <Button
            size="sm"
            onClick={save}
            disabled={saving}
            className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {smartStatus === "overdue" && (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          This invoice is overdue based on the due date. You can send a payment
          reminder from this page.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <Label className="mb-3 block text-xs uppercase tracking-wider text-muted-foreground">
              Template
            </Label>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setField("template", template.id)}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    form.template === template.id
                      ? "border-[#FF6B00] shadow-sm"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <p className="text-sm font-semibold">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.desc}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="font-semibold">Invoice Details</h3>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <Label>Invoice #</Label>
                <Input
                  value={form.invoice_number}
                  onChange={(event) =>
                    setField("invoice_number", event.target.value)
                  }
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(event) => setField("status", event.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={form.issue_date}
                  onChange={(event) =>
                    setField("issue_date", event.target.value)
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(event) => setField("due_date", event.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              Smart status:{" "}
              <Badge className={`${STATUS_STYLES[smartStatus]} ml-1`}>
                {getStatusLabel(smartStatus)}
              </Badge>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="font-semibold">Your Business</h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                label="Business Name"
                value={form.business_name}
                onChange={(value) => setField("business_name", value)}
                placeholder="Your Business Name"
              />

              <Field
                label="Business Email"
                value={form.business_email}
                onChange={(value) => setField("business_email", value)}
                placeholder="you@business.com"
              />

              <Field
                label="Phone"
                value={form.business_phone}
                onChange={(value) => setField("business_phone", value)}
                placeholder="+91 98765 43210"
              />

              <Field
                label="Your GST Number"
                value={form.business_gst}
                onChange={(value) => setField("business_gst", value)}
                placeholder="GST number"
              />

              <div className="md:col-span-2">
                <Label>Business Address</Label>
                <Textarea
                  value={form.business_address}
                  onChange={(event) =>
                    setField("business_address", event.target.value)
                  }
                  placeholder="Your business address"
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="font-semibold">Client Details</h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                label="Client Name *"
                value={form.client_name}
                onChange={(value) => setField("client_name", value)}
                placeholder="Client name"
              />

              <Field
                label="Client Email"
                value={form.client_email}
                onChange={(value) => setField("client_email", value)}
                placeholder="client@example.com"
              />

              <Field
                label="Client GST Number"
                value={form.client_gst}
                onChange={(value) => setField("client_gst", value)}
                placeholder="GST number"
              />

              <div className="md:col-span-2">
                <Label>Billing Address</Label>
                <Textarea
                  value={form.client_address}
                  onChange={(event) =>
                    setField("client_address", event.target.value)
                  }
                  placeholder="Client billing address"
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Line Items</h3>
                <p className="text-xs text-muted-foreground">
                  Add services, advance payment, milestones, or final payment.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={addAdvanceItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add advance
                </Button>

                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add item
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {form.items.map((item) => (
                <div
                  key={item.id}
                  className="group relative space-y-2 rounded-lg border p-3"
                >
                  <Input
                    placeholder="Item or service description"
                    value={item.description}
                    onChange={(event) =>
                      setItem(item.id, {
                        description: event.target.value,
                      })
                    }
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Qty
                      </p>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          setItem(item.id, {
                            quantity: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Rate ({currency})
                      </p>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(event) =>
                          setItem(item.id, {
                            rate: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Amount
                      </p>
                      <div className="flex h-9 items-center justify-end rounded-md border bg-muted/30 px-3">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(
                            (Number.parseFloat(item.quantity) || 0) *
                              (Number.parseFloat(item.rate) || 0),
                            currency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute right-3 top-3 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="grid grid-cols-2 gap-3 p-5">
            <div>
              <Label>GST / Tax (%)</Label>
              <Input
                type="number"
                value={form.tax_rate}
                onChange={(event) => setField("tax_rate", event.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Discount (%)</Label>
              <Input
                type="number"
                value={form.discount}
                onChange={(event) => setField("discount", event.target.value)}
                className="mt-1"
              />
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="font-semibold">Payment & Branding</h3>

            <div>
              <Label>Payment Method</Label>
              <select
                value={form.payment_type || "upi"}
                onChange={(event) => setField("payment_type", event.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="upi">UPI India</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="bank">Bank Transfer</option>
                <option value="custom">Custom Link</option>
                <option value="none">No Payment Info</option>
              </select>
            </div>

            {(form.payment_type === "upi" || !form.payment_type) && (
              <div className="space-y-3">
                <Field
                  label="UPI ID"
                  value={form.upi_id}
                  onChange={(value) => setField("upi_id", value)}
                  placeholder="yourname@upi"
                />

                <ImageUpload
                  label="UPI QR Image"
                  text={form.qr_image ? "Replace QR" : "Upload QR optional"}
                  icon={<QrCode className="h-4 w-4" />}
                  onChange={(file) => handleImage(file, "qr_image")}
                />
              </div>
            )}

            {form.payment_type === "paypal" && (
              <Field
                label="PayPal Link"
                value={form.upi_id}
                onChange={(value) => setField("upi_id", value)}
                placeholder="https://paypal.me/yourname"
              />
            )}

            {form.payment_type === "stripe" && (
              <Field
                label="Stripe Payment Link"
                value={form.upi_id}
                onChange={(value) => setField("upi_id", value)}
                placeholder="https://buy.stripe.com/your-link"
              />
            )}

            {form.payment_type === "bank" && (
              <div className="space-y-3">
                <Field
                  label="Account Name"
                  value={form.bank_name}
                  onChange={(value) => setField("bank_name", value)}
                  placeholder="Your Name"
                />

                <Field
                  label="Account Number"
                  value={form.bank_account}
                  onChange={(value) => setField("bank_account", value)}
                  placeholder="1234567890"
                />

                <Field
                  label="Bank Name / IFSC"
                  value={form.bank_ifsc}
                  onChange={(value) => setField("bank_ifsc", value)}
                  placeholder="HDFC Bank / HDFC0001234"
                />
              </div>
            )}

            {form.payment_type === "custom" && (
              <Field
                label="Custom Payment Link"
                value={form.upi_id}
                onChange={(value) => setField("upi_id", value)}
                placeholder="https://yourpaymentlink.com"
              />
            )}

            <ImageUpload
              label="Logo"
              text={form.logo ? "Replace logo" : "Upload logo"}
              icon={<ImageIcon className="h-4 w-4" />}
              onChange={(file) => handleImage(file, "logo")}
            />

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Terms</Label>
              <Textarea
                value={form.terms}
                onChange={(event) => setField("terms", event.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </Card>
        </div>

        <div className="h-fit lg:sticky lg:top-24">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Live preview
          </p>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div
              ref={previewRef}
              className="p-6 text-[11px] leading-tight"
              style={{ minHeight: 500 }}
            >
              <InvoiceTemplate
                template={form.template}
                form={formForTemplate}
                totals={totals}
                currency={currency}
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <Badge className={`${STATUS_STYLES[smartStatus]} capitalize`}>
              {getStatusLabel(smartStatus)}
            </Badge>

            <Card className="p-4 text-sm">
              <div className="space-y-1">
                <SummaryRow
                  label="Subtotal"
                  value={formatCurrency(totals.subtotal, currency)}
                />
                <SummaryRow
                  label="Discount"
                  value={formatCurrency(totals.discountAmt, currency)}
                />
                <SummaryRow
                  label="Tax"
                  value={formatCurrency(totals.taxAmt, currency)}
                />
                <SummaryRow
                  label="Total"
                  value={formatCurrency(totals.total, currency)}
                  strong
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-white p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>

          <div className="p-8">
            <InvoiceTemplate
              template={form.template}
              form={formForTemplate}
              totals={totals}
              currency={currency}
              large
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paidDialog} onOpenChange={setPaidDialog}>
        <DialogContent className="max-w-md text-center">
          <div className="py-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>

            <h3 className="text-2xl font-bold">Payment received!</h3>

            <p className="mt-2 text-muted-foreground">
              Invoice <b>{form.invoice_number}</b> marked as paid.
            </p>

            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => setPaidDialog(false)}>
                Close
              </Button>

              <Button
                onClick={() => {
                  setPaidDialog(false);
                  shareWA();
                }}
                className="bg-[#FF6B00] text-white"
              >
                Send thank you on WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentReminderDialog
        invoice={reminderInvoice}
        open={reminderOpen}
        onOpenChange={setReminderOpen}
      />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}

function ImageUpload({ label, text, icon, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <label className="mt-1 flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:border-foreground/40">
        {icon}
        {text}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0])}
        />
      </label>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div
      className={`flex justify-between ${
        strong ? "border-t pt-2 font-bold" : "text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function getPaymentText(form) {
  if (form.payment_type === "none") return "No payment details added.";

  if (form.payment_type === "bank") {
    return `Bank transfer
Account name: ${form.bank_name || "Not added"}
Account number: ${form.bank_account || "Not added"}
Bank / IFSC: ${form.bank_ifsc || "Not added"}`;
  }

  if (form.payment_type === "upi") {
    return `UPI: ${form.upi_id || "Not added"}`;
  }

  if (form.payment_type === "paypal") {
    return `PayPal: ${form.upi_id || "Not added"}`;
  }

  if (form.payment_type === "stripe") {
    return `Stripe: ${form.upi_id || "Not added"}`;
  }

  return `Payment link: ${form.upi_id || "Not added"}`;
}

function InvoiceTemplate({ template, form, totals, currency = "INR", large = false }) {
  const theme = getTemplateTheme(template);
  const size = large ? "text-sm" : "text-[11px]";

  return (
    <div className={`${size} bg-white text-gray-900`}>
      <div className={`${theme.header} rounded-lg p-6 text-white`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            {form.logo ? (
              <img
                src={form.logo}
                alt=""
                className="mb-2 h-12 rounded bg-white/10 object-contain p-1"
              />
            ) : (
              <p className={`${large ? "text-2xl" : "text-lg"} font-bold`}>
                {form.business?.name || "Your Business"}
              </p>
            )}

            <p className="opacity-85">{form.business?.email}</p>
            <p className="opacity-85">{form.business?.phone}</p>
            {form.business?.gst && (
              <p className="text-[9px] opacity-75">GST: {form.business.gst}</p>
            )}
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest opacity-80">
              Invoice
            </p>
            <p className={`${large ? "text-2xl" : "text-base"} font-mono font-bold`}>
              {form.invoiceNumber}
            </p>
            <Badge className="mt-1 bg-white/20 text-white capitalize">
              {getStatusLabel(form.status)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-500">
            Bill To
          </p>
          <p className="font-semibold">{form.clientName || "—"}</p>
          <p className="text-gray-600">{form.clientEmail}</p>
          <p className="whitespace-pre-wrap text-gray-600">
            {form.clientAddress}
          </p>
          {form.clientGst && (
            <p className="mt-1 text-[9px] text-gray-500">
              GST: {form.clientGst}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-500">
            Dates
          </p>
          <p>
            Issued: <span className="font-medium">{formatDate(form.issueDate)}</span>
          </p>
          <p>
            Due: <span className="font-medium">{formatDate(form.dueDate)}</span>
          </p>
        </div>
      </div>

      <table className="mt-6 w-full">
        <thead>
          <tr className={`${theme.tableHead} text-white`}>
            <th className="p-2 text-left text-[9px] uppercase tracking-wider">
              Description
            </th>
            <th className="p-2 text-right text-[9px] uppercase tracking-wider">
              Qty
            </th>
            <th className="p-2 text-right text-[9px] uppercase tracking-wider">
              Rate
            </th>
            <th className="p-2 text-right text-[9px] uppercase tracking-wider">
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          {(form.items || []).map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-2">{item.description || "—"}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right tabular-nums">
                {formatCurrency(item.rate || 0, currency)}
              </td>
              <td className="p-2 text-right font-medium tabular-nums">
                {formatCurrency(
                  (Number.parseFloat(item.quantity) || 0) *
                    (Number.parseFloat(item.rate) || 0),
                  currency
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-60 space-y-1">
          <InvoiceTotalRow
            label="Subtotal"
            value={formatCurrency(totals.subtotal, currency)}
          />

          {totals.discountAmt > 0 && (
            <InvoiceTotalRow
              label={`Discount (${form.discount}%)`}
              value={`-${formatCurrency(totals.discountAmt, currency)}`}
            />
          )}

          <InvoiceTotalRow
            label={`GST (${form.taxRate}%)`}
            value={formatCurrency(totals.taxAmt, currency)}
          />

          <div className={`${theme.total} mt-2 flex justify-between rounded px-3 py-2 font-bold text-white`}>
            <span>Total</span>
            <span>{formatCurrency(totals.total, currency)}</span>
          </div>
        </div>
      </div>

      {form.paymentType !== "none" && (
        <div className="mt-6 rounded-md border bg-gray-50 p-3">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-500">
            Payment Details
          </p>

          <div className="flex items-center gap-3">
            {form.qrImage && form.paymentType === "upi" && (
              <img
                src={form.qrImage}
                alt="QR"
                className="h-16 w-16 rounded border bg-white object-contain"
              />
            )}

            <p className="whitespace-pre-wrap text-gray-700">
              {getPaymentText({
                payment_type: form.paymentType,
                upi_id: form.upiId,
                bank_name: form.bankName,
                bank_account: form.bankAccount,
                bank_ifsc: form.bankIfsc,
              })}
            </p>
          </div>
        </div>
      )}

      {form.notes && (
        <p className="mt-5 italic text-gray-700">{form.notes}</p>
      )}

      {form.terms && (
        <div className="mt-4 border-t pt-3 text-[9px] text-gray-500">
          <b>Terms:</b> {form.terms}
        </div>
      )}

      {form.status === "paid" && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-center font-semibold text-emerald-800">
          Paid — Thank you for your business!
        </div>
      )}
    </div>
  );
}

function InvoiceTotalRow({ label, value }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function getTemplateTheme(template) {
  if (template === "corporate") {
    return {
      header: "bg-[#1a3a6b]",
      tableHead: "bg-[#1a3a6b]",
      total: "bg-[#1a3a6b]",
    };
  }

  if (template === "teal") {
    return {
      header: "bg-[#00897b]",
      tableHead: "bg-[#00897b]",
      total: "bg-[#00897b]",
    };
  }

  if (template === "orange") {
    return {
      header: "bg-[#1a1a2e]",
      tableHead: "bg-orange-500",
      total: "bg-orange-500",
    };
  }

  if (template === "minimal") {
    return {
      header: "bg-gray-900",
      tableHead: "bg-gray-900",
      total: "bg-gray-900",
    };
  }

  if (template === "classic") {
    return {
      header: "bg-slate-700",
      tableHead: "bg-slate-700",
      total: "bg-slate-700",
    };
  }

  return {
    header: "bg-gradient-to-br from-violet-600 to-indigo-600",
    tableHead: "bg-indigo-600",
    total: "bg-indigo-600",
  };
}
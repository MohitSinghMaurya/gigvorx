import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readGlobal, writeGlobal, uid, readSetting } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Eye,
  Download,
  MessageCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  QrCode,
  PartyPopper,
  Loader2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Clean and timeless" },
  { id: "modern", name: "Modern", desc: "Bold gradient header" },
  { id: "minimal", name: "Minimal", desc: "Simple typography" },
  { id: "corporate", name: "Corporate", desc: "Blue business style" },
  { id: "teal", name: "Teal", desc: "Professional teal layout" },
  { id: "orange", name: "Orange", desc: "Bold orange accent" },
];

const STATUS_STYLES = {
  paid: "bg-emerald-600 text-white border-emerald-600",
  pending: "bg-amber-500 text-white border-amber-500",
  overdue: "bg-rose-600 text-white border-rose-600",
  draft: "bg-muted text-muted-foreground border-border",
};

function makeId() {
  return window.crypto?.randomUUID?.() || uid();
}

function emptyItem() {
  return {
    id: makeId(),
    description: "",
    quantity: 1,
    rate: 0,
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

function getDefaultForm(user, business = {}) {
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
    terms: "Payment due within 14 days.",
    logo: "",
    upi_id: "",
    qr_image: "",
    payment_type: "upi",
    bank_name: "",
    bank_account: "",
    bank_ifsc: "",
    business_name: business.name || user?.name || "",
    business_email: business.email || user?.email || "",
    business_phone: business.phone || "",
    business_address: business.address || "",
    business_gst: business.gst || "",
  };
}

function normalizeItems(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((item) => ({
      id: item.id || makeId(),
      description: item.description || "",
      quantity: item.quantity || 1,
      rate: item.rate || 0,
    }));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeItems(parsed);
    } catch {
      return [emptyItem()];
    }
  }

  return [emptyItem()];
}

function getCreatedAt(invoice) {
  return invoice?.created_at || invoice?.createdAt;
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { canAddInvoice, limits, usage, isPro } = usePlanLimits();

  const editing = Boolean(id && id !== "new");
  const previewRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [preview, setPreview] = useState(false);
  const [paidDialog, setPaidDialog] = useState(false);
  const [form, setForm] = useState(() => getDefaultForm(user));

  useEffect(() => {
    if (!user?.id) return;

    if (!editing) {
      const business = readSetting(user.id, "business", {});
      setForm((prev) => ({
        ...getDefaultForm(user, business),
        template: prev.template || "modern",
      }));
    }
  }, [editing, user]);

  const loadInvoice = useCallback(async () => {
    if (!editing || !user?.id) return;

    setLoading(true);

    try {
      let data = null;

      if (isSupabaseEnabled) {
        const result = await supabase
          .from("invoices")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (result.error) throw result.error;
        data = result.data;
      } else {
        data = readGlobal("invoices", []).find(
          (invoice) =>
            invoice.id === id &&
            (invoice.user_id === user.id || invoice.userId === user.id)
        );
      }

      if (!data) {
        toast.error("Invoice not found");
        navigate("/invoices");
        return;
      }

      setForm({
        ...getDefaultForm(user),
        ...data,
        items: normalizeItems(data.items),
        due_date: data.due_date || "",
        issue_date: data.issue_date || getCreatedAt(data)?.slice(0, 10) || "",
      });
    } catch (err) {
      console.error("Failed to load invoice:", err);
      toast.error("Failed to load invoice");
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  }, [editing, id, navigate, user]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const totals = useMemo(() => {
    const subtotal = (form.items || []).reduce((sum, item) => {
      return (
        sum +
        (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
      );
    }, 0);

    const discountAmt =
      (subtotal * (parseFloat(form.discount) || 0)) / 100;
    const taxable = subtotal - discountAmt;
    const taxAmt = (taxable * (parseFloat(form.tax_rate) || 0)) / 100;
    const total = taxable + taxAmt;

    return {
      subtotal,
      discountAmt,
      taxAmt,
      total,
    };
  }, [form.items, form.discount, form.tax_rate]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  const save = async () => {
    if (!user?.id) {
      toast.error("Please sign in again.");
      return;
    }

    if (!editing && !canAddInvoice) {
      toast.error("Invoice limit reached. Upgrade to create more invoices.");
      navigate("/pricing-app");
      return;
    }

    if (!form.client_name.trim()) {
      toast.error("Client name is required");
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const payload = {
        user_id: user.id,
        userId: user.id,
        template: form.template,
        invoice_number: form.invoice_number,
        status: form.status,
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim(),
        client_address: form.client_address.trim(),
        client_gst: form.client_gst.trim(),
        issue_date: form.issue_date,
        due_date: form.due_date,
        items: form.items,
        tax_rate: parseFloat(form.tax_rate) || 0,
        discount: parseFloat(form.discount) || 0,
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
      };

      if (editing) {
        if (isSupabaseEnabled) {
          const { error } = await supabase
            .from("invoices")
            .update({
              ...payload,
              updated_at: now,
            })
            .eq("id", id)
            .eq("user_id", user.id);

          if (error) throw error;
        } else {
          writeGlobal(
            "invoices",
            readGlobal("invoices", []).map((invoice) =>
              invoice.id === id &&
              (invoice.user_id === user.id || invoice.userId === user.id)
                ? { ...invoice, ...payload, updatedAt: now }
                : invoice
            )
          );
        }

        toast.success("Invoice saved");
      } else {
        const newId = makeId();

        if (isSupabaseEnabled) {
          const { data: newInvoice, error } = await supabase
            .from("invoices")
            .insert({
              ...payload,
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

          if (error) throw error;

          toast.success("Invoice created");
          navigate(`/invoices/${newInvoice.id}`, { replace: true });
        } else {
          const newInvoice = {
            id: newId,
            ...payload,
            createdAt: now,
            updatedAt: now,
          };

          writeGlobal("invoices", [newInvoice, ...readGlobal("invoices", [])]);
          toast.success("Invoice created");
          navigate(`/invoices/${newId}`, { replace: true });
        }
      }
    } catch (err) {
      console.error("Invoice save failed:", err);
      toast.error("Error saving invoice: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    if (!editing) {
      toast.error("Save the invoice first");
      return;
    }

    if (!user?.id) return;

    setSaving(true);

    try {
      const now = new Date().toISOString();

      if (isSupabaseEnabled) {
        const { error } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_at: now,
            updated_at: now,
          })
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        writeGlobal(
          "invoices",
          readGlobal("invoices", []).map((invoice) =>
            invoice.id === id &&
            (invoice.user_id === user.id || invoice.userId === user.id)
              ? { ...invoice, status: "paid", paidAt: now, updatedAt: now }
              : invoice
          )
        );
      }

      setField("status", "paid");
      setPaidDialog(true);
      toast.success("Invoice marked as paid");
    } catch (err) {
      console.error("Failed to mark invoice paid:", err);
      toast.error("Failed to mark as paid");
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = async () => {
    const node = previewRef.current;

    if (!node) {
      toast.error("Preview is not ready yet");
      return;
    }

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "pt", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);

      pdf.addImage(img, "JPEG", 0, 0, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`${form.invoice_number || "invoice"}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("PDF generation failed");
    }
  };

  const shareWA = () => {
    const itemsList = form.items
      .filter((item) => item.description)
      .map((item) => {
        const amount =
          (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);

        return `• ${item.description} × ${item.quantity} — ${formatCurrency(
          amount,
          currency
        )}`;
      })
      .join("\n");

    const message = `📄 *INVOICE ${form.invoice_number}*

From: ${form.business_name || "Your Business"}
To: ${form.client_name || "Client"}

Items:
${itemsList || "• No items added"}

Subtotal: ${formatCurrency(totals.subtotal, currency)}
Tax (${form.tax_rate}%): ${formatCurrency(totals.taxAmt, currency)}
Total: ${formatCurrency(totals.total, currency)}

Due: ${formatDate(form.due_date)}

Sent via GigVorx`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const formForTemplate = {
    ...form,
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
      {!editing && !canAddInvoice && (
        <Card className="border-rose-200 bg-rose-50 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-rose-700">
                Monthly invoice limit reached
              </p>
              <p className="text-sm text-rose-600">
                You have used {usage.invoices} of {limits.invoices} invoices this
                month.
              </p>
            </div>

            <Button
              onClick={() => navigate("/pricing-app")}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              <Crown className="mr-1.5 h-4 w-4" />
              Upgrade
            </Button>
          </div>
        </Card>
      )}

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

          {form.status !== "paid" && (
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
                  onClick={() => setField("template", template.id)}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    form.template === template.id
                      ? "border-[#FF6B00] shadow-sm"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <p className="text-sm font-semibold">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.desc}</p>
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
                  onChange={(e) => setField("invoice_number", e.target.value)}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
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
                  onChange={(e) => setField("issue_date", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setField("due_date", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="font-semibold">Your Business</h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Business Name</Label>
                <Input
                  value={form.business_name}
                  onChange={(e) => setField("business_name", e.target.value)}
                  placeholder="Your Business Name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Business Email</Label>
                <Input
                  value={form.business_email}
                  onChange={(e) => setField("business_email", e.target.value)}
                  placeholder="you@business.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  value={form.business_phone}
                  onChange={(e) => setField("business_phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Your GST Number</Label>
                <Input
                  value={form.business_gst}
                  onChange={(e) => setField("business_gst", e.target.value)}
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  className="mt-1 font-mono uppercase"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Business Address</Label>
                <Textarea
                  value={form.business_address}
                  onChange={(e) => setField("business_address", e.target.value)}
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
              <div>
                <Label>Client Name *</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setField("client_name", e.target.value)}
                  placeholder="Client name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Client Email</Label>
                <Input
                  value={form.client_email}
                  onChange={(e) => setField("client_email", e.target.value)}
                  placeholder="client@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Client GST Number</Label>
                <Input
                  value={form.client_gst}
                  onChange={(e) => setField("client_gst", e.target.value)}
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  className="mt-1 font-mono uppercase"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Billing Address</Label>
                <Textarea
                  value={form.client_address}
                  onChange={(e) => setField("client_address", e.target.value)}
                  placeholder="Client billing address"
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Line Items</h3>

              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add item
              </Button>
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
                    onChange={(e) =>
                      setItem(item.id, { description: e.target.value })
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
                        onChange={(e) =>
                          setItem(item.id, { quantity: e.target.value })
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
                        onChange={(e) =>
                          setItem(item.id, { rate: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Amount
                      </p>
                      <div className="flex h-9 items-center justify-end rounded-md border bg-muted/30 px-3">
                        <span className="tabular-nums text-sm font-semibold">
                          {formatCurrency(
                            (parseFloat(item.quantity) || 0) *
                              (parseFloat(item.rate) || 0),
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
                onChange={(e) => setField("tax_rate", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Discount (%)</Label>
              <Input
                type="number"
                value={form.discount}
                onChange={(e) => setField("discount", e.target.value)}
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
                onChange={(e) => setField("payment_type", e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="upi">UPI</option>
                <option value="paypal">PayPal Link</option>
                <option value="stripe">Stripe Link</option>
                <option value="bank">Bank Transfer</option>
                <option value="custom">Custom Link</option>
                <option value="none">No Payment Info</option>
              </select>
            </div>

            {form.payment_type === "bank" ? (
              <div className="space-y-3">
                <div>
                  <Label>Account Name</Label>
                  <Input
                    placeholder="Your Name"
                    value={form.bank_name || ""}
                    onChange={(e) => setField("bank_name", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Account Number</Label>
                  <Input
                    placeholder="1234567890"
                    value={form.bank_account || ""}
                    onChange={(e) => setField("bank_account", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Bank Name / IFSC</Label>
                  <Input
                    placeholder="HDFC Bank / HDFC0001234"
                    value={form.bank_ifsc || ""}
                    onChange={(e) => setField("bank_ifsc", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              form.payment_type !== "none" && (
                <div>
                  <Label>
                    {form.payment_type === "upi"
                      ? "UPI ID"
                      : form.payment_type === "paypal"
                      ? "PayPal Link"
                      : form.payment_type === "stripe"
                      ? "Stripe Payment Link"
                      : "Custom Payment Link"}
                  </Label>
                  <Input
                    placeholder={
                      form.payment_type === "upi"
                        ? "yourname@upi"
                        : "https://yourpaymentlink.com"
                    }
                    value={form.upi_id || ""}
                    onChange={(e) => setField("upi_id", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )
            )}

            {form.payment_type === "upi" && (
              <div>
                <Label>UPI QR Image</Label>
                <label className="mt-1 flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:border-foreground/40">
                  <QrCode className="h-4 w-4" />
                  {form.qr_image ? "Replace QR" : "Upload QR (optional)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImage(e.target.files?.[0], "qr_image")
                    }
                  />
                </label>
              </div>
            )}

            <div>
              <Label>Logo</Label>
              <label className="mt-1 flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:border-foreground/40">
                <ImageIcon className="h-4 w-4" />
                {form.logo ? "Replace logo" : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0], "logo")}
                />
              </label>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Terms</Label>
              <Textarea
                value={form.terms}
                onChange={(e) => setField("terms", e.target.value)}
                rows={2}
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

          <Badge
            className={`mt-3 capitalize ${
              STATUS_STYLES[form.status] || STATUS_STYLES.draft
            }`}
          >
            {form.status}
          </Badge>
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
              <PartyPopper className="h-8 w-8 text-emerald-600" />
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
    </div>
  );
}

function InvoiceTemplate({ template, form, totals, currency = "INR", large = false }) {
  const accent =
    template === "corporate"
      ? "#1a3a6b"
      : template === "teal"
      ? "#00897b"
      : template === "orange"
      ? "#f97316"
      : template === "minimal"
      ? "#111827"
      : "#6d28d9";

  const headerClass =
    template === "classic" || template === "minimal"
      ? "border-b pb-5 mb-6"
      : "rounded-lg p-5 mb-6 text-white";

  const headerStyle =
    template === "classic" || template === "minimal"
      ? {}
      : {
          background:
            template === "modern"
              ? "linear-gradient(135deg, #7c3aed, #2563eb)"
              : accent,
        };

  return (
    <div className={`${large ? "text-sm" : "text-[11px]"} bg-white text-gray-900`}>
      <div className={headerClass} style={headerStyle}>
        <div className="flex items-start justify-between gap-6">
          <div>
            {form.logo ? (
              <img
                src={form.logo}
                alt=""
                className="mb-2 h-12 max-w-[140px] object-contain"
              />
            ) : (
              <p
                className={`font-bold ${
                  large ? "text-2xl" : "text-base"
                }`}
              >
                {form.business?.name || "Your Business"}
              </p>
            )}

            <p className="opacity-80">{form.business?.email}</p>
            <p className="opacity-80">{form.business?.phone}</p>
            <p className="whitespace-pre-wrap opacity-80">
              {form.business?.address}
            </p>
            {form.business?.gst && (
              <p className="mt-1 text-[9px] opacity-70">GST: {form.business.gst}</p>
            )}
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest opacity-70">
              Invoice
            </p>
            <p className={`font-mono font-bold ${large ? "text-2xl" : "text-base"}`}>
              {form.invoiceNumber}
            </p>
            <Badge className="mt-2 capitalize">{form.status}</Badge>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-500">
            Bill To
          </p>
          <p className="font-semibold">{form.clientName || "—"}</p>
          <p className="text-gray-600">{form.clientEmail}</p>
          <p className="whitespace-pre-wrap text-gray-600">{form.clientAddress}</p>
          {form.clientGst && (
            <p className="mt-1 text-[9px] text-gray-500">GST: {form.clientGst}</p>
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

      <table className="mb-5 w-full">
        <thead>
          <tr className="border-y bg-gray-50">
            <th className="p-2 text-left text-[9px] font-semibold uppercase tracking-wider">
              Description
            </th>
            <th className="p-2 text-right text-[9px] font-semibold uppercase tracking-wider">
              Qty
            </th>
            <th className="p-2 text-right text-[9px] font-semibold uppercase tracking-wider">
              Rate
            </th>
            <th className="p-2 text-right text-[9px] font-semibold uppercase tracking-wider">
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          {(form.items || []).map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-2">{item.description || "—"} </td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right tabular-nums">
                {formatCurrency(item.rate, currency)}
              </td>
              <td className="p-2 text-right font-medium tabular-nums">
                {formatCurrency(
                  (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
                  currency
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-6 flex justify-end">
        <div className="w-56 space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatCurrency(totals.subtotal, currency)}
            </span>
          </div>

          {totals.discountAmt > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount ({form.discount}%)</span>
              <span className="tabular-nums">
                -{formatCurrency(totals.discountAmt, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>GST ({form.taxRate}%)</span>
            <span className="tabular-nums">
              {formatCurrency(totals.taxAmt, currency)}
            </span>
          </div>

          <div
            className="mt-1 flex justify-between border-t pt-2 text-base font-bold"
            style={{ color: accent }}
          >
            <span>Total</span>
            <span className="tabular-nums">
              {formatCurrency(totals.total, currency)}
            </span>
          </div>
        </div>
      </div>

      {form.paymentType !== "none" &&
        (form.upiId || form.bankName || form.bankAccount) && (
          <div className="mb-5 flex items-center gap-3 rounded-md border bg-gray-50 p-3">
            {form.qrImage && form.paymentType === "upi" && (
              <img
                src={form.qrImage}
                alt="QR"
                className="h-16 w-16 rounded border bg-white object-contain"
              />
            )}

            <div className="text-[10px]">
              <p className="font-semibold uppercase tracking-wider text-gray-500">
                {form.paymentType === "upi"
                  ? "Pay via UPI"
                  : form.paymentType === "paypal"
                  ? "Pay via PayPal"
                  : form.paymentType === "stripe"
                  ? "Pay via Stripe"
                  : form.paymentType === "bank"
                  ? "Bank Transfer"
                  : "Payment Link"}
              </p>

              {form.upiId && <p className="mt-0.5 font-mono">{form.upiId}</p>}

              {form.paymentType === "bank" && (
                <p className="text-gray-500">
                  {form.bankName} {form.bankAccount && `| ${form.bankAccount}`}{" "}
                  {form.bankIfsc && `| ${form.bankIfsc}`}
                </p>
              )}
            </div>
          </div>
        )}

      {form.notes && <p className="mb-3 italic text-gray-700">{form.notes}</p>}

      {form.terms && (
        <div className="border-t pt-3 text-[9px] text-gray-500">
          {form.terms}
        </div>
      )}

      {form.status === "paid" && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-center font-semibold text-emerald-800">
          ✓ Paid — Thank you for your business!
        </div>
      )}
    </div>
  );
}
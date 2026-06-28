import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Save, Eye, Download, MessageCircle, Plus, Trash2,
  CheckCircle2, Image as ImageIcon, QrCode, PartyPopper, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Clean & timeless", plan: "starter" },
  { id: "modern", name: "Modern", desc: "Bold gradient header", plan: "starter" },
  { id: "minimal", name: "Minimal", desc: "Pure typography", plan: "pro" },
  { id: "corporate", name: "Corporate", desc: "Blue corporate style", plan: "pro" },
  { id: "teal", name: "Teal Pro", desc: "Teal geometric style", plan: "pro" },
  { id: "orange", name: "Orange Bold", desc: "Dark navy & orange", plan: "pro" },
];

const STATUS_STYLES = {
  paid: "bg-emerald-600 text-white border-emerald-600",
  pending: "bg-amber-500 text-white border-amber-500",
  overdue: "bg-rose-600 text-white border-rose-600",
  draft: "bg-muted text-muted-foreground border-border",
};

function emptyItem() {
  return { id: Math.random().toString(36).slice(2), description: "", quantity: 1, rate: 0 };
}

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const editing = !!id;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [preview, setPreview] = useState(false);
  const [paidDialog, setPaidDialog] = useState(false);
  const previewRef = useRef(null);

  const [form, setForm] = useState({
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
    business_name: "",
    business_email: "",
    business_phone: "",
    business_address: "",
    business_gst: "",
  });

  useEffect(() => {
    if (editing) loadInvoice();
  }, [id]);

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
      setForm({
        ...form,
        ...data,
        items: data.items || [emptyItem()],
      });
    } catch (err) {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const items = form.items || [];
    const subtotal = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), 0);
    const discountAmt = (subtotal * (parseFloat(form.discount) || 0)) / 100;
    const taxable = subtotal - discountAmt;
    const taxAmt = (taxable * (parseFloat(form.tax_rate) || 0)) / 100;
    const total = taxable + taxAmt;
    return { subtotal, discountAmt, taxAmt, total };
  }, [form]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setItem = (iid, patch) => setForm(f => ({
    ...f,
    items: f.items.map(it => it.id === iid ? { ...it, ...patch } : it)
  }));

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));

  const removeItem = (iid) => setForm(f => ({
    ...f,
    items: f.items.length > 1 ? f.items.filter(it => it.id !== iid) : f.items
  }));

  const handleImage = (file, key) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField(key, reader.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.client_name.trim()) {
      toast.error("Client name is required");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      template: form.template,
      invoice_number: form.invoice_number,
      status: form.status,
      client_name: form.client_name,
      client_email: form.client_email,
      client_address: form.client_address,
      client_gst: form.client_gst,
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
      updated_at: new Date().toISOString(),
    };

    try {
      if (editing) {
        const { error } = await supabase
          .from("invoices")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Invoice saved");
      } else {
        const { data: newInv, error } = await supabase
          .from("invoices")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        toast.success("Invoice created");
        navigate(`/invoices/${newInv.id}`, { replace: true });
      }
    } catch (err) {
      toast.error("Error saving invoice: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    if (!editing) { toast.error("Save the invoice first"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setField("status", "paid");
      setPaidDialog(true);
    } catch (err) {
      toast.error("Failed to mark as paid");
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = async () => {
    const node = previewRef.current;
    if (!node) { setPreview(true); setTimeout(downloadPDF, 350); return; }
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pw / canvas.width, ph / canvas.height);
      pdf.addImage(img, "JPEG", 0, 0, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`${form.invoice_number}.pdf`);
    } catch (e) {
      toast.error("PDF generation failed");
    }
  };

  const shareWA = () => {
    const itemsList = form.items
      .filter(it => it.description)
      .map(it => `  • ${it.description} × ${it.quantity} — ${formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), currency)}`)
      .join("\n");

    const msg = `📄 *INVOICE ${form.invoice_number}*
━━━━━━━━━━━━━━━━━━━━
*From:* ${form.business_name || "Your Business"}
*To:* ${form.client_name || "—"}
━━━━━━━━━━━━━━━━━━━━
*Items:*
${itemsList || "  • No items added"}
━━━━━━━━━━━━━━━━━━━━
Subtotal: ${formatCurrency(totals.subtotal, currency)}
Tax (${form.tax_rate}%): ${formatCurrency(totals.taxAmt, currency)}
*Total: ${formatCurrency(totals.total, currency)}*
━━━━━━━━━━━━━━━━━━━━
📅 Due: ${formatDate(form.due_date)}
━━━━━━━━━━━━━━━━━━━━
_Sent via GigVorx_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(true)}>
            <Eye className="w-4 h-4 mr-1.5" />Preview
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPDF}>
            <Download className="w-4 h-4 mr-1.5" />Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={shareWA}>
            <MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp
          </Button>
          {form.status !== "paid" && (
            <Button variant="outline" size="sm" onClick={markPaid} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />Mark as paid
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving} className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
            {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-1.5" />Save</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Template */}
          <Card className="p-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Template</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setField("template", t.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    form.template === t.id ? "border-[#FF6B00] shadow-sm" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Invoice Details */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Invoice Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label>Invoice #</Label>
                <Input value={form.invoice_number} onChange={(e) => setField("invoice_number", e.target.value)} className="mt-1 font-mono" />
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={(e) => setField("status", e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={form.issue_date} onChange={(e) => setField("issue_date", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setField("due_date", e.target.value)} className="mt-1" />
              </div>
            </div>
          </Card>

          {/* Your Business Info */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Your Business</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Business Name</Label>
                <Input value={form.business_name} onChange={(e) => setField("business_name", e.target.value)} placeholder="Your Business Name" className="mt-1" />
              </div>
              <div>
                <Label>Business Email</Label>
                <Input value={form.business_email} onChange={(e) => setField("business_email", e.target.value)} placeholder="you@business.com" className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.business_phone} onChange={(e) => setField("business_phone", e.target.value)} placeholder="+91 98765 43210" className="mt-1" />
              </div>
              <div>
                <Label>Your GST Number</Label>
                <Input value={form.business_gst} onChange={(e) => setField("business_gst", e.target.value)} placeholder="e.g. 27AAPFU0939F1ZV" className="mt-1 font-mono uppercase" />
              </div>
              <div className="md:col-span-2">
                <Label>Business Address</Label>
                <Textarea value={form.business_address} onChange={(e) => setField("business_address", e.target.value)} placeholder="Your business address" className="mt-1" rows={2} />
              </div>
            </div>
          </Card>

          {/* Client */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Client Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Client Name *</Label>
                <Input value={form.client_name} onChange={(e) => setField("client_name", e.target.value)} placeholder="Client name" className="mt-1" />
              </div>
              <div>
                <Label>Client Email</Label>
                <Input value={form.client_email} onChange={(e) => setField("client_email", e.target.value)} placeholder="client@example.com" className="mt-1" />
              </div>
              <div>
                <Label>Client GST Number</Label>
                <Input value={form.client_gst} onChange={(e) => setField("client_gst", e.target.value)} placeholder="e.g. 27AAPFU0939F1ZV" className="mt-1 font-mono uppercase" />
              </div>
              <div className="md:col-span-2">
                <Label>Billing Address</Label>
                <Textarea value={form.client_address} onChange={(e) => setField("client_address", e.target.value)} placeholder="Client billing address" className="mt-1" rows={2} />
              </div>
            </div>
          </Card>

          {/* Line Items */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Line Items</h3>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add item
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={it.id} className="border rounded-lg p-3 space-y-2 group relative">
                  <Input
                    placeholder="Item or service description"
                    value={it.description}
                    onChange={(e) => setItem(it.id, { description: e.target.value })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Qty</p>
                      <Input type="number" value={it.quantity} onChange={(e) => setItem(it.id, { quantity: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Rate ({currency})</p>
                      <Input type="number" value={it.rate} onChange={(e) => setItem(it.id, { rate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount</p>
                      <div className="h-9 px-3 rounded-md border bg-muted/30 flex items-center justify-end">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Tax & Discount */}
          <Card className="p-5 grid grid-cols-2 gap-3">
            <div>
              <Label>GST / Tax (%)</Label>
              <Input type="number" value={form.tax_rate} onChange={(e) => setField("tax_rate", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Discount (%)</Label>
              <Input type="number" value={form.discount} onChange={(e) => setField("discount", e.target.value)} className="mt-1" />
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Payment & Branding</h3>
            <div>
              <Label>Payment Method</Label>
              <select value={form.payment_type || "upi"} onChange={(e) => setField("payment_type", e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                <option value="upi">UPI (India)</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="bank">Bank Transfer</option>
                <option value="custom">Custom Link</option>
                <option value="none">No Payment Info</option>
              </select>
            </div>

            {(form.payment_type === "upi" || !form.payment_type) && (
              <div className="space-y-3">
                <div>
                  <Label>UPI ID</Label>
                  <Input placeholder="yourname@upi" value={form.upi_id || ""} onChange={(e) => setField("upi_id", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>UPI QR Image</Label>
                  <label className="mt-1 flex items-center gap-2 h-9 px-3 rounded-md border bg-background cursor-pointer hover:border-foreground/40 text-sm">
                    <QrCode className="w-4 h-4" />
                    {form.qr_image ? "Replace QR" : "Upload QR (optional)"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0], "qr_image")} />
                  </label>
                </div>
              </div>
            )}

            {form.payment_type === "paypal" && (
              <div>
                <Label>PayPal Link</Label>
                <Input placeholder="https://paypal.me/yourname" value={form.upi_id || ""} onChange={(e) => setField("upi_id", e.target.value)} className="mt-1" />
              </div>
            )}

            {form.payment_type === "stripe" && (
              <div>
                <Label>Stripe Payment Link</Label>
                <Input placeholder="https://buy.stripe.com/your-link" value={form.upi_id || ""} onChange={(e) => setField("upi_id", e.target.value)} className="mt-1" />
              </div>
            )}

            {form.payment_type === "bank" && (
              <div className="space-y-3">
                <div>
                  <Label>Account Name</Label>
                  <Input placeholder="Your Name" value={form.bank_name || ""} onChange={(e) => setField("bank_name", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input placeholder="1234567890" value={form.bank_account || ""} onChange={(e) => setField("bank_account", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Bank Name / IFSC</Label>
                  <Input placeholder="HDFC Bank / HDFC0001234" value={form.bank_ifsc || ""} onChange={(e) => setField("bank_ifsc", e.target.value)} className="mt-1" />
                </div>
              </div>
            )}

            {form.payment_type === "custom" && (
              <div>
                <Label>Custom Payment Link</Label>
                <Input placeholder="https://yourpaymentlink.com" value={form.upi_id || ""} onChange={(e) => setField("upi_id", e.target.value)} className="mt-1" />
              </div>
            )}

            <div>
              <Label>Logo</Label>
              <label className="mt-1 flex items-center gap-2 h-9 px-3 rounded-md border bg-background cursor-pointer hover:border-foreground/40 text-sm">
                <ImageIcon className="w-4 h-4" />
                {form.logo ? "Replace logo" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0], "logo")} />
              </label>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Terms</Label>
              <Textarea value={form.terms} onChange={(e) => setField("terms", e.target.value)} rows={2} className="mt-1" />
            </div>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Live preview</p>
          <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
            <div ref={previewRef} className="p-6 text-[11px] leading-tight" style={{ minHeight: 500 }}>
              <InvoiceTemplate template={form.template} form={formForTemplate} totals={totals} currency={currency} />
            </div>
          </div>
          <Badge className={`mt-3 ${STATUS_STYLES[form.status]} capitalize`}>{form.status}</Badge>
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0">
          <DialogHeader className="px-6 pt-6"><DialogTitle>Invoice Preview</DialogTitle></DialogHeader>
          <div className="p-8">
            <InvoiceTemplate template={form.template} form={formForTemplate} totals={totals} currency={currency} large />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paidDialog} onOpenChange={setPaidDialog}>
        <DialogContent className="max-w-md text-center">
          <div className="py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <PartyPopper className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold">Payment received!</h3>
            <p className="text-muted-foreground mt-2">Invoice <b>{form.invoice_number}</b> marked as paid.</p>
            <div className="mt-6 flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setPaidDialog(false)}>Close</Button>
              <Button onClick={() => { setPaidDialog(false); shareWA(); }} className="bg-[#FF6B00] text-white">Send thank you on WhatsApp</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── INVOICE TEMPLATE ROUTER ─────────────────────────────────────────────────
function InvoiceTemplate({ template, form, totals, currency = "INR", large = false }) {
  if (template === "corporate") return <CorporateBlueTemplate form={form} totals={totals} currency={currency} large={large} />;
  if (template === "teal") return <TealProTemplate form={form} totals={totals} currency={currency} large={large} />;
  if (template === "orange") return <OrangeBoldTemplate form={form} totals={totals} currency={currency} large={large} />;

  const sz = large ? "text-sm" : "text-[11px]";

  if (template === "modern") {
    return (
      <div className={`${sz} text-gray-900`}>
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-6 rounded-lg flex items-start justify-between mb-6">
          <div>
            {form.logo
              ? <img src={form.logo} alt="" className="h-10 mb-2 bg-white/10 rounded p-1" />
              : <div className={`font-bold ${large ? "text-2xl" : "text-base"}`}>{form.business?.name}</div>
            }
            <p className="opacity-80">{form.business?.email}</p>
            {form.business?.gst && <p className="opacity-70 text-[9px]">GST: {form.business.gst}</p>}
          </div>
          <div className="text-right">
            <p className="opacity-80 uppercase tracking-widest text-[10px]">Invoice</p>
            <p className={`font-mono font-bold ${large ? "text-2xl" : "text-base"}`}>{form.invoiceNumber}</p>
            <Badge className="mt-1 bg-white/20 text-white capitalize">{form.status}</Badge>
          </div>
        </div>
        <BodyBlock form={form} totals={totals} currency={currency} large={large} />
      </div>
    );
  }

  if (template === "minimal") {
    return (
      <div className={`${sz} text-gray-900`}>
        <div className="flex items-start justify-between mb-8 pb-4 border-b">
          <div>
            <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-gray-500">{form.business?.name}</p>
            {form.business?.gst && <p className="text-[9px] text-gray-400">GST: {form.business.gst}</p>}
            <h1 className={`${large ? "text-4xl" : "text-2xl"} font-bold tracking-tight mt-2`}>Invoice</h1>
          </div>
          <div className="text-right">
            <p className="font-mono">{form.invoiceNumber}</p>
            <p className="text-gray-500">{formatDate(form.issueDate)}</p>
          </div>
        </div>
        <BodyBlock form={form} totals={totals} currency={currency} large={large} />
      </div>
    );
  }

  return (
    <div className={`${sz} text-gray-900`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          {form.logo
            ? <img src={form.logo} alt="" className="h-12 mb-2" />
            : <div className={`font-bold ${large ? "text-xl" : "text-base"}`}>{form.business?.name}</div>
          }
          <p className="text-gray-600">{form.business?.email}</p>
          <p className="text-gray-600">{form.business?.phone}</p>
          {form.business?.gst && <p className="text-gray-500 text-[9px]">GST: {form.business.gst}</p>}
        </div>
        <div className="text-right">
          <h1 className={`${large ? "text-3xl" : "text-xl"} font-bold`}>INVOICE</h1>
          <p className="font-mono mt-1">{form.invoiceNumber}</p>
          <Badge className="mt-1 capitalize bg-gray-200 text-gray-700">{form.status}</Badge>
        </div>
      </div>
      <BodyBlock form={form} totals={totals} currency={currency} large={large} />
    </div>
  );
}

// ─── BODY BLOCK ───────────────────────────────────────────────────────────────
function BodyBlock({ form, totals, currency = "INR", large }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="uppercase tracking-widest text-[9px] font-semibold text-gray-500 mb-1">Bill To</p>
          <p className="font-semibold">{form.clientName || "—"}</p>
          <p className="text-gray-600">{form.clientEmail}</p>
          <p className="text-gray-600 whitespace-pre-wrap">{form.clientAddress}</p>
          {form.clientGst && <p className="text-gray-500 text-[9px] mt-1">GST: {form.clientGst}</p>}
        </div>
        <div className="text-right">
          <p className="uppercase tracking-widest text-[9px] font-semibold text-gray-500 mb-1">Dates</p>
          <p>Issued: <span className="font-medium">{formatDate(form.issueDate)}</span></p>
          <p>Due: <span className="font-medium">{formatDate(form.dueDate)}</span></p>
        </div>
      </div>
      <table className="w-full mb-5">
        <thead>
          <tr className="border-y bg-gray-50">
            <th className="text-left p-2 font-semibold uppercase tracking-wider text-[9px]">Description</th>
            <th className="text-right p-2 font-semibold uppercase tracking-wider text-[9px]">Qty</th>
            <th className="text-right p-2 font-semibold uppercase tracking-wider text-[9px]">Rate</th>
            <th className="text-right p-2 font-semibold uppercase tracking-wider text-[9px]">Amount</th>
          </tr>
        </thead>
        <tbody>
          {form.items.map(it => (
            <tr key={it.id} className="border-b">
              <td className="p-2">{it.description || "—"}</td>
              <td className="p-2 text-right">{it.quantity}</td>
              <td className="p-2 text-right tabular-nums">{formatCurrency(it.rate, currency)}</td>
              <td className="p-2 text-right font-medium tabular-nums">{formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end mb-6">
        <div className="w-56 space-y-1">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span></div>
          {totals.discountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({form.discount}%)</span><span className="tabular-nums">−{formatCurrency(totals.discountAmt, currency)}</span></div>}
          <div className="flex justify-between text-gray-600"><span>GST ({form.taxRate}%)</span><span className="tabular-nums">{formatCurrency(totals.taxAmt, currency)}</span></div>
          <div className="flex justify-between font-bold text-base pt-2 border-t mt-1"><span>Total</span><span className="tabular-nums">{formatCurrency(totals.total, currency)}</span></div>
        </div>
      </div>
      {form.upiId && form.paymentType !== "none" && (
        <div className="p-3 rounded-md bg-gray-50 border mb-5 flex items-center gap-3">
          {form.qrImage && form.paymentType === "upi" && (
            <img src={form.qrImage} alt="QR" className="w-16 h-16 object-contain bg-white rounded border" />
          )}
          <div className="text-[10px]">
            <p className="font-semibold uppercase tracking-wider text-gray-500">
              {form.paymentType === "upi" ? "Pay via UPI" : form.paymentType === "paypal" ? "Pay via PayPal" : form.paymentType === "stripe" ? "Pay via Stripe" : form.paymentType === "bank" ? "Bank Transfer" : "Payment Link"}
            </p>
            <p className="font-mono mt-0.5">{form.upiId}</p>
            {form.paymentType === "bank" && form.bankName && (
              <p className="text-gray-500">Account: {form.bankName} | {form.bankAccount}</p>
            )}
          </div>
        </div>
      )}
      {form.notes && <p className="text-gray-700 italic mb-3">{form.notes}</p>}
      {form.terms && <div className="pt-3 border-t text-[9px] text-gray-500">{form.terms}</div>}
      {form.status === "paid" && (
        <div className="mt-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-semibold">
          ✓ Paid — Thank you for your business!
        </div>
      )}
    </>
  );
}

// ─── CORPORATE BLUE TEMPLATE ──────────────────────────────────────────────────
function CorporateBlueTemplate({ form, totals, currency, large }) {
  const sz = large ? "text-sm" : "text-[10px]";
  return (
    <div className={`${sz} text-gray-900 bg-white`}>
      <div className="relative bg-[#1a3a6b] text-white px-6 py-3 flex items-center justify-between overflow-hidden">
        <div className="space-y-0.5 z-10">
          <div className="flex items-center gap-3 text-[9px] text-blue-200">
            <span>📞 {form.business?.phone || "000 1234-56789"}</span>
            <span>✉ {form.business?.email || "your@email.com"}</span>
          </div>
          <div className="text-[9px] text-blue-200">📍 {form.business?.address || "Your Address"}</div>
          {form.business?.gst && <div className="text-[9px] text-blue-200">GST: {form.business.gst}</div>}
        </div>
        <div className="z-10 text-right">
          {form.logo
            ? <img src={form.logo} alt="" className="h-10 object-contain" />
            : <p className="font-extrabold text-lg text-white">{form.business?.name || "BRAND"}</p>
          }
        </div>
        <div className="absolute right-20 -top-4 w-16 h-16 rounded-full border-4 border-blue-400/40" />
        <div className="absolute right-12 -top-2 w-12 h-12 rounded-full bg-blue-500/30" />
        <div className="absolute right-4 top-0 w-10 h-10 rounded-full bg-blue-600/40" />
      </div>
      <div className="flex justify-between px-6 py-4">
        <div>
          <p className="text-[8px] font-bold text-blue-600 uppercase tracking-wider mb-1">Invoice To:</p>
          <p className="font-bold text-sm">{form.clientName || "Client Name"}</p>
          <p className="text-gray-500">{form.clientEmail}</p>
          <p className="text-gray-500 whitespace-pre-wrap">{form.clientAddress}</p>
          {form.clientGst && <p className="text-gray-500 text-[9px]">GST: {form.clientGst}</p>}
        </div>
        <div className="text-right">
          <p className="font-extrabold text-2xl text-gray-800">INVOICE</p>
          <p className="text-gray-500 mt-1">Invoice No: <span className="font-semibold text-gray-800">{form.invoiceNumber}</span></p>
          <p className="text-gray-500">Date: <span className="font-semibold text-gray-800">{formatDate(form.issueDate)}</span></p>
          <p className="text-gray-500">Due: <span className="font-semibold text-gray-800">{formatDate(form.dueDate)}</span></p>
        </div>
      </div>
      <div className="px-6">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1a3a6b] text-white">
              <th className="p-2 text-left text-[9px] uppercase tracking-wider">Sl.N.</th>
              <th className="p-2 text-left text-[9px] uppercase tracking-wider">Description</th>
              <th className="p-2 text-right text-[9px] uppercase tracking-wider">Rate</th>
              <th className="p-2 text-right text-[9px] uppercase tracking-wider">Qty</th>
              <th className="p-2 text-right text-[9px] uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((it, i) => (
              <tr key={it.id} className={i % 2 === 0 ? "bg-blue-50/50" : "bg-white"}>
                <td className="p-2 text-center">{String(i + 1).padStart(2, "0")}</td>
                <td className="p-2">{it.description || "—"}</td>
                <td className="p-2 text-right tabular-nums">{formatCurrency(it.rate, currency)}</td>
                <td className="p-2 text-right">{it.quantity}</td>
                <td className="p-2 text-right font-semibold tabular-nums">{formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between px-6 mt-4 gap-4">
        <div className="flex-1">
          <p className="text-gray-600 italic mb-2">{form.notes}</p>
          {form.upiId && form.paymentType !== "none" && (
            <div>
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-1">Payment</p>
              <p className="text-gray-600">{form.upiId}</p>
              {form.bankName && <p className="text-gray-600">Account: {form.bankName} | {form.bankAccount}</p>}
            </div>
          )}
        </div>
        <div className="w-44 space-y-1">
          <div className="flex justify-between text-gray-600"><span>SubTotal</span><span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span></div>
          {totals.discountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−{formatCurrency(totals.discountAmt, currency)}</span></div>}
          <div className="flex justify-between text-gray-600"><span>GST ({form.taxRate}%)</span><span className="tabular-nums">{formatCurrency(totals.taxAmt, currency)}</span></div>
          <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total</span><span className="tabular-nums">{formatCurrency(totals.total, currency)}</span></div>
        </div>
      </div>
      {form.terms && <div className="px-6 mt-3 text-[8px] text-gray-500 border-t pt-2"><span className="font-bold text-blue-600">Terms: </span>{form.terms}</div>}
      <div className="h-2 bg-[#1a3a6b] mx-6 mb-1 rounded-sm mt-4" />
    </div>
  );
}

// ─── TEAL PROFESSIONAL TEMPLATE ───────────────────────────────────────────────
function TealProTemplate({ form, totals, currency, large }) {
  const sz = large ? "text-sm" : "text-[10px]";
  return (
    <div className={`${sz} text-gray-900 bg-white`}>
      <div className="relative bg-[#1a1a2e] text-white px-6 py-4 flex justify-between items-start overflow-hidden">
        <div className="z-10">
          {form.logo
            ? <img src={form.logo} alt="" className="h-10 object-contain mb-1" />
            : <p className="font-extrabold text-lg text-white">{form.business?.name || "COMPANY"}</p>
          }
          {form.business?.gst && <p className="text-[8px] text-gray-400">GST: {form.business.gst}</p>}
        </div>
        <div className="z-10 bg-[#00897b] px-5 py-3 text-right">
          <p className="font-extrabold text-xl">INVOICE</p>
          <p className="text-[9px] text-teal-100 mt-1">No: <span className="font-bold">{form.invoiceNumber}</span></p>
          <p className="text-[9px] text-teal-100">Due: <span className="font-bold">{formatDate(form.dueDate)}</span></p>
        </div>
        <div className="absolute top-0 left-32 w-20 h-full bg-[#00897b]/20 skew-x-12" />
      </div>
      <div className="flex justify-between px-6 py-4 gap-4">
        <div>
          <p className="text-[8px] font-bold text-[#00897b] uppercase tracking-wider mb-1">Invoice To:</p>
          <p className="font-bold text-base">{form.clientName || "Client Name"}</p>
          <p className="text-[9px] text-gray-500">{form.clientEmail}</p>
          <p className="text-[9px] text-gray-500">{form.clientAddress}</p>
          {form.clientGst && <p className="text-[9px] text-gray-500">GST: {form.clientGst}</p>}
        </div>
        {form.upiId && form.paymentType !== "none" && (
          <div>
            <p className="text-[8px] font-bold text-[#00897b] uppercase tracking-wider mb-1">Payment</p>
            <p className="text-[9px] text-gray-600">{form.upiId}</p>
            {form.bankName && <p className="text-[9px] text-gray-600">Account: {form.bankName}</p>}
          </div>
        )}
      </div>
      <div className="px-6">
        <table className="w-full">
          <thead>
            <tr className="bg-[#00897b] text-white">
              <th className="p-2 text-left text-[9px] uppercase">No.</th>
              <th className="p-2 text-left text-[9px] uppercase">Description</th>
              <th className="p-2 text-right text-[9px] uppercase">Rate</th>
              <th className="p-2 text-right text-[9px] uppercase">Qty</th>
              <th className="p-2 text-right text-[9px] uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((it, i) => (
              <tr key={it.id} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="p-2">{String(i + 1).padStart(2, "0")}</td>
                <td className="p-2">{it.description || "—"}</td>
                <td className="p-2 text-right tabular-nums">{formatCurrency(it.rate, currency)}</td>
                <td className="p-2 text-right">{it.quantity}</td>
                <td className="p-2 text-right font-semibold tabular-nums">{formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end px-6 mt-3">
        <div className="w-48 space-y-1">
          <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span></div>
          {totals.discountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>Discount:</span><span>−{formatCurrency(totals.discountAmt, currency)}</span></div>}
          <div className="flex justify-between text-gray-600"><span>GST ({form.taxRate}%):</span><span className="tabular-nums">{formatCurrency(totals.taxAmt, currency)}</span></div>
          <div className="flex justify-between font-bold bg-[#00897b] text-white px-2 py-1 mt-1"><span>Total:</span><span className="tabular-nums">{formatCurrency(totals.total, currency)}</span></div>
        </div>
      </div>
      {form.terms && (
        <div className="px-6 mt-3">
          <p className="text-[9px] font-bold text-[#00897b] uppercase tracking-wider">Terms:</p>
          <p className="text-[8px] text-gray-500 mt-0.5">{form.terms}</p>
        </div>
      )}
      <div className="flex justify-between items-end px-6 mt-4 pb-2">
        <p className="font-bold text-sm">THANK YOU FOR YOUR BUSINESS.</p>
        <div className="text-right">
          <p className="text-gray-400 italic text-[9px]">{form.business?.name}</p>
        </div>
      </div>
      <div className="bg-[#1a1a2e] text-white px-6 py-2 flex justify-between mt-2">
        <span className="text-[9px] text-gray-400">{form.business?.phone}</span>
        <span className="text-[9px] text-gray-400">{form.business?.email}</span>
        <span className="text-[9px] text-gray-400">{form.business?.address}</span>
      </div>
    </div>
  );
}

// ─── ORANGE BOLD TEMPLATE ─────────────────────────────────────────────────────
function OrangeBoldTemplate({ form, totals, currency, large }) {
  const sz = large ? "text-sm" : "text-[10px]";
  return (
    <div className={`${sz} text-gray-900 bg-white`}>
      <div className="relative bg-[#1a1a2e] px-6 py-3 flex justify-between items-center overflow-hidden">
        <div className="z-10 flex items-center gap-3">
          {form.logo
            ? <img src={form.logo} alt="" className="h-10 object-contain" />
            : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">G</div>
                <div>
                  <p className="font-extrabold text-white text-sm">{form.business?.name || "COMPANY"}</p>
                  {form.business?.gst && <p className="text-[8px] text-gray-400">GST: {form.business.gst}</p>}
                </div>
              </div>
            )
          }
        </div>
        <div className="z-10 text-right text-[9px] text-gray-400 space-y-0.5">
          <p>📞 {form.business?.phone || "+000 0000 0000"}</p>
          <p>✉ {form.business?.email || "your@email.com"}</p>
        </div>
        <div className="absolute top-0 left-24 w-0 h-0 border-l-[20px] border-l-transparent border-t-[40px] border-t-orange-500" />
        <div className="absolute top-0 right-32 w-0 h-0 border-r-[20px] border-r-transparent border-t-[40px] border-t-orange-500" />
      </div>
      <div className="flex justify-between px-6 py-4">
        <div>
          <p className="text-[9px] text-gray-500">Invoice to</p>
          <p className="font-bold text-sm">{form.clientName || "Client Name"}</p>
          <p className="text-[9px] text-gray-500">{form.clientEmail}</p>
          <p className="text-[9px] text-gray-500">{form.clientAddress}</p>
          {form.clientGst && <p className="text-[9px] text-gray-500">GST: {form.clientGst}</p>}
        </div>
        <div className="text-center">
          <p className="font-extrabold text-2xl text-gray-800">INVOICE</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-gray-500">No: <span className="font-semibold">{form.invoiceNumber}</span></p>
          <p className="text-[9px] text-gray-500">Date: <span className="font-semibold">{formatDate(form.issueDate)}</span></p>
          <p className="text-[9px] text-gray-500">Due: <span className="font-semibold">{formatDate(form.dueDate)}</span></p>
        </div>
      </div>
      <div className="px-6">
        <table className="w-full">
          <thead>
            <tr>
              <th className="bg-[#1a1a2e] text-white p-2 text-left text-[9px] uppercase">Description</th>
              <th className="bg-orange-500 text-white p-2 text-right text-[9px] uppercase">Rate</th>
              <th className="bg-orange-500 text-white p-2 text-right text-[9px] uppercase">Qty</th>
              <th className="bg-orange-500 text-white p-2 text-right text-[9px] uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((it, i) => (
              <tr key={it.id} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="p-2 font-semibold">{it.description || "—"}</td>
                <td className="p-2 text-right tabular-nums">{formatCurrency(it.rate, currency)}</td>
                <td className="p-2 text-right">{it.quantity}</td>
                <td className="p-2 text-right font-semibold tabular-nums">{formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between px-6 mt-4 gap-4">
        {form.upiId && form.paymentType !== "none" && (
          <div>
            <p className="font-bold text-[9px] text-gray-700 mb-1">Payment</p>
            <p className="text-[9px] text-gray-600">{form.upiId}</p>
            {form.bankName && <p className="text-[9px] text-gray-600">Account: {form.bankName} | {form.bankAccount}</p>}
          </div>
        )}
        <div className="w-48 space-y-1 ml-auto">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>: {formatCurrency(totals.subtotal, currency)}</span></div>
          <div className="flex justify-between text-gray-600"><span>GST ({form.taxRate}%)</span><span>: {formatCurrency(totals.taxAmt, currency)}</span></div>
          {totals.discountAmt > 0 && <div className="flex justify-between text-gray-600"><span>Discount</span><span>: −{formatCurrency(totals.discountAmt, currency)}</span></div>}
          <div className="flex justify-between font-bold bg-[#1a1a2e] text-white px-2 py-1 mt-1">
            <span>TOTAL</span>
            <div className="bg-orange-500 px-2 -mr-2 flex items-center">
              <span className="tabular-nums">{formatCurrency(totals.total, currency)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-end px-6 mt-6 pb-4">
        <div>
          <p className="font-extrabold text-sm">THANK YOU FOR YOUR BUSINESS</p>
          {form.notes && <p className="text-[8px] text-gray-500 mt-1 max-w-[180px]">{form.notes}</p>}
        </div>
        <div className="text-right">
          <p className="font-bold text-sm">{form.business?.name}</p>
        </div>
      </div>
      <div className="flex bg-[#1a1a2e] mt-2">
        <div className="flex-1 h-3" />
        <div className="w-16 h-3 bg-orange-500 skew-x-12" />
        <div className="w-8 h-3 bg-orange-500" />
      </div>
    </div>
  );
}
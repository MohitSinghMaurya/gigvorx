import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from " @/lib/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCollection, useInvoiceNumber } from "@/lib/useCollection";
import { readSetting } from "@/lib/storage";
import { formatCurrency, formatDate, whatsappShare } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Save, Eye, Download, MessageCircle, Plus, Trash2,
  CheckCircle2, Image as ImageIcon, QrCode, PartyPopper,
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

const PLAN_RANK = { trial: 1, starter: 1, pro: 2, premium: 3, agency: 4 };
function canUsePlan(userPlan, requiredPlan) {
  return (PLAN_RANK[userPlan] || 1) >= (PLAN_RANK[requiredPlan] || 1);
}

const STATUS_STYLES = {
  paid: "bg-emerald-600 text-white border-emerald-600",
  pending: "bg-amber-500 text-white border-amber-500",
  overdue: "bg-rose-600 text-white border-rose-600",
  draft: "bg-muted text-muted-foreground border-border",
};

function emptyItem() {
  return { id: Math.random().toString(36).slice(2), description: "", quantity: 1, rate: 0 };
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { items: clients } = useCollection("clients");
  const invoices = useCollection("invoices");
  const nextNum = useInvoiceNumber();
  const editing = !!id;

  const [form, setForm] = useState(() => editing ? null : ({
    template: "modern",
    invoiceNumber: nextNum(),
    status: "draft",
    clientName: "", clientEmail: "", clientAddress: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    items: [emptyItem()],
    taxRate: 18, discount: 0,
    notes: "Thank you for your business!",
    terms: "Payment due within 14 days. Late payments incur 1.5% monthly interest.",
    logo: "", upiId: "", qrImage: "",
    paymentType: "upi",
    bankName: "", bankAccount: "", bankIfsc: "",
    business: readSetting(user?.id, "business", {
      name: user?.name || "Your business",
      email: user?.email || "",
      phone: "", address: "",
    }),
  }));

  const [preview, setPreview] = useState(false);
  const [paidDialog, setPaidDialog] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    if (editing) {
      const inv = invoices.get(id);
      if (inv) setForm({
        items: [emptyItem()],
        business: readSetting(user?.id, "business", { name: user?.name }),
        paymentType: "upi",
        bankName: "", bankAccount: "", bankIfsc: "",
        ...inv,
      });
    }
    // eslint-disable-next-line
  }, [id, invoices.items.length]);

  const totals = useMemo(() => {
    const items = form?.items || [];
    const subtotal = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), 0);
    const discountAmt = (subtotal * (parseFloat(form?.discount) || 0)) / 100;
    const taxable = subtotal - discountAmt;
    const taxAmt = (taxable * (parseFloat(form?.taxRate) || 0)) / 100;
    const total = taxable + taxAmt;
    return { subtotal, discountAmt, taxAmt, total };
  }, [form]);

  if (!form) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (iid, patch) => setForm(f => ({ ...f, items: f.items.map(it => it.id === iid ? { ...it, ...patch } : it) }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (iid) => setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter(it => it.id !== iid) : f.items }));

  const handleImage = (file, key) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField(key, reader.result);
    reader.readAsDataURL(file);
  };

  const save = () => {
    const payload = { ...form, ...totals };
    if (editing) { invoices.update(id, payload); toast.success("Invoice saved"); }
    else { const inv = invoices.create(payload); toast.success("Invoice created"); navigate(`/invoices/${inv.id}`, { replace: true }); }
  };

  const markPaid = () => {
    const payload = { ...form, status: "paid", paidAt: new Date().toISOString(), ...totals };
    if (editing) { invoices.update(id, payload); setForm(payload); setPaidDialog(true); }
    else toast.error("Save the invoice first");
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
      pdf.save(`${form.invoiceNumber}.pdf`);
    } catch (e) { toast.error("PDF generation failed"); }
  };

  const shareWA = () => {
    const itemsList = form.items
      .filter(it => it.description)
      .map(it => `  • ${it.description} × ${it.quantity} — ${formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), currency)}`)
      .join("\n");

    const paymentInfo = () => {
      if (form.paymentType === "none") return "";
      if (!form.paymentType || form.paymentType === "upi") return form.upiId ? `💳 Pay via UPI: ${form.upiId}` : "";
      if (form.paymentType === "paypal") return form.upiId ? `💳 Pay via PayPal: ${form.upiId}` : "";
      if (form.paymentType === "stripe") return form.upiId ? `💳 Pay via Stripe: ${form.upiId}` : "";
      if (form.paymentType === "bank") return form.bankAccount ? `🏦 Bank Transfer:\n  Account: ${form.bankName}\n  Number: ${form.bankAccount}\n  Bank: ${form.bankIfsc}` : "";
      if (form.paymentType === "custom") return form.upiId ? `💳 Payment Link: ${form.upiId}` : "";
      return "";
    };

    const msg = `📄 *INVOICE ${form.invoiceNumber}*
━━━━━━━━━━━━━━━━━━━━
*From:* ${form.business?.name}
*To:* ${form.clientName || "—"}
━━━━━━━━━━━━━━━━━━━━
*Items:*
${itemsList || "  • No items added"}
━━━━━━━━━━━━━━━━━━━━
Subtotal: ${formatCurrency(totals.subtotal, currency)}
${totals.discountAmt > 0 ? `Discount: −${formatCurrency(totals.discountAmt, currency)}\n` : ""}Tax (${form.taxRate}%): ${formatCurrency(totals.taxAmt, currency)}
*Total: ${formatCurrency(totals.total, currency)}*
━━━━━━━━━━━━━━━━━━━━
${paymentInfo()}
📅 Due: ${formatDate(form.dueDate)}
━━━━━━━━━━━━━━━━━━━━
_Sent via GigVorx_`;

    whatsappShare(msg);
  };

  const Tmpl = form.template;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} className="-ml-2" data-testid="back-invoices">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(true)} data-testid="inv-preview">
            <Eye className="w-4 h-4 mr-1.5" />Preview
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPDF} data-testid="inv-pdf">
            <Download className="w-4 h-4 mr-1.5" />Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={shareWA} data-testid="inv-whatsapp">
            <MessageCircle className="w-4 h-4 mr-1.5" />Share on WhatsApp
          </Button>
          {form.status !== "paid" && (
            <Button variant="outline" size="sm" onClick={markPaid} data-testid="inv-mark-paid" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />Mark as paid
            </Button>
          )}
          <Button size="sm" onClick={save} data-testid="inv-save" className="bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20">
            <Save className="w-4 h-4 mr-1.5" />Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Template Selector */}
          <Card className="p-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Template</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(t => {
                const locked = !canUsePlan(user?.plan, t.plan);
                return (
                  <button
                    key={t.id}
                    data-testid={`tmpl-${t.id}`}
                    onClick={() => {
                      if (locked) { toast.error("Upgrade to Pro to unlock this template"); return; }
                      setField("template", t.id);
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all relative ${
                      form.template === t.id
                        ? "border-foreground shadow-sm"
                        : locked
                        ? "border-border opacity-50 cursor-not-allowed"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    {locked && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">PRO</span>
                    )}
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Invoice Details */}
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label>Invoice #</Label>
                <Input data-testid="inv-number" value={form.invoiceNumber} onChange={(e) => setField("invoiceNumber", e.target.value)} className="mt-1 font-mono" />
              </div>
              <div>
                <Label>Status</Label>
                <select data-testid="inv-status" value={form.status} onChange={(e) => setField("status", e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div>
                <Label>Issue date</Label>
                <Input data-testid="inv-issue" type="date" value={form.issueDate} onChange={(e) => setField("issueDate", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Due date</Label>
                <Input data-testid="inv-due" type="date" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} className="mt-1" />
              </div>
            </div>
          </Card>

          {/* Client */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input data-testid="inv-client-name" list="inv-client-list" placeholder="Client name" value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} />
              <datalist id="inv-client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
              <Input data-testid="inv-client-email" placeholder="Client email" value={form.clientEmail} onChange={(e) => setField("clientEmail", e.target.value)} />
              <Textarea data-testid="inv-client-address" placeholder="Billing address" value={form.clientAddress} onChange={(e) => setField("clientAddress", e.target.value)} className="md:col-span-2" rows={2} />
            </div>
          </Card>

          {/* Line Items */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Line items</h3>
              <Button size="sm" variant="outline" onClick={addItem} data-testid="inv-add-item">
                <Plus className="w-3.5 h-3.5 mr-1" />Add item
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={it.id} className="border rounded-lg p-3 space-y-2 group relative">
                  <Input
                    data-testid={`item-desc-${i}`}
                    placeholder="Item or service"
                    value={it.description}
                    onChange={(e) => setItem(it.id, { description: e.target.value })}
                  />
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Qty</p>
                      <Input data-testid={`item-qty-${i}`} type="number" value={it.quantity} onChange={(e) => setItem(it.id, { quantity: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Rate</p>
                      <Input data-testid={`item-rate-${i}`} type="number" value={it.rate} onChange={(e) => setItem(it.id, { rate: e.target.value })} />
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
                    data-testid={`item-remove-${i}`}
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
              <Label>Tax / GST (%)</Label>
              <Input data-testid="inv-tax" type="number" value={form.taxRate} onChange={(e) => setField("taxRate", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Discount (%)</Label>
              <Input data-testid="inv-discount" type="number" value={form.discount} onChange={(e) => setField("discount", e.target.value)} className="mt-1" />
            </div>
          </Card>

          {/* Payment & Branding */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Payment & branding</h3>

            <div>
              <Label>Payment Method</Label>
              <select
                value={form.paymentType || "upi"}
                onChange={(e) => setField("paymentType", e.target.value)}
                className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="upi">UPI (India)</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="bank">Bank Transfer</option>
                <option value="custom">Custom Link</option>
                <option value="none">No Payment Info</option>
              </select>
            </div>

            {(!form.paymentType || form.paymentType === "upi") && (
              <div className="space-y-3">
                <div>
                  <Label>UPI ID</Label>
                  <Input data-testid="inv-upi" placeholder="yourname@upi" value={form.upiId || ""} onChange={(e) => setField("upiId", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>UPI QR Image</Label>
                  <label className="mt-1 flex items-center gap-2 h-9 px-3 rounded-md border bg-background cursor-pointer hover:border-foreground/40 text-sm">
                    <QrCode className="w-4 h-4" />
                    {form.qrImage ? "Replace QR" : "Upload QR (optional)"}
                    <input data-testid="inv-qr" type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0], "qrImage")} />
                  </label>
                </div>
              </div>
            )}

            {form.paymentType === "paypal" && (
              <div>
                <Label>PayPal Link</Label>
                <Input placeholder="https://paypal.me/yourname" value={form.upiId || ""} onChange={(e) => setField("upiId", e.target.value)} className="mt-1" />
              </div>
            )}

            {form.paymentType === "stripe" && (
              <div>
                <Label>Stripe Payment Link</Label>
                <Input placeholder="https://buy.stripe.com/your-link" value={form.upiId || ""} onChange={(e) => setField("upiId", e.target.value)} className="mt-1" />
              </div>
            )}

            {form.paymentType === "bank" && (
              <div className="space-y-3">
                <div>
                  <Label>Account Name</Label>
                  <Input placeholder="Your Name" value={form.bankName || ""} onChange={(e) => setField("bankName", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input placeholder="1234567890" value={form.bankAccount || ""} onChange={(e) => setField("bankAccount", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Bank Name / IFSC / SWIFT</Label>
                  <Input placeholder="HDFC Bank / HDFC0001234" value={form.bankIfsc || ""} onChange={(e) => setField("bankIfsc", e.target.value)} className="mt-1" />
                </div>
              </div>
            )}

            {form.paymentType === "custom" && (
              <div>
                <Label>Custom Payment Link</Label>
                <Input placeholder="https://yourpaymentlink.com" value={form.upiId || ""} onChange={(e) => setField("upiId", e.target.value)} className="mt-1" />
              </div>
            )}

            <div>
              <Label>Logo</Label>
              <label className="mt-1 flex items-center gap-2 h-9 px-3 rounded-md border bg-background cursor-pointer hover:border-foreground/40 text-sm">
                <ImageIcon className="w-4 h-4" />
                {form.logo ? "Replace logo" : "Upload logo"}
                <input data-testid="inv-logo" type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0], "logo")} />
              </label>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea data-testid="inv-notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Terms</Label>
              <Textarea data-testid="inv-terms" value={form.terms} onChange={(e) => setField("terms", e.target.value)} rows={2} className="mt-1" />
            </div>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Live preview</p>
          <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
            <div ref={previewRef} className="p-6 text-[11px] leading-tight" style={{ minHeight: 500 }}>
              <InvoiceTemplate template={Tmpl} form={form} totals={totals} currency={currency} />
            </div>
          </div>
          <Badge className={`mt-3 ${STATUS_STYLES[form.status]} capitalize`}>{form.status}</Badge>
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0">
          <DialogHeader className="px-6 pt-6"><DialogTitle>Invoice preview</DialogTitle></DialogHeader>
          <div className="p-8"><InvoiceTemplate template={Tmpl} form={form} totals={totals} currency={currency} large /></div>
        </DialogContent>
      </Dialog>

      <Dialog open={paidDialog} onOpenChange={setPaidDialog}>
        <DialogContent className="max-w-md text-center">
          <div className="py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <PartyPopper className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold">Payment received 🎉</h3>
            <p className="text-muted-foreground mt-2">Thank you for marking <b>{form.invoiceNumber}</b> as paid. We'll send a confirmation to your client.</p>
            <div className="mt-6 flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setPaidDialog(false)}>Close</Button>
              <Button onClick={() => { setPaidDialog(false); shareWA(); }} className="bg-brand-gradient text-white">Send thank you on WhatsApp</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── INVOICE TEMPLATE ROUTER ────────────────────────────────────────────────
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
            {form.logo ? <img src={form.logo} alt="" className="h-10 mb-2 bg-white/10 rounded p-1" /> : <div className={`font-bold ${large ? "text-2xl" : "text-base"}`}>{form.business?.name}</div>}
            <p className="opacity-80">{form.business?.email}</p>
          </div>
          <div className="text-right">
            <p className="opacity-80 uppercase tracking-widest text-[10px]">Invoice</p>
            <p className={`font-mono font-bold ${large ? "text-2xl" : "text-base"}`}>{form.invoiceNumber}</p>
            <Badge className={`mt-1 ${form.status === "paid" ? "bg-emerald-400" : form.status === "overdue" ? "bg-rose-400" : "bg-white/20"} text-white capitalize`}>{form.status}</Badge>
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
          {form.logo ? <img src={form.logo} alt="" className="h-12 mb-2" /> : <div className={`font-bold ${large ? "text-xl" : "text-base"}`}>{form.business?.name}</div>}
          <p className="text-gray-600">{form.business?.email}</p>
          <p className="text-gray-600">{form.business?.phone}</p>
        </div>
        <div className="text-right">
          <h1 className={`${large ? "text-3xl" : "text-xl"} font-bold`}>INVOICE</h1>
          <p className="font-mono mt-1">{form.invoiceNumber}</p>
          <Badge className={`mt-1 capitalize ${form.status === "paid" ? "bg-emerald-600" : form.status === "overdue" ? "bg-rose-600" : "bg-gray-200 text-gray-700"} text-white`}>{form.status}</Badge>
        </div>
      </div>
      <BodyBlock form={form} totals={totals} currency={currency} large={large} />
    </div>
  );
}

// ─── BODY BLOCK (Classic/Modern/Minimal) ────────────────────────────────────
function BodyBlock({ form, totals, currency = "INR", large }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="uppercase tracking-widest text-[9px] font-semibold text-gray-500 mb-1">Bill to</p>
          <p className="font-semibold">{form.clientName || "—"}</p>
          <p className="text-gray-600">{form.clientEmail}</p>
          <p className="text-gray-600 whitespace-pre-wrap">{form.clientAddress}</p>
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
          <div className="flex justify-between text-gray-600"><span>Tax ({form.taxRate}%)</span><span className="tabular-nums">{formatCurrency(totals.taxAmt, currency)}</span></div>
          <div className="flex justify-between font-bold text-base pt-2 border-t mt-1"><span>Total</span><span className="tabular-nums">{formatCurrency(totals.total, currency)}</span></div>
        </div>
      </div>
      {form.upiId && form.paymentType !== "none" && (
        <div className="p-3 rounded-md bg-gray-50 border mb-5 flex items-center gap-3">
          {form.qrImage && form.paymentType === "upi" && <img src={form.qrImage} alt="QR" className="w-16 h-16 object-contain bg-white rounded border" />}
          <div className="text-[10px]">
            <p className="font-semibold uppercase tracking-wider text-gray-500">
              {form.paymentType === "upi" ? "Pay via UPI" : form.paymentType === "paypal" ? "Pay via PayPal" : form.paymentType === "stripe" ? "Pay via Stripe" : form.paymentType === "bank" ? "Bank Transfer" : "Payment Link"}
            </p>
            <p className="font-mono mt-0.5">{form.upiId}</p>
            {form.paymentType === "bank" && form.bankName && <p className="text-gray-500">Account: {form.bankName} | {form.bankAccount}</p>}
            {form.paymentType === "upi" && form.qrImage && <p className="text-gray-500">Scan QR with any UPI app</p>}
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

// ─── CORPORATE BLUE TEMPLATE ─────────────────────────────────────────────────
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
          <div className="text-[9px] text-blue-200">📍 {form.business?.address || "Your Address Here"}</div>
        </div>
        <div className="z-10 text-right">
          {form.logo
            ? <img src={form.logo} alt="" className="h-10 object-contain" />
            : <div><p className="font-extrabold text-lg text-white">{form.business?.name || "BRAND"}</p><p className="text-[9px] text-blue-300">TAGLINE</p></div>
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
        </div>
        <div className="text-right">
          <p className="font-extrabold text-2xl text-gray-800">INVOICE</p>
          <p className="text-gray-500 mt-1">Invoice No: <span className="font-semibold text-gray-800">{form.invoiceNumber}</span></p>
          <p className="text-gray-500">Invoice Date: <span className="font-semibold text-gray-800">{formatDate(form.issueDate)}</span></p>
          <p className="text-gray-500">Due Date: <span className="font-semibold text-gray-800">{formatDate(form.dueDate)}</span></p>
        </div>
      </div>
      <div className="px-6">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1a3a6b] text-white">
              <th className="p-2 text-left text-[9px] uppercase tracking-wider">Sl.N.</th>
              <th className="p-2 text-left text-[9px] uppercase tracking-wider">Item Description</th>
              <th className="p-2 text-right text-[9px] uppercase tracking-wider">Price</th>
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
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-1">Payment Method</p>
              <p className="text-gray-600">{form.upiId}</p>
              {form.bankName && <p className="text-gray-600">Account: {form.bankName}</p>}
              {form.bankAccount && <p className="text-gray-600">No: {form.bankAccount}</p>}
            </div>
          )}
        </div>
        <div className="w-44 space-y-1">
          <div className="flex justify-between text-gray-600"><span>SubTotal</span><span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span></div>
          {totals.discountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−{formatCurrency(totals.discountAmt, currency)}</span></div>}
          <div className="flex justify-between text-gray-600"><span>Tax ({form.taxRate}%)</span><span className="tabular-nums">{formatCurrency(totals.taxAmt, currency)}</span></div>
          <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total Amount</span><span className="tabular-nums">{formatCurrency(totals.total, currency)}</span></div>
        </div>
      </div>
      {form.terms && <div className="px-6 mt-3 text-[8px] text-gray-500 border-t pt-2"><span className="font-bold text-blue-600">Terms & Condition: </span>{form.terms}</div>}
      <div className="mt-4 flex justify-between items-end px-6 pb-4">
        <div />
        <div className="text-right">
          <p className="text-gray-400 italic text-[9px]">{form.business?.name}</p>
          <p className="font-bold text-sm">{form.business?.name?.toUpperCase()}</p>
          <p className="text-[9px] text-gray-500">General Manager</p>
        </div>
      </div>
      <div className="h-2 bg-[#1a3a6b] mx-6 mb-1 rounded-sm" />
    </div>
  );
}

// ─── TEAL PROFESSIONAL TEMPLATE ──────────────────────────────────────────────
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
          <p className="text-[9px] text-gray-400">Company Tagline Here</p>
        </div>
        <div className="z-10 bg-[#00897b] px-5 py-3 text-right">
          <p className="font-extrabold text-xl">INVOICE</p>
          <p className="text-[9px] text-teal-100 mt-1">Invoice No: <span className="font-bold">{form.invoiceNumber}</span></p>
          <p className="text-[9px] text-teal-100">Due Date: <span className="font-bold">{formatDate(form.dueDate)}</span></p>
          <p className="text-[9px] text-teal-100">Invoice Date: <span className="font-bold">{formatDate(form.issueDate)}</span></p>
        </div>
        <div className="absolute top-0 left-32 w-20 h-full bg-[#00897b]/20 skew-x-12" />
      </div>
      <div className="flex justify-between px-6 py-4 gap-4">
        <div>
          <p className="text-[8px] font-bold text-[#00897b] uppercase tracking-wider mb-1">Invoice To:</p>
          <p className="font-bold text-base">{form.clientName || "Client Name"}.</p>
          <p className="text-[9px] text-gray-500">{form.clientEmail}</p>
          <p className="text-[9px] text-gray-500">{form.clientAddress}</p>
        </div>
        {form.upiId && form.paymentType !== "none" && (
          <div>
            <p className="text-[8px] font-bold text-[#00897b] uppercase tracking-wider mb-1">Payment Method</p>
            <p className="text-[9px] text-gray-600">{form.upiId}</p>
            {form.bankName && <p className="text-[9px] text-gray-600">Account: {form.bankName}</p>}
            {form.bankAccount && <p className="text-[9px] text-gray-600">No: {form.bankAccount}</p>}
          </div>
        )}
      </div>
      <div className="px-6">
        <table className="w-full">
          <thead>
            <tr className="bg-[#00897b] text-white">
              <th className="p-2 text-left text-[9px] uppercase">No.</th>
              <th className="p-2 text-left text-[9px] uppercase">Item Description</th>
              <th className="p-2 text-right text-[9px] uppercase">Price</th>
              <th className="p-2 text-right text-[9px] uppercase">Qty.</th>
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
          <div className="flex justify-between text-gray-600"><span>Tax ({form.taxRate}%):</span><span className="tabular-nums">{formatCurrency(totals.taxAmt, currency)}</span></div>
          <div className="flex justify-between font-bold bg-[#00897b] text-white px-2 py-1 mt-1"><span>Total:</span><span className="tabular-nums">{formatCurrency(totals.total, currency)}</span></div>
        </div>
      </div>
      {form.terms && (
        <div className="px-6 mt-3">
          <p className="text-[9px] font-bold text-[#00897b] uppercase tracking-wider">Terms & Conditions:</p>
          <p className="text-[8px] text-gray-500 mt-0.5">{form.terms}</p>
        </div>
      )}
      <div className="flex justify-between items-end px-6 mt-4 pb-2">
        <p className="font-bold text-sm">THANK YOU FOR BUSINESS WITH US.</p>
        <div className="text-right">
          <p className="text-gray-400 italic text-[9px]">{form.business?.name}</p>
          <p className="text-[9px] text-gray-500">Your Name & Signature</p>
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

// ─── ORANGE BOLD TEMPLATE ────────────────────────────────────────────────────
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
                  <p className="text-[8px] text-gray-400">A MINT OF CREATIVITY</p>
                </div>
              </div>
            )
          }
        </div>
        <div className="z-10 text-right text-[9px] text-gray-400 space-y-0.5">
          <p>📞 {form.business?.phone || "+000 0000 0000"}</p>
          <p>✉ {form.business?.email || "your@email.com"}</p>
          <p>🌐 {form.business?.address || "www.website.com"}</p>
        </div>
        <div className="absolute top-0 left-24 w-0 h-0 border-l-[20px] border-l-transparent border-t-[40px] border-t-orange-500" />
        <div className="absolute top-0 right-32 w-0 h-0 border-r-[20px] border-r-transparent border-t-[40px] border-t-orange-500" />
      </div>
      <div className="flex justify-between px-6 py-4">
        <div>
          <p className="text-[9px] text-gray-500">Invoice to</p>
          <p className="font-bold text-sm">{form.clientName || "Client Name"}</p>
          <p className="text-[9px] text-gray-500 mt-0.5">E: {form.clientEmail || "client@email.com"}</p>
          <p className="text-[9px] text-gray-500">A: {form.clientAddress || "Street, City, Zip"}</p>
        </div>
        <div className="text-center">
          <p className="font-extrabold text-2xl text-gray-800">INVOICE</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-gray-500">Invoice No: <span className="font-semibold">{form.invoiceNumber}</span></p>
          <p className="text-[9px] text-gray-500">Date: <span className="font-semibold">{formatDate(form.issueDate)}</span></p>
          <p className="text-[9px] text-gray-500">Due Date: <span className="font-semibold">{formatDate(form.dueDate)}</span></p>
        </div>
      </div>
      <div className="px-6">
        <table className="w-full">
          <thead>
            <tr>
              <th className="bg-[#1a1a2e] text-white p-2 text-left text-[9px] uppercase">Product Description</th>
              <th className="bg-orange-500 text-white p-2 text-right text-[9px] uppercase">Price</th>
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
            <p className="font-bold text-[9px] text-gray-700 mb-1">Payment Option</p>
            <p className="text-[9px] text-gray-600">{form.upiId}</p>
            {form.bankName && <p className="text-[9px] text-gray-600">Account: {form.bankName}</p>}
            {form.bankAccount && <p className="text-[9px] text-gray-600">No: {form.bankAccount}</p>}
          </div>
        )}
        <div className="w-48 space-y-1 ml-auto">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>: {formatCurrency(totals.subtotal, currency)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Tax</span><span>: {form.taxRate}%</span></div>
          {totals.discountAmt > 0 && <div className="flex justify-between text-gray-600"><span>Discount</span><span>: −{formatCurrency(totals.discountAmt, currency)}</span></div>}
          <div className="flex justify-between font-bold bg-[#1a1a2e] text-white px-2 py-1 mt-1">
            <span>GRAND TOTAL</span>
            <div className="bg-orange-500 px-2 -mr-2 flex items-center">
              <span className="tabular-nums">{formatCurrency(totals.total, currency)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-end px-6 mt-6 pb-4">
        <div>
          <p className="font-extrabold text-sm">THANK YOU</p>
          <p className="font-extrabold text-sm">FOR YOUR BUSINESS</p>
          {form.notes && <p className="text-[8px] text-gray-500 mt-1 max-w-[180px]">{form.notes}</p>}
        </div>
        <div className="text-right">
          <p className="font-bold text-sm">{form.business?.name}</p>
          <p className="text-[9px] text-gray-500">Accounting manager</p>
          <p className="italic text-[10px] mt-1 text-gray-600">{form.business?.name}</p>
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
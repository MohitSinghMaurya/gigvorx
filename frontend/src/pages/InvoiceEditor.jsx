import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  ArrowLeft, Save, Eye, Download, MessageCircle, Plus, Trash2, CheckCircle2, Receipt, Image as ImageIcon, QrCode, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Clean & timeless", accent: "border-foreground" },
  { id: "modern", name: "Modern", desc: "Bold gradient header", accent: "border-violet-500" },
  { id: "minimal", name: "Minimal", desc: "Pure typography", accent: "border-muted-foreground" },
];

const STATUS_STYLES = {
  paid: "bg-emerald-600 text-white border-emerald-600",
  pending: "bg-amber-500 text-white border-amber-500",
  overdue: "bg-rose-600 text-white border-rose-600",
  draft: "bg-muted text-muted-foreground border-border",
};

function emptyItem() { return { id: Math.random().toString(36).slice(2), description: "", quantity: 1, rate: 0 }; }

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    taxRate: 18, discount: 0, notes: "Thank you for your business!",
    terms: "Payment due within 14 days. Late payments incur 1.5% monthly interest.",
    logo: "", upiId: "", qrImage: "",
    business: readSetting(user?.id, "business", { name: user?.name || "Your business", email: user?.email || "", phone: "", address: "" }),
  }));

  const [preview, setPreview] = useState(false);
  const [paidDialog, setPaidDialog] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    if (editing) {
      const inv = invoices.get(id);
      if (inv) setForm({ items: [emptyItem()], business: readSetting(user?.id, "business", { name: user?.name }), ...inv });
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
    const msg = `📄 Invoice ${form.invoiceNumber}\n${form.business.name} → ${form.clientName}\nAmount: ${formatCurrency(totals.total)}\nDue: ${formatDate(form.dueDate)}\n${form.upiId ? `\nPay via UPI: ${form.upiId}` : ""}\n\nFull invoice attached.`;
    whatsappShare(msg);
  };

  const Tmpl = form.template;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} className="-ml-2" data-testid="back-invoices"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(true)} data-testid="inv-preview"><Eye className="w-4 h-4 mr-1.5" />Preview</Button>
          <Button variant="outline" size="sm" onClick={downloadPDF} data-testid="inv-pdf"><Download className="w-4 h-4 mr-1.5" />Download PDF</Button>
          <Button variant="outline" size="sm" onClick={shareWA} data-testid="inv-whatsapp"><MessageCircle className="w-4 h-4 mr-1.5" />Share on WhatsApp</Button>
          {form.status !== "paid" && (
            <Button variant="outline" size="sm" onClick={markPaid} data-testid="inv-mark-paid" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="w-4 h-4 mr-1.5" />Mark as paid</Button>
          )}
          <Button size="sm" onClick={save} data-testid="inv-save" className="bg-foreground text-background hover:bg-foreground/90"><Save className="w-4 h-4 mr-1.5" />Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Template</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  data-testid={`tmpl-${t.id}`}
                  onClick={() => setField("template", t.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${form.template === t.id ? "border-foreground shadow-sm" : "border-border hover:border-foreground/30"}`}
                >
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </Card>

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

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input data-testid="inv-client-name" list="inv-client-list" placeholder="Client name" value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} />
              <datalist id="inv-client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
              <Input data-testid="inv-client-email" placeholder="Client email" value={form.clientEmail} onChange={(e) => setField("clientEmail", e.target.value)} />
              <Textarea data-testid="inv-client-address" placeholder="Billing address" value={form.clientAddress} onChange={(e) => setField("clientAddress", e.target.value)} className="md:col-span-2" rows={2} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Line items</h3>
              <Button size="sm" variant="outline" onClick={addItem} data-testid="inv-add-item"><Plus className="w-3.5 h-3.5 mr-1" />Add item</Button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {form.items.map((it, i) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center group">
                  <Input data-testid={`item-desc-${i}`} className="col-span-6" placeholder="Item or service" value={it.description} onChange={(e) => setItem(it.id, { description: e.target.value })} />
                  <Input data-testid={`item-qty-${i}`} className="col-span-2 text-right" type="number" value={it.quantity} onChange={(e) => setItem(it.id, { quantity: e.target.value })} />
                  <Input data-testid={`item-rate-${i}`} className="col-span-2 text-right" type="number" value={it.rate} onChange={(e) => setItem(it.id, { rate: e.target.value })} />
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <span className="text-sm font-medium tabular-nums">{formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0))}</span>
                    <button onClick={() => removeItem(it.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" data-testid={`item-remove-${i}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

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

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Payment & branding</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>UPI ID / Payment ID</Label>
                <Input data-testid="inv-upi" placeholder="yourname@upi" value={form.upiId} onChange={(e) => setField("upiId", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Logo</Label>
                <label className="mt-1 flex items-center gap-2 h-9 px-3 rounded-md border bg-background cursor-pointer hover:border-foreground/40 text-sm">
                  <ImageIcon className="w-4 h-4" />
                  {form.logo ? "Replace logo" : "Upload logo"}
                  <input data-testid="inv-logo" type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0], "logo")} />
                </label>
              </div>
              <div className="md:col-span-2">
                <Label>UPI QR image</Label>
                <label className="mt-1 flex items-center gap-2 h-9 px-3 rounded-md border bg-background cursor-pointer hover:border-foreground/40 text-sm">
                  <QrCode className="w-4 h-4" />
                  {form.qrImage ? "Replace QR" : "Upload QR (optional)"}
                  <input data-testid="inv-qr" type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0], "qrImage")} />
                </label>
              </div>
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

        {/* Live preview pane */}
        <div className="lg:sticky lg:top-24 h-fit">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Live preview</p>
          <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
            <div ref={previewRef} className="p-6 text-[11px] leading-tight" style={{ minHeight: 500 }}>
              <InvoiceTemplate template={Tmpl} form={form} totals={totals} />
            </div>
          </div>
          <Badge className={`mt-3 ${STATUS_STYLES[form.status]} capitalize`}>{form.status}</Badge>
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0">
          <DialogHeader className="px-6 pt-6"><DialogTitle>Invoice preview</DialogTitle></DialogHeader>
          <div className="p-8"><InvoiceTemplate template={Tmpl} form={form} totals={totals} large /></div>
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
              <Button onClick={() => { setPaidDialog(false); shareWA(); }} className="bg-foreground text-background">Send thank you on WhatsApp</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoiceTemplate({ template, form, totals, large = false }) {
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
        <BodyBlock form={form} totals={totals} large={large} />
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
        <BodyBlock form={form} totals={totals} large={large} />
      </div>
    );
  }
  // classic
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
      <BodyBlock form={form} totals={totals} large={large} />
    </div>
  );
}

function BodyBlock({ form, totals, large }) {
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
              <td className="p-2 text-right tabular-nums">{formatCurrency(it.rate)}</td>
              <td className="p-2 text-right font-medium tabular-nums">{formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end mb-6">
        <div className="w-56 space-y-1">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(totals.subtotal)}</span></div>
          {totals.discountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({form.discount}%)</span><span className="tabular-nums">−{formatCurrency(totals.discountAmt)}</span></div>}
          <div className="flex justify-between text-gray-600"><span>Tax ({form.taxRate}%)</span><span className="tabular-nums">{formatCurrency(totals.taxAmt)}</span></div>
          <div className="flex justify-between font-bold text-base pt-2 border-t mt-1"><span>Total</span><span className="tabular-nums">{formatCurrency(totals.total)}</span></div>
        </div>
      </div>
      {(form.upiId || form.qrImage) && (
        <div className="p-3 rounded-md bg-gray-50 border mb-5 flex items-center gap-3">
          {form.qrImage && <img src={form.qrImage} alt="QR" className="w-16 h-16 object-contain bg-white rounded border" />}
          <div className="text-[10px]">
            <p className="font-semibold uppercase tracking-wider text-gray-500">Pay via UPI</p>
            {form.upiId && <p className="font-mono mt-0.5">{form.upiId}</p>}
            {form.qrImage && <p className="text-gray-500">Scan the QR with any UPI app</p>}
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

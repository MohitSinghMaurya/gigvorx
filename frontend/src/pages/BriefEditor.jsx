import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCollection } from "@/lib/useCollection";
import { findNiche, NICHES } from "@/lib/niches";
import { whatsappShare, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  ArrowLeft, Save, Eye, Download, MessageCircle, Plus, Trash2, GripVertical, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

const SECTIONS_TEMPLATE = (niche) => ({
  overview: `# Project Overview\n\nA ${niche?.name || "professional"} engagement focused on delivering measurable outcomes within an agreed scope and timeline.`,
  clientDetails: `# Client Details\n\nClient name, point of contact, company, contact channels.`,
  requirements: `# Requirements\n\nKey deliverables, must-have features, and acceptance criteria.`,
  timeline: `# Timeline\n\nKickoff, key milestones, review checkpoints, and final delivery date.`,
  budget: `# Budget\n\nAgreed budget, payment schedule, and any out-of-scope assumptions.`,
  deliverables: `# Deliverables\n\nFinal assets, formats, and handover process.`,
  notes: `# Notes\n\nAnything else that matters for this engagement.`,
});

export default function BriefEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { items: clients } = useCollection("clients");
  const briefs = useCollection("briefs");
  const editing = !!id;

  const initialNicheSlug = params.get("niche") || "web-design";
  const initialNiche = findNiche(initialNicheSlug);

  const [form, setForm] = useState(() => {
    if (editing) return null;
    return {
      title: `${initialNiche.name} Brief`,
      clientName: "",
      clientId: "",
      niche: initialNiche.slug,
      status: "draft",
      questions: initialNiche.questions.map(q => ({ id: Math.random().toString(36).slice(2), q, a: "" })),
      sections: SECTIONS_TEMPLATE(initialNiche),
      confirmation: false,
    };
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    if (editing) {
      const b = briefs.get(id);
      if (b) {
        setForm({
          questions: [], sections: SECTIONS_TEMPLATE(findNiche(b.niche)), confirmation: false,
          ...b,
        });
      }
    }
    // eslint-disable-next-line
  }, [id, briefs.items.length]);

  if (!form) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const niche = findNiche(form.niche);
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSection = (k, v) => setForm(f => ({ ...f, sections: { ...f.sections, [k]: v } }));

  const updateQuestion = (qid, patch) => setForm(f => ({ ...f, questions: f.questions.map(q => q.id === qid ? { ...q, ...patch } : q) }));
  const removeQuestion = (qid) => setForm(f => ({ ...f, questions: f.questions.filter(q => q.id !== qid) }));
  const addQuestion = () => setForm(f => ({ ...f, questions: [...f.questions, { id: Math.random().toString(36).slice(2), q: "", a: "", custom: true }] }));

  const save = () => {
    if (editing) { briefs.update(id, form); toast.success("Brief saved"); }
    else { const c = briefs.create(form); toast.success("Brief created"); navigate(`/briefs/${c.id}`, { replace: true }); }
  };

  const downloadPDF = () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48; let y = margin;
    const wrap = (text, size = 11, bold = false) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text || "", 500);
      lines.forEach(l => { if (y > 780) { pdf.addPage(); y = margin; } pdf.text(l, margin, y); y += size + 4; });
      y += 6;
    };
    wrap(form.title || "Untitled Brief", 22, true);
    wrap(`Client: ${form.clientName || "—"}   ·   Niche: ${niche.name}   ·   ${formatDate(form.createdAt || new Date().toISOString())}`, 9);
    y += 10;
    const dump = (heading, body) => { wrap(heading, 14, true); wrap(body || "—"); };
    dump("Project Overview", form.sections.overview);
    dump("Client Details", form.sections.clientDetails);
    dump("Requirements", form.sections.requirements);
    dump("Timeline", form.sections.timeline);
    dump("Budget", form.sections.budget);
    dump("Deliverables", form.sections.deliverables);
    wrap("Questions & Answers", 14, true);
    form.questions.forEach((q, i) => { wrap(`Q${i + 1}. ${q.q}`, 11, true); wrap(q.a || "—"); });
    dump("Notes", form.sections.notes);
    wrap(`Confirmation: ${form.confirmation ? "Approved by client ✓" : "Pending client approval"}`, 11, true);
    pdf.save(`${(form.title || "brief").replace(/\s+/g, "-")}.pdf`);
  };

  const shareWhatsApp = () => {
    const summary = `📄 ${form.title}\nClient: ${form.clientName || "—"}\nNiche: ${niche.name}\n\n${form.sections.overview.replace(/^#.*\n/m, "")}\n\nView full brief in GigVorx.`;
    whatsappShare(summary);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/briefs")} className="-ml-2" data-testid="back-briefs"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} data-testid="brief-preview"><Eye className="w-4 h-4 mr-1.5" />Preview</Button>
          <Button variant="outline" size="sm" onClick={downloadPDF} data-testid="brief-pdf"><Download className="w-4 h-4 mr-1.5" />Download PDF</Button>
          <Button variant="outline" size="sm" onClick={shareWhatsApp} data-testid="brief-whatsapp"><MessageCircle className="w-4 h-4 mr-1.5" />Share on WhatsApp</Button>
          <Button size="sm" onClick={save} data-testid="brief-save" className="bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20"><Save className="w-4 h-4 mr-1.5" />Save</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Header strip */}
        <div className={`h-2 bg-gradient-to-r ${niche.accent}`} />
        <div className="p-6 md:p-10">
          <Badge variant="outline" className="mb-3">{niche.name}</Badge>
          <Input
            data-testid="brief-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="text-3xl md:text-4xl font-bold tracking-tight border-0 px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 h-auto"
            placeholder="Untitled brief"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Client name</Label>
              <Input data-testid="brief-client-name" list="client-list" value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} className="mt-1" />
              <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Niche</Label>
              <select data-testid="brief-niche-select" value={form.niche} onChange={(e) => setField("niche", e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                {NICHES.map(n => <option key={n.slug} value={n.slug}>{n.name}</option>)}
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <select data-testid="brief-status" value={form.status} onChange={(e) => setField("status", e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          <div className="brief-prose mt-10 space-y-8 max-w-3xl">
            {[
              ["overview", "Project Overview"],
              ["clientDetails", "Client Details"],
              ["requirements", "Requirements"],
              ["timeline", "Timeline"],
              ["budget", "Budget"],
              ["deliverables", "Deliverables"],
            ].map(([key, label]) => (
              <section key={key}>
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">{label}</p>
                <Textarea
                  data-testid={`brief-section-${key}`}
                  value={form.sections[key]}
                  onChange={(e) => setSection(key, e.target.value)}
                  rows={4}
                  className="resize-y border-0 bg-transparent px-0 focus-visible:ring-0 text-base leading-relaxed text-foreground"
                />
              </section>
            ))}

            {/* Q&A */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Questions &amp; Answers</p>
                <Button size="sm" variant="ghost" onClick={addQuestion} data-testid="brief-add-question"><Plus className="w-3.5 h-3.5 mr-1" />Add question</Button>
              </div>
              <div className="space-y-4">
                {form.questions.map((q, i) => (
                  <div key={q.id} className="p-4 rounded-lg border bg-muted/20 group">
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 mt-2 text-muted-foreground/40 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Input
                          data-testid={`brief-q-${i}`}
                          value={q.q}
                          onChange={(e) => updateQuestion(q.id, { q: e.target.value })}
                          className="font-semibold border-0 bg-transparent px-0 focus-visible:ring-0"
                          placeholder={`Question ${i + 1}`}
                        />
                        <Textarea
                          data-testid={`brief-a-${i}`}
                          value={q.a}
                          onChange={(e) => updateQuestion(q.id, { a: e.target.value })}
                          rows={2}
                          placeholder="Client's answer…"
                          className="border-0 bg-transparent px-0 focus-visible:ring-0 text-muted-foreground"
                        />
                      </div>
                      <button onClick={() => removeQuestion(q.id)} data-testid={`brief-remove-q-${i}`} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">Notes</p>
              <Textarea data-testid="brief-section-notes" value={form.sections.notes} onChange={(e) => setSection("notes", e.target.value)} rows={3} className="border-0 bg-transparent px-0 focus-visible:ring-0" />
            </section>

            <section className="pt-6 border-t">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  data-testid="brief-confirm"
                  type="checkbox"
                  checked={form.confirmation}
                  onChange={(e) => setField("confirmation", e.target.checked)}
                  className="w-5 h-5 rounded border-2 accent-foreground"
                />
                <div>
                  <p className="font-semibold flex items-center gap-2">Confirmation {form.confirmation && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}</p>
                  <p className="text-sm text-muted-foreground">Mark this brief as approved by the client.</p>
                </div>
              </label>
            </section>
          </div>
        </div>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.title}</DialogTitle></DialogHeader>
          <div ref={previewRef} className="brief-prose">
            <p className="text-sm text-muted-foreground">Client: <b>{form.clientName || "—"}</b> · Niche: <b>{niche.name}</b></p>
            {Object.entries({ "Project Overview": form.sections.overview, "Client Details": form.sections.clientDetails, "Requirements": form.sections.requirements, "Timeline": form.sections.timeline, "Budget": form.sections.budget, "Deliverables": form.sections.deliverables }).map(([k, v]) => (
              <div key={k}><h3>{k}</h3><p className="whitespace-pre-wrap text-sm">{v?.replace(/^#.*\n/m, "")}</p></div>
            ))}
            <h3>Questions & Answers</h3>
            <ol>{form.questions.map(q => <li key={q.id}><b>{q.q}</b><br /><span className="text-muted-foreground">{q.a || "—"}</span></li>)}</ol>
            <h3>Notes</h3><p className="whitespace-pre-wrap text-sm">{form.sections.notes?.replace(/^#.*\n/m, "")}</p>
            <p className="mt-6 font-semibold">{form.confirmation ? "✅ Approved by client" : "⏳ Pending approval"}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

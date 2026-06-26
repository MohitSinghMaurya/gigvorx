import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { ShareBriefDialog } from "@/components/ShareBriefDialog";
import {
  ArrowLeft, Save, Eye, Download, MessageCircle, Plus, Trash2,
  GripVertical, CheckCircle2, BookMarked, FolderOpen, X, Link2,
  Type, FileUp, Link as LinkIcon, Video, Image, List, AlignLeft, AlignJustify
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

const QUESTION_TYPES = [
  { value: "text", label: "Short Answer", icon: Type, desc: "One-line text answer", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "long", label: "Long Answer", icon: AlignJustify, desc: "Multi-line paragraph", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "select", label: "Multiple Choice", icon: List, desc: "Client picks from options", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "file", label: "File Upload", icon: FileUp, desc: "Upload PDF, DOC, ZIP", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "image", label: "Image Upload", icon: Image, desc: "Upload PNG, JPG, GIF", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "link", label: "URL / Link", icon: LinkIcon, desc: "Share a website URL", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "video", label: "Video Link", icon: Video, desc: "Share a video URL", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
];

function getTemplatesKey(userId) {
  return `gv_question_templates_${userId}`;
}

function loadTemplates(userId) {
  try {
    const raw = localStorage.getItem(getTemplatesKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplates(userId, templates) {
  localStorage.setItem(getTemplatesKey(userId), JSON.stringify(templates));
}

export default function BriefEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
      questions: initialNiche.questions.map(q => {
        if (typeof q === "string") {
          return { id: Math.random().toString(36).slice(2), q, a: "", type: "long" };
        }
        return { id: Math.random().toString(36).slice(2), q: q.text || q.q, a: "", type: q.type || "long" };
      }),
      sections: SECTIONS_TEMPLATE(initialNiche),
      confirmation: false,
    };
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState(() => loadTemplates(user?.id));
  const [shareOpen, setShareOpen] = useState(false);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("long");
  const [newQuestionOptions, setNewQuestionOptions] = useState(["", ""]);
  const previewRef = useRef(null);

  useEffect(() => {
    if (editing) {
      const b = briefs.get(id);
      if (b) {
        setForm({
          questions: [],
          sections: SECTIONS_TEMPLATE(findNiche(b.niche)),
          confirmation: false,
          ...b,
        });
      }
    }
  }, [id, briefs.items.length]);

  useEffect(() => {
    setTemplates(loadTemplates(user?.id));
  }, [user?.id]);

  if (!form) return <div className="p-8 text-muted-foreground">Loading...</div>;

  const niche = findNiche(form.niche);
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSection = (k, v) => setForm(f => ({ ...f, sections: { ...f.sections, [k]: v } }));
  const updateQuestion = (qid, patch) => setForm(f => ({ ...f, questions: f.questions.map(q => q.id === qid ? { ...q, ...patch } : q) }));
  const removeQuestion = (qid) => setForm(f => ({ ...f, questions: f.questions.filter(q => q.id !== qid) }));

  const openAddQuestion = () => {
    setNewQuestionText("");
    setNewQuestionType("long");
    setNewQuestionOptions(["", ""]);
    setAddQuestionOpen(true);
  };

  const addQuestion = () => {
    if (!newQuestionText.trim()) { toast.error("Please enter a question"); return; }
    const newQ = {
      id: Math.random().toString(36).slice(2),
      q: newQuestionText.trim(),
      a: "",
      type: newQuestionType,
      custom: true,
    };
    if (newQuestionType === "select") {
      const validOptions = newQuestionOptions.filter(o => o.trim());
      if (validOptions.length < 2) { toast.error("Please add at least 2 options"); return; }
      newQ.options = validOptions;
    }
    setForm(f => ({ ...f, questions: [...f.questions, newQ] }));
    setAddQuestionOpen(false);
    toast.success(`Added ${QUESTION_TYPES.find(t => t.value === newQuestionType)?.label || "question"}`);
  };

  const addOption = () => setNewQuestionOptions(prev => [...prev, ""]);
  const updateOption = (i, val) => setNewQuestionOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  const removeOption = (i) => setNewQuestionOptions(prev => prev.filter((_, idx) => idx !== i));

  const handleSaveTemplate = () => {
    if (!templateName.trim()) { toast.error("Please enter a template name"); return; }
    if (form.questions.length === 0) { toast.error("No questions to save"); return; }
    const newTemplate = {
      id: Math.random().toString(36).slice(2),
      name: templateName.trim(),
      questions: form.questions.map(q => ({
        id: Math.random().toString(36).slice(2),
        q: q.q,
        a: "",
        type: q.type || "long",
        options: q.options,
      })),
      createdAt: new Date().toISOString(),
      count: form.questions.length,
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveTemplates(user?.id, updated);
    setTemplateName("");
    setSaveTemplateOpen(false);
    toast.success(`"${newTemplate.name}" saved!`);
  };

  const handleLoadTemplate = (template) => {
    const loaded = template.questions.map(q => ({
      id: Math.random().toString(36).slice(2),
      q: q.q,
      a: "",
      type: q.type || "long",
      options: q.options,
    }));
    setForm(f => ({ ...f, questions: [...f.questions, ...loaded] }));
    setLoadTemplateOpen(false);
    toast.success(`Loaded ${loaded.length} questions`);
  };

  const handleReplaceWithTemplate = (template) => {
    const loaded = template.questions.map(q => ({
      id: Math.random().toString(36).slice(2),
      q: q.q,
      a: "",
      type: q.type || "long",
      options: q.options,
    }));
    setForm(f => ({ ...f, questions: loaded }));
    setLoadTemplateOpen(false);
    toast.success(`Replaced with ${loaded.length} questions`);
  };

  const handleDeleteTemplate = (templateId) => {
    const updated = templates.filter(t => t.id !== templateId);
    setTemplates(updated);
    saveTemplates(user?.id, updated);
    toast.success("Template deleted");
  };

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
    form.questions.forEach((q, i) => {
      const qt = QUESTION_TYPES.find(t => t.value === q.type);
      wrap(`Q${i + 1}. ${q.q} [${qt?.label || "Text"}]`, 11, true);
      if (q.type === "select" && q.options) {
        wrap(`Options: ${q.options.join(", ")}`, 10);
      }
      wrap(q.a || "—");
    });
    dump("Notes", form.sections.notes);
    wrap(`Confirmation: ${form.confirmation ? "Approved by client ✓" : "Pending client approval"}`, 11, true);
    pdf.save(`${(form.title || "brief").replace(/\s+/g, "-")}.pdf`);
  };

  const shareWhatsApp = () => {
    const summary = `📄 ${form.title}\nClient: ${form.clientName || "—"}\nNiche: ${niche.name}\n\n${form.sections.overview.replace(/^#.*\n/m, "")}\n\nView full brief in GigVorx.`;
    whatsappShare(summary);
  };

  const getTypeConfig = (type) => QUESTION_TYPES.find(t => t.value === type) || QUESTION_TYPES[1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/briefs")} className="-ml-2" data-testid="back-briefs">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} data-testid="brief-preview">
            <Eye className="w-4 h-4 mr-1.5" />Preview
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPDF} data-testid="brief-pdf">
            <Download className="w-4 h-4 mr-1.5" />Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={shareWhatsApp} data-testid="brief-whatsapp">
            <MessageCircle className="w-4 h-4 mr-1.5" />Share on WhatsApp
          </Button>
          {editing && (
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} data-testid="brief-share">
              <Link2 className="w-4 h-4 mr-1.5" />Share
            </Button>
          )}
          <Button size="sm" onClick={save} data-testid="brief-save" className="bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20">
            <Save className="w-4 h-4 mr-1.5" />Save
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
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

            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Questions &amp; Answers</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setLoadTemplateOpen(true)} className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                    <FolderOpen className="w-3.5 h-3.5 mr-1" />
                    Load saved questions
                    {templates.length > 0 && (
                      <span className="ml-1.5 bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{templates.length}</span>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSaveTemplateOpen(true)} className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <BookMarked className="w-3.5 h-3.5 mr-1" />Save as template
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={openAddQuestion}
                className="w-full mb-4 h-10 border-dashed border-2 hover:border-solid hover:bg-muted/30"
              >
                <Plus className="w-4 h-4 mr-2" />Add a question
              </Button>

              {form.questions.length === 0 && (
                <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                  <p>No questions yet.</p>
                  <p className="mt-1">Click "Add a question" to get started.</p>
                </div>
              )}

              <div className="space-y-4">
                {form.questions.map((q, i) => {
                  const typeConfig = getTypeConfig(q.type);
                  const TypeIcon = typeConfig.icon;
                  return (
                    <div key={q.id} className="p-4 rounded-lg border bg-muted/20 group">
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 mt-1 text-muted-foreground/40 shrink-0" />
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground font-mono">Q{i + 1}</span>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${typeConfig.color}`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeConfig.label}
                            </div>
                            <select
                              value={q.type || "long"}
                              onChange={(e) => updateQuestion(q.id, { type: e.target.value })}
                              className="h-6 rounded border bg-background px-2 text-[11px]"
                            >
                              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <Input
                            data-testid={`brief-q-${i}`}
                            value={q.q}
                            onChange={(e) => updateQuestion(q.id, { q: e.target.value })}
                            className="font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 text-sm"
                            placeholder={`Enter your ${typeConfig.label.toLowerCase()} question...`}
                          />
                          {q.type === "select" && (
                            <div className="space-y-1.5 pl-2 border-l-2 border-purple-200">
                              <p className="text-[11px] text-muted-foreground">Options (client will pick one):</p>
                              {(q.options || []).map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <Input
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...(q.options || [])];
                                      newOpts[optIdx] = e.target.value;
                                      updateQuestion(q.id, { options: newOpts });
                                    }}
                                    className="h-7 text-sm border-0 bg-transparent px-0 focus-visible:ring-0"
                                    placeholder={`Option ${optIdx + 1}`}
                                  />
                                  <button
                                    onClick={() => {
                                      const newOpts = (q.options || []).filter((_, idx) => idx !== optIdx);
                                      updateQuestion(q.id, { options: newOpts });
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateQuestion(q.id, { options: [...(q.options || []), ""] })}
                                className="h-6 text-[11px] text-purple-600"
                              >
                                <Plus className="w-3 h-3 mr-1" />Add option
                              </Button>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1.5 border border-dashed">
                            {q.type === "text" && "Client will type a short answer here..."}
                            {q.type === "long" && "Client will type a detailed answer here..."}
                            {q.type === "select" && "Client will select one option..."}
                            {q.type === "file" && "Client will upload files (PDF, DOC, ZIP) here..."}
                            {q.type === "image" && "Client will upload images (PNG, JPG, GIF) here..."}
                            {q.type === "link" && "Client will paste a URL here..."}
                            {q.type === "video" && "Client will paste a video link here..."}
                          </div>
                        </div>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          data-testid={`brief-remove-q-${i}`}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">Notes</p>
              <Textarea data-testid="brief-section-notes" value={form.sections.notes} onChange={(e) => setSection("notes", e.target.value)} rows={3} className="border-0 bg-transparent px-0 focus-visible:ring-0" />
            </section>

            <section className="pt-6 border-t">
              <label className="flex items-center gap-3 cursor-pointer">
                <input data-testid="brief-confirm" type="checkbox" checked={form.confirmation} onChange={(e) => setField("confirmation", e.target.checked)} className="w-5 h-5 rounded border-2 accent-foreground" />
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
            <ol>{form.questions.map(q => {
              const qt = QUESTION_TYPES.find(t => t.value === q.type);
              return (
                <li key={q.id}>
                  <b>{q.q}</b> <span className="text-xs text-muted-foreground">({qt?.label || "Text"})</span>
                  {q.type === "select" && q.options && <div className="text-xs text-muted-foreground mt-1">Options: {q.options.join(", ")}</div>}
                  <br /><span className="text-muted-foreground">{q.a || "—"}</span>
                </li>
              );
            })}</ol>
            <h3>Notes</h3>
            <p className="whitespace-pre-wrap text-sm">{form.sections.notes?.replace(/^#.*\n/m, "")}</p>
            <p className="mt-6 font-semibold">{form.confirmation ? "✅ Approved by client" : "⏳ Pending approval"}</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addQuestionOpen} onOpenChange={setAddQuestionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" />Add a Question</DialogTitle>
            <DialogDescription>Choose the question type and enter your question.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Question</Label>
              <Textarea
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="e.g. Do you have any reference websites?"
                rows={2}
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label className="mb-2 block">Question type</Label>
              <div className="grid grid-cols-2 gap-2">
                {QUESTION_TYPES.map(qt => {
                  const QtIcon = qt.icon;
                  const isSelected = newQuestionType === qt.value;
                  return (
                    <button
                      key={qt.value}
                      onClick={() => setNewQuestionType(qt.value)}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                          : "border-muted hover:border-foreground/20 hover:bg-muted/30"
                      }`}
                    >
                      <QtIcon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-foreground" : "text-muted-foreground"}`} />
                      <div>
                        <p className={`text-xs font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{qt.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{qt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {newQuestionType === "select" && (
              <div className="space-y-2">
                <Label>Options</Label>
                {newQuestionOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="text-sm"
                    />
                    {newQuestionOptions.length > 2 && (
                      <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="ghost" onClick={addOption} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />Add option
                </Button>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={addQuestion} className="bg-brand-gradient text-white flex-1 hover:opacity-90">
                <Plus className="w-4 h-4 mr-1.5" />Add question
              </Button>
              <Button variant="outline" onClick={() => setAddQuestionOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookMarked className="w-5 h-5 text-emerald-600" />Save questions as template</DialogTitle>
            <DialogDescription>Save your {form.questions.length} questions so you can reuse them in future briefs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Template name</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder='e.g. "My Web Design Questions"' className="mt-1.5" onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()} autoFocus />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Questions to save ({form.questions.length}):</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {form.questions.map((q, i) => {
                  const qt = QUESTION_TYPES.find(t => t.value === q.type);
                  return (
                    <li key={q.id} className="truncate text-xs">
                      {i + 1}. {q.q || "Empty question"}
                      <span className="text-[10px] text-muted-foreground ml-1">({qt?.label || "Text"})</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveTemplate} className="bg-brand-gradient text-white flex-1"><BookMarked className="w-4 h-4 mr-1.5" />Save template</Button>
              <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loadTemplateOpen} onOpenChange={setLoadTemplateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-blue-600" />Load saved questions</DialogTitle>
            <DialogDescription>Choose a template to load into this brief.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No saved templates yet</p>
                <p className="text-sm mt-1">Add questions to a brief and click "Save as template"</p>
              </div>
            ) : (
              templates.map(t => (
                <div key={t.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.count} questions · Saved {formatDate(t.createdAt)}</p>
                    <ul className="mt-2 space-y-0.5 max-h-20 overflow-y-auto">
                      {t.questions.slice(0, 3).map((q, i) => {
                        const qt = QUESTION_TYPES.find(x => x.value === q.type);
                        return (
                          <li key={i} className="text-xs text-muted-foreground truncate">
                            {i + 1}. {q.q} <span className="text-[10px]">({qt?.label || "Text"})</span>
                          </li>
                        );
                      })}
                      {t.questions.length > 3 && <li className="text-xs text-muted-foreground">+{t.questions.length - 3} more...</li>}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" onClick={() => handleLoadTemplate(t)} className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs">Add to brief</Button>
                    <Button size="sm" variant="outline" onClick={() => handleReplaceWithTemplate(t)} className="h-7 text-xs">Replace all</Button>
                    <button onClick={() => handleDeleteTemplate(t.id)} className="text-[10px] text-muted-foreground hover:text-destructive text-center">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {editing && <ShareBriefDialog brief={briefs.get(id)} open={shareOpen} onOpenChange={setShareOpen} />}
    </div>
  );
}
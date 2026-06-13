import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollection } from "@/lib/useCollection";
import { formatCurrency, formatDate, whatsappShare } from "@/lib/format";
import { useCurrency } from "@/contexts/CurrencyContext";
import { LEAD_STATUSES, LEAD_SOURCES, findStatus, findSource, MESSAGE_TEMPLATES, fillTemplate } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Target, MessageCircle, ChevronRight, ChevronLeft, MoreVertical,
  Edit2, Trash2, ArrowRightLeft, Sparkles, Phone, Calendar, IndianRupee, LayoutGrid, List,
  Send, Repeat2, FileText, Receipt, PartyPopper, Copy,
} from "lucide-react";
import { toast } from "sonner";

const ICONS = { Send, Repeat2, Calendar, FileText, Receipt, PartyPopper };

function emptyLead() {
  return {
    name: "", email: "", phone: "", company: "", service: "",
    status: "new_lead", leadSource: "", followUpDate: "", lastContactedAt: null,
    leadNotes: "", estimatedValue: "", isLead: true,
  };
}

export default function Leads() {
  const { currency } = useCurrency();
  const { items, create, update, remove, loading } = useCollection("clients");
  const navigate = useNavigate();
  const [view, setView] = useState("board");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [templateLead, setTemplateLead] = useState(null);

  const leads = useMemo(
    () => items.filter(c => c.isLead !== false),
    [items]
  );

  const filtered = useMemo(() => leads.filter(l => {
    const q = query.toLowerCase();
    const matchesQ = !q || l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.service?.toLowerCase().includes(q);
    const matchesS = sourceFilter === "all" || l.leadSource === sourceFilter;
    return matchesQ && matchesS;
  }), [leads, query, sourceFilter]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(LEAD_STATUSES.map(s => [s.id, []]));
    filtered.forEach(l => { (map[l.status] || map.new_lead).push(l); });
    return map;
  }, [filtered]);

  const totals = useMemo(() => {
    const wonValue = leads.filter(l => l.status === "won").reduce((s, l) => s + (parseFloat(l.estimatedValue) || 0), 0);
    const pipeValue = leads.filter(l => !["won","lost"].includes(l.status)).reduce((s, l) => s + (parseFloat(l.estimatedValue) || 0), 0);
    const conv = leads.length ? Math.round((leads.filter(l => l.status === "won").length / leads.length) * 100) : 0;
    return { wonValue, pipeValue, conv, total: leads.length };
  }, [leads]);

  const openEditor = (lead) => { setEditing(lead || emptyLead()); setDrawerOpen(true); };
  const closeEditor = () => { setDrawerOpen(false); setEditing(null); };

  const saveLead = async () => {
    if (!editing.name?.trim()) { toast.error("Name is required"); return; }
    const payload = { ...editing, isLead: editing.status === "won" ? false : true };
    if (editing.id) {
      await update(editing.id, payload);
      toast.success("Lead updated");
    } else {
      await create(payload);
      toast.success("Lead added to pipeline");
    }
    closeEditor();
  };

  const moveStatus = async (leadId, newStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    const isWon = newStatus === "won";
    await update(leadId, { status: newStatus, isLead: !isWon, lastContactedAt: new Date().toISOString() });
    if (isWon) toast.success(`🎉 ${lead.name} converted to client!`);
    else toast.success(`Moved to ${findStatus(newStatus).label}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track every lead from first touch to "Won". Convert to client in one click.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            <button data-testid="view-board" onClick={() => setView("board")} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${view === "board" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-3.5 h-3.5" />Board
            </button>
            <button data-testid="view-list" onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${view === "list" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <List className="w-3.5 h-3.5" />List
            </button>
          </div>
          <Button onClick={() => openEditor()} data-testid="new-lead-btn" className="bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20">
            <Plus className="w-4 h-4 mr-1.5" />New lead
          </Button>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total leads", value: totals.total, sub: "All pipeline", icon: Target, accent: "bg-brand-gradient" },
          { label: "Pipeline value", value: formatCurrency(totals.pipeValue, currency), sub: "Open opportunities", icon: IndianRupee, accent: "bg-sky-500" },
          { label: "Won value", value: formatCurrency(totals.wonValue, currency), sub: "Closed deals", icon: PartyPopper, accent: "bg-emerald-500" },
          { label: "Conversion rate", value: totals.conv + "%", sub: "Lead → Won", icon: ArrowRightLeft, accent: "bg-indigo-500" },
        ].map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
                <p className="text-3xl font-bold tracking-tight mt-2">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${s.accent} flex items-center justify-center`}><s.icon className="w-4 h-4 text-white" /></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="lead-search" placeholder="Search leads…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <select data-testid="source-filter" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-9 px-3 rounded-md border bg-background text-sm">
          <option value="all">All sources</option>
          {LEAD_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {leads.length === 0 && !loading && (
        <Card className="p-12 text-center border-dashed">
          <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">Your pipeline is empty</p>
          <p className="text-sm text-muted-foreground mb-5">Add your first lead and start tracking deals.</p>
          <Button onClick={() => openEditor()} data-testid="empty-new-lead" className="bg-brand-gradient text-white"><Plus className="w-4 h-4 mr-1.5" />Add first lead</Button>
        </Card>
      )}

      {view === "board" && leads.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-4 min-w-max pb-4">
            {LEAD_STATUSES.map(col => {
              const colItems = byStatus[col.id] || [];
              return (
                <div
                  key={col.id}
                  data-testid={`col-${col.id}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (draggedId) { moveStatus(draggedId, col.id); setDraggedId(null); } }}
                  className="w-72 shrink-0 bg-muted/40 rounded-xl p-3 pipeline-col"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <p className="font-semibold text-sm">{col.label}</p>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">{colItems.length}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 min-h-[120px]">
                    {colItems.map(l => (
                      <LeadCard
                        key={l.id}
                        lead={l}
                        currency={currency}
                        onDragStart={() => setDraggedId(l.id)}
                        onEdit={() => openEditor(l)}
                        onTemplates={() => setTemplateLead(l)}
                        onDelete={async () => { await remove(l.id); toast.success("Lead deleted"); }}
                        onMove={(s) => moveStatus(l.id, s)}
                      />
                    ))}
                    {colItems.length === 0 && <div className="text-center text-xs text-muted-foreground/60 py-4">Drag leads here</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "list" && leads.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Lead</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Source</th>
                  <th className="text-right p-4 font-semibold">Value</th>
                  <th className="text-left p-4 font-semibold">Follow-up</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(l => {
                  const st = findStatus(l.status);
                  const src = findSource(l.leadSource);
                  return (
                    <tr key={l.id} data-testid={`lead-row-${l.id}`} className="hover:bg-muted/20">
                      <td className="p-4">
                        <p className="font-semibold">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.company || l.email}</p>
                      </td>
                      <td className="p-4"><Badge className={`${st.color} capitalize`} variant="outline">{st.label}</Badge></td>
                      <td className="p-4 text-muted-foreground">{src?.label || "—"}</td>
                      <td className="p-4 text-right font-semibold">{l.estimatedValue ? formatCurrency(l.estimatedValue, currency) : "—"}</td>
                      <td className="p-4 text-muted-foreground">{l.followUpDate ? formatDate(l.followUpDate) : "—"}</td>
                      <td className="p-4">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => setTemplateLead(l)} title="Send message"><MessageCircle className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditor(l)} title="Edit"><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={async () => { await remove(l.id); toast.success("Deleted"); }} className="hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={drawerOpen} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit lead" : "Add new lead"}</DialogTitle>
            <DialogDescription>Capture lead info for your pipeline.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input data-testid="lead-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1" /></div>
                <div><Label>Company</Label><Input data-testid="lead-company" value={editing.company || ""} onChange={(e) => setEditing({ ...editing, company: e.target.value })} className="mt-1" /></div>
                <div><Label>Email</Label><Input data-testid="lead-email" type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="mt-1" /></div>
                <div><Label>Phone</Label><Input data-testid="lead-phone" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className="mt-1" /></div>
                <div><Label>Service / Niche</Label><Input data-testid="lead-service" value={editing.service || ""} onChange={(e) => setEditing({ ...editing, service: e.target.value })} placeholder="e.g. SEO" className="mt-1" /></div>
                <div><Label>Estimated value ({currency === "INR" ? "₹" : "$"})</Label><Input data-testid="lead-value" type="number" value={editing.estimatedValue || ""} onChange={(e) => setEditing({ ...editing, estimatedValue: e.target.value })} className="mt-1" /></div>
                <div>
                  <Label>Status</Label>
                  <select data-testid="lead-status" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                    {LEAD_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Lead source</Label>
                  <select data-testid="lead-source" value={editing.leadSource || ""} onChange={(e) => setEditing({ ...editing, leadSource: e.target.value })} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                    <option value="">— Select —</option>
                    {LEAD_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div><Label>Follow-up date</Label><Input data-testid="lead-followup" type="date" value={editing.followUpDate || ""} onChange={(e) => setEditing({ ...editing, followUpDate: e.target.value })} className="mt-1" /></div>
                <div><Label>Last contacted</Label><Input data-testid="lead-last" type="date" value={editing.lastContactedAt ? editing.lastContactedAt.slice(0,10) : ""} onChange={(e) => setEditing({ ...editing, lastContactedAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1" /></div>
              </div>
              <div>
                <Label>Lead notes</Label>
                <Textarea data-testid="lead-notes" rows={3} value={editing.leadNotes || ""} onChange={(e) => setEditing({ ...editing, leadNotes: e.target.value })} className="mt-1" placeholder="What's the context? What did they say?" />
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={saveLead} data-testid="lead-save" className="bg-brand-gradient text-white"><Plus className="w-4 h-4 mr-1.5" />{editing.id ? "Save" : "Add lead"}</Button>
                <Button variant="outline" onClick={closeEditor}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!templateLead} onOpenChange={(o) => !o && setTemplateLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-500" />Message templates</DialogTitle>
            <DialogDescription>One-tap messages to send {templateLead?.name} on WhatsApp. All placeholders auto-fill from the lead.</DialogDescription>
          </DialogHeader>
          {templateLead && (
            <div className="space-y-3">
              {MESSAGE_TEMPLATES.map(t => {
                const Icon = ICONS[t.icon] || Send;
                const filled = fillTemplate(t.body, templateLead);
                return (
                  <Card key={t.id} className="p-4" data-testid={`tmpl-${t.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                        <pre className="mt-2 p-3 rounded-md bg-muted/50 text-xs whitespace-pre-wrap font-sans text-foreground">{filled}</pre>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              const phone = templateLead.phone?.replace(/\D/g, "");
                              if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(filled)}`, "_blank");
                              else whatsappShare(filled);
                            }}
                            data-testid={`send-${t.id}`}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Send on WhatsApp
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(filled); toast.success("Copied to clipboard"); }}>
                            <Copy className="w-3.5 h-3.5 mr-1.5" />Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadCard({ lead, currency, onDragStart, onEdit, onTemplates, onDelete, onMove }) {
  const st = findStatus(lead.status);
  const src = findSource(lead.leadSource);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      data-testid={`lead-card-${lead.id}`}
      className="bg-background p-3 rounded-lg border hover:border-foreground/20 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-sm truncate">{lead.name}</p>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
          <button onClick={onTemplates} title="Send message" className="p-1 text-muted-foreground hover:text-emerald-600"><MessageCircle className="w-3.5 h-3.5" /></button>
          <button onClick={onEdit} title="Edit" className="p-1 text-muted-foreground hover:text-foreground"><Edit2 className="w-3 h-3" /></button>
          <button onClick={onDelete} title="Delete" className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {src && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{src.label}</Badge>}
        {lead.estimatedValue && <span className="text-xs font-mono font-semibold text-blue-600">{formatCurrency(lead.estimatedValue, currency)}</span>}
      </div>
      {lead.followUpDate && (
        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Follow-up {formatDate(lead.followUpDate)}</p>
      )}
      <div className="mt-2 pt-2 border-t flex items-center gap-1">
        <select
          value={lead.status}
          onChange={(e) => onMove(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          data-testid={`move-${lead.id}`}
          className="text-[10px] flex-1 h-6 rounded border bg-background px-1.5 text-muted-foreground"
        >
          {LEAD_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}
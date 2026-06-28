import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCurrency } from "@/lib/CurrencyContext";
import { LEAD_STATUSES, LEAD_SOURCES, findStatus, findSource, MESSAGE_TEMPLATES, fillTemplate } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Search, Target, MessageCircle, Edit2, Trash2, ArrowRightLeft,
  LayoutGrid, List, Send, Repeat2, FileText, Receipt, PartyPopper,
  Calendar, IndianRupee, Copy, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const ICONS = { Send, Repeat2, Calendar, FileText, Receipt, PartyPopper };

function emptyLead() {
  return {
    name: "", email: "", phone: "", company: "", service: "",
    status: "new_lead", lead_source: "", follow_up_date: "",
    last_contacted_at: null, lead_notes: "", estimated_value: "",
  };
}

export default function Leads() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("board");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [templateLead, setTemplateLead] = useState(null);

  useEffect(() => {
    if (user?.id) fetchLeads();
  }, [user]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => leads.filter(l => {
    const q = query.toLowerCase();
    const matchesQ = !q ||
      l.name?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.service?.toLowerCase().includes(q);
    const matchesS = sourceFilter === "all" || l.lead_source === sourceFilter;
    return matchesQ && matchesS;
  }), [leads, query, sourceFilter]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(LEAD_STATUSES.map(s => [s.id, []]));
    filtered.forEach(l => { (map[l.status] || map.new_lead).push(l); });
    return map;
  }, [filtered]);

  const totals = useMemo(() => {
    const won = leads.filter(l => l.status === "won");
    const pipe = leads.filter(l => !["won", "lost"].includes(l.status));
    const wonValue = won.reduce((s, l) => s + (parseFloat(l.estimated_value) || 0), 0);
    const pipeValue = pipe.reduce((s, l) => s + (parseFloat(l.estimated_value) || 0), 0);
    const conv = leads.length ? Math.round((won.length / leads.length) * 100) : 0;
    return { wonValue, pipeValue, conv, total: leads.length };
  }, [leads]);

  const openEditor = (lead) => {
    setEditing(lead ? { ...lead } : emptyLead());
    setDrawerOpen(true);
  };

  const closeEditor = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const saveLead = async () => {
    if (!editing.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: editing.name.trim(),
        email: editing.email || null,
        phone: editing.phone || null,
        company: editing.company || null,
        service: editing.service || null,
        status: editing.status || "new_lead",
        lead_source: editing.lead_source || null,
        follow_up_date: editing.follow_up_date || null,
        last_contacted_at: editing.last_contacted_at || null,
        lead_notes: editing.lead_notes || null,
        estimated_value: editing.estimated_value ? parseFloat(editing.estimated_value) : null,
        updated_at: new Date().toISOString(),
      };

      if (editing.id) {
        const { error } = await supabase
          .from("leads")
          .update(payload)
          .eq("id", editing.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setLeads(prev => prev.map(l => l.id === editing.id ? { ...l, ...payload } : l));
        toast.success("Lead updated");
      } else {
        const { data, error } = await supabase
          .from("leads")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        setLeads(prev => [data, ...prev]);
        toast.success("Lead added to pipeline");
      }
      closeEditor();
    } catch (err) {
      toast.error("Error saving lead: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async (leadId) => {
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadId)
        .eq("user_id", user.id);
      if (error) throw error;
      setLeads(prev => prev.filter(l => l.id !== leadId));
      toast.success("Lead deleted");
    } catch (err) {
      toast.error("Failed to delete lead");
    }
  };

  const moveStatus = async (leadId, newStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, last_contacted_at: new Date().toISOString() })
        .eq("id", leadId)
        .eq("user_id", user.id);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      if (newStatus === "won") toast.success(`🎉 ${lead.name} marked as Won!`);
      else toast.success(`Moved to ${findStatus(newStatus)?.label}`);
    } catch (err) {
      toast.error("Failed to move lead");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track every lead from first touch to Won.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setView("board")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${view === "board" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${view === "list" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              <List className="w-3.5 h-3.5" />List
            </button>
          </div>
          <Button onClick={() => openEditor()} className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
            <Plus className="w-4 h-4 mr-1.5" />New Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total leads", value: totals.total, sub: "All pipeline", icon: Target, accent: "bg-[#FF6B00]" },
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
              <div className={`w-9 h-9 rounded-lg ${s.accent} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 px-3 rounded-md border bg-background text-sm"
        >
          <option value="all">All sources</option>
          {LEAD_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && leads.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">Your pipeline is empty</p>
          <p className="text-sm text-muted-foreground mb-5">Add your first lead and start tracking deals.</p>
          <Button onClick={() => openEditor()} className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
            <Plus className="w-4 h-4 mr-1.5" />Add First Lead
          </Button>
        </Card>
      )}

      {/* Board view */}
      {!loading && view === "board" && leads.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-4 min-w-max pb-4">
            {LEAD_STATUSES.map(col => {
              const colItems = byStatus[col.id] || [];
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (draggedId) { moveStatus(draggedId, col.id); setDraggedId(null); } }}
                  className="w-72 shrink-0 bg-muted/40 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <p className="font-semibold text-sm">{col.label}</p>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{colItems.length}</Badge>
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
                        onDelete={() => deleteLead(l.id)}
                        onMove={(s) => moveStatus(l.id, s)}
                      />
                    ))}
                    {colItems.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground/60 py-4">Drop leads here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {!loading && view === "list" && leads.length > 0 && (
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
                  const src = findSource(l.lead_source);
                  return (
                    <tr key={l.id} className="hover:bg-muted/20">
                      <td className="p-4">
                        <p className="font-semibold">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.company || l.email}</p>
                      </td>
                      <td className="p-4">
                        <Badge className={`${st?.color} capitalize`} variant="outline">{st?.label}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{src?.label || "—"}</td>
                      <td className="p-4 text-right font-semibold">
                        {l.estimated_value ? formatCurrency(l.estimated_value, currency) : "—"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {l.follow_up_date ? formatDate(l.follow_up_date) : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => setTemplateLead(l)} title="Send message">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditor(l)} title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteLead(l.id)} className="hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Add/Edit Lead Dialog */}
      <Dialog open={drawerOpen} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Lead" : "Add New Lead"}</DialogTitle>
            <DialogDescription>Capture lead info for your pipeline.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={editing.company || ""} onChange={(e) => setEditing({ ...editing, company: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Service / Niche</Label>
                  <Input value={editing.service || ""} onChange={(e) => setEditing({ ...editing, service: e.target.value })} placeholder="e.g. SEO" className="mt-1" />
                </div>
                <div>
                  <Label>Estimated Value ({currency === "INR" ? "₹" : "$"})</Label>
                  <Input type="number" value={editing.estimated_value || ""} onChange={(e) => setEditing({ ...editing, estimated_value: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Status</Label>
                  <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                    {LEAD_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Lead Source</Label>
                  <select value={editing.lead_source || ""} onChange={(e) => setEditing({ ...editing, lead_source: e.target.value })} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                    <option value="">— Select —</option>
                    {LEAD_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Follow-up Date</Label>
                  <Input type="date" value={editing.follow_up_date || ""} onChange={(e) => setEditing({ ...editing, follow_up_date: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Last Contacted</Label>
                  <Input type="date" value={editing.last_contacted_at ? editing.last_contacted_at.slice(0, 10) : ""} onChange={(e) => setEditing({ ...editing, last_contacted_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={3} value={editing.lead_notes || ""} onChange={(e) => setEditing({ ...editing, lead_notes: e.target.value })} className="mt-1" placeholder="What's the context? What did they say?" />
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={saveLead} disabled={saving} className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
                  {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving...</> : <><Plus className="w-4 h-4 mr-1.5" />{editing.id ? "Save" : "Add Lead"}</>}
                </Button>
                <Button variant="outline" onClick={closeEditor}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Templates Dialog */}
      <Dialog open={!!templateLead} onOpenChange={(o) => !o && setTemplateLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Templates</DialogTitle>
            <DialogDescription>One-tap messages to send {templateLead?.name} on WhatsApp.</DialogDescription>
          </DialogHeader>
          {templateLead && (
            <div className="space-y-3">
              {MESSAGE_TEMPLATES.map(t => {
                const Icon = ICONS[t.icon] || Send;
                const filled = fillTemplate(t.body, {
                  ...templateLead,
                  estimatedValue: templateLead.estimated_value,
                  leadSource: templateLead.lead_source,
                  followUpDate: templateLead.follow_up_date,
                  leadNotes: templateLead.lead_notes,
                });
                return (
                  <Card key={t.id} className="p-4">
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
                              else window.open(`https://wa.me/?text=${encodeURIComponent(filled)}`, "_blank");
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Send on WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { navigator.clipboard.writeText(filled); toast.success("Copied!"); }}
                          >
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
  const src = findSource(lead.lead_source);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-background p-3 rounded-lg border hover:border-foreground/20 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-sm truncate">{lead.name}</p>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
          <button onClick={onTemplates} className="p-1 text-muted-foreground hover:text-emerald-600">
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-foreground">
            <Edit2 className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {src && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{src.label}</Badge>}
        {lead.estimated_value && (
          <span className="text-xs font-mono font-semibold text-blue-600">
            {formatCurrency(lead.estimated_value, currency)}
          </span>
        )}
      </div>
      {lead.follow_up_date && (
        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <Calendar className="w-3 h-3" />Follow-up {formatDate(lead.follow_up_date)}
        </p>
      )}
      <div className="mt-2 pt-2 border-t">
        <select
          value={lead.status}
          onChange={(e) => onMove(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] w-full h-6 rounded border bg-background px-1.5 text-muted-foreground"
        >
          {LEAD_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}
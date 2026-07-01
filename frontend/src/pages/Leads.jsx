import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readGlobal, writeGlobal, uid } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCurrency } from "@/lib/CurrencyContext";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  findStatus,
  findSource,
  MESSAGE_TEMPLATES,
  fillTemplate,
} from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Target,
  MessageCircle,
  Edit2,
  Trash2,
  ArrowRightLeft,
  LayoutGrid,
  List,
  Send,
  Repeat2,
  FileText,
  Receipt,
  PartyPopper,
  Calendar,
  IndianRupee,
  Copy,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const ICONS = {
  Send,
  Repeat2,
  Calendar,
  FileText,
  Receipt,
  PartyPopper,
};

function emptyLead() {
  return {
    name: "",
    email: "",
    phone: "",
    company: "",
    service: "",
    status: "new_lead",
    lead_source: "",
    follow_up_date: "",
    last_contacted_at: null,
    lead_notes: "",
    estimated_value: "",
  };
}

function isLead(item) {
  return item?.is_lead === true || item?.isLead === true;
}

function getCreatedAt(item) {
  return item?.created_at || item?.createdAt;
}

function buildLeadPayload(editing, userId) {
  return {
    user_id: userId,
    userId,
    name: editing.name.trim(),
    email: editing.email?.trim() || null,
    phone: editing.phone?.trim() || null,
    company: editing.company?.trim() || null,
    service: editing.service?.trim() || null,
    status: editing.status || "new_lead",
    lead_source: editing.lead_source || null,
    follow_up_date: editing.follow_up_date || null,
    last_contacted_at: editing.last_contacted_at || null,
    lead_notes: editing.lead_notes?.trim() || null,
    estimated_value: editing.estimated_value
      ? parseFloat(editing.estimated_value)
      : null,
    is_lead: true,
    isLead: true,
  };
}

export default function Leads() {
  const { user } = useAuth();
  const { currency } = useCurrency();

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

  const fetchLeads = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_lead", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setLeads(data || []);
      } else {
        const localLeads = readGlobal("clients", [])
          .filter((item) => item?.user_id === user.id || item?.userId === user.id)
          .filter(isLead)
          .sort((a, b) => new Date(getCreatedAt(b)) - new Date(getCreatedAt(a)));

        setLeads(localLeads);
      }
    } catch (err) {
      console.error("Leads fetch error:", err);
      setLeads([]);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesQuery =
        !search ||
        lead.name?.toLowerCase().includes(search) ||
        lead.company?.toLowerCase().includes(search) ||
        lead.email?.toLowerCase().includes(search) ||
        lead.phone?.toLowerCase().includes(search) ||
        lead.service?.toLowerCase().includes(search);

      const matchesSource =
        sourceFilter === "all" || lead.lead_source === sourceFilter;

      return matchesQuery && matchesSource;
    });
  }, [leads, query, sourceFilter]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(LEAD_STATUSES.map((status) => [status.id, []]));

    filtered.forEach((lead) => {
      const status = lead.status || "new_lead";
      if (!map[status]) map[status] = [];
      map[status].push(lead);
    });

    return map;
  }, [filtered]);

  const totals = useMemo(() => {
    const won = leads.filter((lead) => lead.status === "won");
    const open = leads.filter((lead) => !["won", "lost"].includes(lead.status));

    const wonValue = won.reduce(
      (sum, lead) => sum + (parseFloat(lead.estimated_value) || 0),
      0
    );

    const pipeValue = open.reduce(
      (sum, lead) => sum + (parseFloat(lead.estimated_value) || 0),
      0
    );

    const conv = leads.length ? Math.round((won.length / leads.length) * 100) : 0;

    return {
      wonValue,
      pipeValue,
      conv,
      total: leads.length,
    };
  }, [leads]);

  const openEditor = (lead = null) => {
    setEditing(lead ? { ...emptyLead(), ...lead } : emptyLead());
    setDrawerOpen(true);
  };

  const closeEditor = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const saveLead = async () => {
    if (!user?.id) {
      toast.error("Please sign in again.");
      return;
    }

    if (!editing?.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const payload = buildLeadPayload(editing, user.id);

      if (editing.id) {
        if (isSupabaseEnabled) {
          const { error } = await supabase
            .from("clients")
            .update({
              ...payload,
              updated_at: now,
            })
            .eq("id", editing.id)
            .eq("user_id", user.id);

          if (error) throw error;
        } else {
          const clients = readGlobal("clients", []);

          writeGlobal(
            "clients",
            clients.map((client) =>
              client.id === editing.id &&
              (client.user_id === user.id || client.userId === user.id)
                ? {
                    ...client,
                    ...payload,
                    updatedAt: now,
                  }
                : client
            )
          );
        }

        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === editing.id
              ? {
                  ...lead,
                  ...payload,
                  updated_at: now,
                  updatedAt: now,
                }
              : lead
          )
        );

        toast.success("Lead updated");
      } else {
        if (isSupabaseEnabled) {
          const { data, error } = await supabase
            .from("clients")
            .insert({
              ...payload,
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

          if (error) throw error;

          setLeads((prev) => [data, ...prev]);
        } else {
          const newLead = {
            id: uid(),
            ...payload,
            createdAt: now,
            updatedAt: now,
          };

          writeGlobal("clients", [newLead, ...readGlobal("clients", [])]);
          setLeads((prev) => [newLead, ...prev]);
        }

        toast.success("Lead added to pipeline");
      }

      closeEditor();
    } catch (err) {
      console.error("Lead save error:", err);
      toast.error("Error saving lead: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async (leadId) => {
    if (!user?.id) return;

    try {
      if (isSupabaseEnabled) {
        const { error } = await supabase
          .from("clients")
          .delete()
          .eq("id", leadId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        writeGlobal(
          "clients",
          readGlobal("clients", []).filter((client) => client.id !== leadId)
        );
      }

      setLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      toast.success("Lead deleted");
    } catch (err) {
      console.error("Delete lead error:", err);
      toast.error("Failed to delete lead");
    }
  };

  const moveStatus = async (leadId, newStatus) => {
    if (!user?.id) return;

    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === newStatus) return;

    const now = new Date().toISOString();

    try {
      if (isSupabaseEnabled) {
        const { error } = await supabase
          .from("clients")
          .update({
            status: newStatus,
            last_contacted_at: now,
            updated_at: now,
          })
          .eq("id", leadId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        writeGlobal(
          "clients",
          readGlobal("clients", []).map((client) =>
            client.id === leadId &&
            (client.user_id === user.id || client.userId === user.id)
              ? {
                  ...client,
                  status: newStatus,
                  last_contacted_at: now,
                  updatedAt: now,
                }
              : client
          )
        );
      }

      setLeads((prev) =>
        prev.map((item) =>
          item.id === leadId
            ? {
                ...item,
                status: newStatus,
                last_contacted_at: now,
              }
            : item
        )
      );

      if (newStatus === "won") {
        toast.success(`🎉 ${lead.name} marked as Won!`);
      } else {
        toast.success(`Moved to ${findStatus(newStatus)?.label || newStatus}`);
      }
    } catch (err) {
      console.error("Move lead error:", err);
      toast.error("Failed to move lead");
    }
  };

  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Copied!");
    } catch (err) {
      toast.error("Could not copy message");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            Track every lead from first touch to won deal.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                view === "board" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>

            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                view === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <Button
            onClick={() => openEditor()}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Total leads",
            value: totals.total,
            sub: "All pipeline",
            icon: Target,
            accent: "bg-blue-500",
          },
          {
            label: "Pipeline value",
            value: formatCurrency(totals.pipeValue, currency),
            sub: "Open opportunities",
            icon: IndianRupee,
            accent: "bg-sky-500",
          },
          {
            label: "Won value",
            value: formatCurrency(totals.wonValue, currency),
            sub: "Closed deals",
            icon: PartyPopper,
            accent: "bg-emerald-500",
          },
          {
            label: "Conversion rate",
            value: totals.conv + "%",
            sub: "Lead → Won",
            icon: ArrowRightLeft,
            accent: "bg-indigo-500",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
                </div>

                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.accent}`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All sources</option>
          {LEAD_SOURCES.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && leads.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <Target className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="mb-1 font-semibold">No leads yet</p>
          <p className="mb-5 text-sm text-muted-foreground">
            Add your first lead and start tracking your sales pipeline.
          </p>
          <Button
            onClick={() => openEditor()}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add First Lead
          </Button>
        </Card>
      )}

      {!loading && leads.length > 0 && filtered.length === 0 && (
        <Card className="border-dashed p-10 text-center">
          <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="mb-1 font-semibold">No matching leads</p>
          <p className="text-sm text-muted-foreground">
            Try changing your search or source filter.
          </p>
        </Card>
      )}

      {!loading && view === "board" && filtered.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-4 pb-4">
            {LEAD_STATUSES.map((column) => {
              const colItems = byStatus[column.id] || [];

              return (
                <div
                  key={column.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedId) {
                      moveStatus(draggedId, column.id);
                      setDraggedId(null);
                    }
                  }}
                  className="w-72 shrink-0 rounded-xl bg-muted/40 p-3"
                >
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <div className={`h-2 w-2 rounded-full ${column.dot}`} />
                    <p className="text-sm font-semibold">{column.label}</p>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {colItems.length}
                    </Badge>
                  </div>

                  <div className="min-h-[120px] space-y-2">
                    {colItems.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        currency={currency}
                        onDragStart={() => setDraggedId(lead.id)}
                        onEdit={() => openEditor(lead)}
                        onTemplates={() => setTemplateLead(lead)}
                        onDelete={() => deleteLead(lead.id)}
                        onMove={(status) => moveStatus(lead.id, status)}
                      />
                    ))}

                    {colItems.length === 0 && (
                      <div className="py-4 text-center text-xs text-muted-foreground/60">
                        Drop leads here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && view === "list" && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="p-4 text-left font-semibold">Lead</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-left font-semibold">Source</th>
                  <th className="p-4 text-right font-semibold">Value</th>
                  <th className="p-4 text-left font-semibold">Follow-up</th>
                  <th className="w-32" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((lead) => {
                  const status = findStatus(lead.status);
                  const source = findSource(lead.lead_source);

                  return (
                    <tr key={lead.id} className="hover:bg-muted/20">
                      <td className="p-4">
                        <p className="font-semibold">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.company || lead.email || "—"}
                        </p>
                      </td>

                      <td className="p-4">
                        <Badge
                          className={`${status?.color || ""} capitalize`}
                          variant="outline"
                        >
                          {status?.label || "New lead"}
                        </Badge>
                      </td>

                      <td className="p-4 text-muted-foreground">
                        {source?.label || "—"}
                      </td>

                      <td className="p-4 text-right font-semibold">
                        {lead.estimated_value
                          ? formatCurrency(lead.estimated_value, currency)
                          : "—"}
                      </td>

                      <td className="p-4 text-muted-foreground">
                        {lead.follow_up_date
                          ? formatDate(lead.follow_up_date)
                          : "—"}
                      </td>

                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setTemplateLead(lead)}
                            title="Send message"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditor(lead)}
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteLead(lead.id)}
                            className="hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={drawerOpen} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Lead" : "Add New Lead"}</DialogTitle>
            <DialogDescription>
              Capture lead info for your pipeline.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className="mt-1"
                    placeholder="Client name"
                  />
                </div>

                <div>
                  <Label>Company</Label>
                  <Input
                    value={editing.company || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, company: e.target.value })
                    }
                    className="mt-1"
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editing.email || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                    className="mt-1"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editing.phone || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                    className="mt-1"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <Label>Service / Niche</Label>
                  <Input
                    value={editing.service || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, service: e.target.value })
                    }
                    placeholder="e.g. SEO, Web Design"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Estimated Value ({currency === "INR" ? "₹" : "$"})</Label>
                  <Input
                    type="number"
                    value={editing.estimated_value || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        estimated_value: e.target.value,
                      })
                    }
                    className="mt-1"
                    placeholder="25000"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value })
                    }
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {LEAD_STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Lead Source</Label>
                  <select
                    value={editing.lead_source || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        lead_source: e.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">— Select —</option>
                    {LEAD_SOURCES.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    value={editing.follow_up_date || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        follow_up_date: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Last Contacted</Label>
                  <Input
                    type="date"
                    value={
                      editing.last_contacted_at
                        ? editing.last_contacted_at.slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        last_contacted_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={editing.lead_notes || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      lead_notes: e.target.value,
                    })
                  }
                  className="mt-1"
                  placeholder="What did they say? Any important context?"
                />
              </div>

              <div className="flex gap-2 border-t pt-2">
                <Button
                  onClick={saveLead}
                  disabled={saving}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-4 w-4" />
                      {editing.id ? "Save Changes" : "Add Lead"}
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={closeEditor}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(templateLead)}
        onOpenChange={(open) => !open && setTemplateLead(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Templates</DialogTitle>
            <DialogDescription>
              One-tap messages to send {templateLead?.name || "this lead"}.
            </DialogDescription>
          </DialogHeader>

          {templateLead && (
            <div className="space-y-3">
              {MESSAGE_TEMPLATES.map((template) => {
                const Icon = ICONS[template.icon] || Send;
                const filled = fillTemplate(template.body, {
                  ...templateLead,
                  estimatedValue: templateLead.estimated_value,
                  leadSource: templateLead.lead_source,
                  followUpDate: templateLead.follow_up_date,
                  leadNotes: templateLead.lead_notes,
                });

                return (
                  <Card key={template.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.description}
                        </p>

                        <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-sans text-xs text-foreground">
                          {filled}
                        </pre>

                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              const phone = templateLead.phone?.replace(/\D/g, "");
                              const url = phone
                                ? `https://wa.me/${phone}?text=${encodeURIComponent(
                                    filled
                                  )}`
                                : `https://wa.me/?text=${encodeURIComponent(filled)}`;

                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                          >
                            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                            Send on WhatsApp
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyMessage(filled)}
                          >
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Copy
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

function LeadCard({
  lead,
  currency,
  onDragStart,
  onEdit,
  onTemplates,
  onDelete,
  onMove,
}) {
  const source = findSource(lead.lead_source);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group cursor-grab rounded-lg border bg-background p-3 transition-all hover:border-foreground/20 hover:shadow-sm active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between">
        <p className="truncate text-sm font-semibold">{lead.name}</p>

        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onTemplates}
            className="p-1 text-muted-foreground hover:text-emerald-600"
            title="Message templates"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onEdit}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Edit2 className="h-3 w-3" />
          </button>

          <button
            onClick={onDelete}
            className="p-1 text-muted-foreground hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {lead.company && (
        <p className="text-xs text-muted-foreground">{lead.company}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {source && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {source.label}
          </Badge>
        )}

        {lead.estimated_value && (
          <span className="font-mono text-xs font-semibold text-blue-600">
            {formatCurrency(lead.estimated_value, currency)}
          </span>
        )}
      </div>

      {lead.follow_up_date && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Follow-up {formatDate(lead.follow_up_date)}
        </p>
      )}

      <div className="mt-2 border-t pt-2">
        <select
          value={lead.status || "new_lead"}
          onChange={(e) => onMove(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="h-6 w-full rounded border bg-background px-1.5 text-[10px] text-muted-foreground"
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
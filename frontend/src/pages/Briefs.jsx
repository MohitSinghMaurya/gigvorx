import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollection } from "@/lib/useCollection";
import { formatDate } from "@/lib/format";
import { NICHES } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Search, FileText, Edit2, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Briefs() {
  const { items, remove } = useCollection("briefs");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const filtered = items.filter(b => b.title?.toLowerCase().includes(query.toLowerCase()) || b.clientName?.toLowerCase().includes(query.toLowerCase()));

  const start = (slug) => {
    setPickerOpen(false);
    navigate(`/briefs/new?niche=${slug}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Briefs</h1>
          <p className="text-muted-foreground mt-1">Discovery briefs you can send in 60 seconds.</p>
        </div>
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-brief-btn" className="bg-foreground text-background hover:bg-foreground/90"><Plus className="w-4 h-4 mr-1.5" />New brief</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Pick a niche template</DialogTitle>
              <DialogDescription>Each comes pre-loaded with 8 senior-level discovery questions. Fully editable.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {NICHES.map(n => (
                <button
                  key={n.slug}
                  data-testid={`niche-${n.slug}`}
                  onClick={() => start(n.slug)}
                  className="text-left p-4 rounded-xl border hover:border-foreground hover:shadow-sm transition-all group"
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${n.accent} mb-3 flex items-center justify-center`}>
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-semibold text-sm">{n.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.questions.length} questions</p>
                </button>
              ))}
              <button data-testid="niche-custom" onClick={() => start("custom")} className="text-left p-4 rounded-xl border border-dashed hover:border-foreground transition-all">
                <div className="w-9 h-9 rounded-lg bg-muted mb-3 flex items-center justify-center"><Plus className="w-4 h-4" /></div>
                <p className="font-semibold text-sm">Blank brief</p>
                <p className="text-xs text-muted-foreground mt-0.5">Start from scratch</p>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input data-testid="brief-search" placeholder="Search briefs…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">{items.length === 0 ? "No briefs yet" : "No matches"}</p>
          <p className="text-sm text-muted-foreground mb-5">Pick a niche template and you're ready in seconds.</p>
          {items.length === 0 && <Button onClick={() => setPickerOpen(true)} data-testid="empty-new-brief" className="bg-foreground text-background"><Plus className="w-4 h-4 mr-1.5" />Create your first brief</Button>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => {
            const niche = NICHES.find(n => n.slug === b.niche);
            return (
              <Card key={b.id} className="p-5 hover:shadow-md hover:border-foreground/30 transition-all cursor-pointer group" onClick={() => navigate(`/briefs/${b.id}`)} data-testid={`brief-card-${b.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${niche?.accent || "from-slate-500 to-zinc-600"} flex items-center justify-center`}>
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs">{b.status || "draft"}</Badge>
                </div>
                <p className="font-semibold leading-tight line-clamp-2">{b.title || "Untitled brief"}</p>
                <p className="text-xs text-muted-foreground mt-1">{b.clientName || "No client"} · {niche?.name || "Custom"}</p>
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(b.createdAt)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); navigate(`/briefs/${b.id}`); }}><Edit2 className="w-3 h-3" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="w-3 h-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this brief?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { remove(b.id); toast.success("Brief deleted"); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

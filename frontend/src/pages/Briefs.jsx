import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollection } from "@/lib/useCollection";
import { usePlanLimits } from "@/lib/usePlanLimits";
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
import { Plus, Search, FileText, Edit2, Trash2, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

const STARTER_NICHES = 5;

export default function Briefs() {
  const { items, remove } = useCollection("briefs");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { canAddBrief, limits, usage, isPro, isStarter, isTrial } = usePlanLimits();

  const filtered = items.filter(b =>
    b.title?.toLowerCase().includes(query.toLowerCase()) ||
    b.clientName?.toLowerCase().includes(query.toLowerCase())
  );

  const handleNewBrief = () => {
    if (!canAddBrief) {
      toast.error(`You've used all ${limits.briefs} briefs this month. Upgrade to Pro for unlimited briefs.`);
      navigate("/pricing-app");
      return;
    }
    setPickerOpen(true);
  };

  const start = (slug) => {
    setPickerOpen(false);
    navigate(`/briefs/new?niche=${slug}`);
  };

  // Niches visible based on plan
  const visibleNiches = isPro ? NICHES : NICHES.slice(0, STARTER_NICHES);
  const lockedNiches = isPro ? [] : NICHES.slice(STARTER_NICHES);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Briefs</h1>
          <p className="text-muted-foreground mt-1">Discovery briefs you can send in 60 seconds.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Monthly usage indicator */}
          {!isPro && (
            <div className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg border bg-muted/30">
              <span className={usage.briefs >= limits.briefs ? "text-rose-600 font-semibold" : ""}>
                {usage.briefs}/{limits.briefs} briefs this month
              </span>
            </div>
          )}
          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="new-brief-btn"
                onClick={handleNewBrief}
                className="bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 mr-1.5" />New brief
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Pick a niche template</DialogTitle>
                <DialogDescription>
                  Each comes pre-loaded with 8 senior-level discovery questions. Fully editable.
                  {!isPro && (
                    <span className="ml-2 text-amber-600 font-medium">
                      ({STARTER_NICHES} of {NICHES.length} niches available on your plan)
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {/* Unlocked niches */}
                {visibleNiches.map(n => (
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

                {/* Locked niches for Starter */}
                {lockedNiches.map(n => (
                  <button
                    key={n.slug}
                    onClick={() => { toast.error("Upgrade to Pro to unlock all 17 niches"); navigate("/pricing-app"); setPickerOpen(false); }}
                    className="text-left p-4 rounded-xl border border-dashed opacity-50 cursor-not-allowed relative"
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted mb-3 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-sm">{n.name}</p>
                    <p className="text-xs text-amber-600 mt-0.5 font-medium">Pro only</p>
                  </button>
                ))}

                {/* Blank brief */}
                <button
                  data-testid="niche-custom"
                  onClick={() => start("custom")}
                  className="text-left p-4 rounded-xl border border-dashed hover:border-foreground transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted mb-3 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-sm">Blank brief</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Start from scratch</p>
                </button>
              </div>

              {/* Upgrade banner inside picker */}
              {!isPro && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <p className="text-sm text-amber-700">
                    <span className="font-semibold">Upgrade to Pro</span> to unlock all 17 niches and unlimited briefs.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => { setPickerOpen(false); navigate("/pricing-app"); }}
                    className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 ml-3"
                  >
                    Upgrade
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Monthly limit warning */}
      {!isPro && usage.briefs >= limits.briefs - 2 && usage.briefs < limits.briefs && (
        <div className="px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center justify-between">
          <span>You have <span className="font-semibold">{limits.briefs - usage.briefs} brief{limits.briefs - usage.briefs !== 1 ? "s" : ""}</span> left this month.</span>
          <Button size="sm" variant="outline" onClick={() => navigate("/pricing-app")} className="border-amber-300 text-amber-700 hover:bg-amber-100 h-7 text-xs">Upgrade</Button>
        </div>
      )}

      {!isPro && usage.briefs >= limits.briefs && (
        <div className="px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <span className="font-semibold">Monthly brief limit reached. Upgrade to Pro for unlimited briefs.</span>
          <Button size="sm" onClick={() => navigate("/pricing-app")} className="bg-rose-600 text-white hover:bg-rose-700 h-7 text-xs ml-3">Upgrade Now</Button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input data-testid="brief-search" placeholder="Search briefs…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">{items.length === 0 ? "No briefs yet" : "No matches"}</p>
          <p className="text-sm text-muted-foreground mb-5">Pick a niche template and you're ready in seconds.</p>
          {items.length === 0 && (
            <Button onClick={handleNewBrief} data-testid="empty-new-brief" className="bg-brand-gradient text-white">
              <Plus className="w-4 h-4 mr-1.5" />Create your first brief
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => {
            const niche = NICHES.find(n => n.slug === b.niche);
            return (
              <Card
                key={b.id}
                className="p-5 hover:shadow-md hover:border-foreground/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/briefs/${b.id}`)}
                data-testid={`brief-card-${b.id}`}
              >
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
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); navigate(`/briefs/${b.id}`); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this brief?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => { remove(b.id); toast.success("Brief deleted"); }}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Search, FileText, Edit2, Trash2, Loader2, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  draft: "border-yellow-500 text-yellow-400",
  sent: "border-blue-500 text-blue-400",
  approved: "border-green-500 text-green-400",
  completed: "border-purple-500 text-purple-400",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  } catch {
    return "";
  }
}

export default function Briefs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAddBrief, limits, usage, isPro } = usePlanLimits();

  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (user?.id) fetchBriefs();
  }, [user]);

  const fetchBriefs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("briefs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBriefs(data || []);
    } catch (err) {
      toast.error("Failed to load briefs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (briefId) => {
    setDeleting(briefId);
    try {
      const { error } = await supabase
        .from("briefs")
        .delete()
        .eq("id", briefId)
        .eq("user_id", user.id);
      if (error) throw error;
      setBriefs(prev => prev.filter(b => b.id !== briefId));
      toast.success("Brief deleted");
    } catch (err) {
      toast.error("Failed to delete brief");
    } finally {
      setDeleting(null);
    }
  };

  const handleNewBrief = () => {
    if (!canAddBrief) {
      toast.error(`You've used all ${limits.briefs} briefs. Upgrade to Pro for unlimited briefs.`);
      navigate("/pricing-app");
      return;
    }
    navigate("/briefs/new");
  };

  const handleShareWhatsApp = (e, brief) => {
    e.stopPropagation();
    if (!brief.share_token) {
      toast.error("Open the brief and enable sharing first");
      return;
    }
    const intakeLink = `${window.location.origin}/#/intake/${brief.share_token}`;
    const text = `Hi ${brief.client_name || ""},\n\nI have prepared a project brief for *${brief.title || "your project"}* on GigVorx.\n\nPlease fill in your details using this link:\n${intakeLink}\n\nIt will only take a few minutes!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopyLink = (e, brief) => {
    e.stopPropagation();
    if (!brief.share_token) {
      toast.error("Open the brief and enable sharing first");
      return;
    }
    const intakeLink = `${window.location.origin}/#/intake/${brief.share_token}`;
    navigator.clipboard.writeText(intakeLink);
    toast.success("Intake link copied!");
  };

  const filtered = briefs.filter(b =>
    b.title?.toLowerCase().includes(query.toLowerCase()) ||
    b.client_name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Briefs</h1>
          <p className="text-muted-foreground mt-1">Create and share discovery briefs with your clients.</p>
        </div>
        <div className="flex items-center gap-3">
          {!isPro && (
            <div className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg border bg-muted/30">
              <span className={usage.briefs >= limits.briefs ? "text-rose-600 font-semibold" : ""}>
                {usage.briefs}/{limits.briefs} briefs this month
              </span>
            </div>
          )}
          <Button
            onClick={handleNewBrief}
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />New Brief
          </Button>
        </div>
      </div>

      {/* Limit warnings */}
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search briefs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">{briefs.length === 0 ? "No briefs yet" : "No matches"}</p>
          <p className="text-sm text-muted-foreground mb-5">
            {briefs.length === 0 ? "Create your first brief and share it with a client." : "Try a different search term."}
          </p>
          {briefs.length === 0 && (
            <Button onClick={handleNewBrief} className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
              <Plus className="w-4 h-4 mr-1.5" />Create your first brief
            </Button>
          )}
        </Card>
      )}

      {/* Briefs grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => (
            <Card
              key={b.id}
              className="p-5 hover:shadow-md hover:border-foreground/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/briefs/${b.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <Badge variant="outline" className={`text-xs ${statusColors[b.status] || statusColors.draft}`}>
                  {b.status || "draft"}
                </Badge>
              </div>

              <p className="font-semibold leading-tight line-clamp-2">{b.title || "Untitled Brief"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {b.client_name || "No client"}
                {b.client_email && ` · ${b.client_email}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {b.questions?.length || 0} questions
                {b.share_token && b.share_enabled && (
                  <span className="ml-2 text-green-500">● Live</span>
                )}
              </p>

              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(b.created_at)}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Copy intake link */}
                  <Button
                    size="icon" variant="ghost" className="h-6 w-6"
                    onClick={(e) => handleCopyLink(e, b)}
                    title="Copy intake link"
                  >
                    <Link2 className="w-3 h-3" />
                  </Button>
                  {/* WhatsApp share */}
                  <Button
                    size="icon" variant="ghost" className="h-6 w-6"
                    onClick={(e) => handleShareWhatsApp(e, b)}
                    title="Share via WhatsApp"
                  >
                    <MessageCircle className="w-3 h-3" />
                  </Button>
                  {/* Edit */}
                  <Button
                    size="icon" variant="ghost" className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); navigate(`/briefs/${b.id}`); }}
                    title="Edit brief"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon" variant="ghost"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                        title="Delete brief"
                      >
                        {deleting === b.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />
                        }
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this brief?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{b.title || "Untitled Brief"}" and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(b.id)}
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
          ))}
        </div>
      )}
    </div>
  );
}
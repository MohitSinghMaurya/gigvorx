import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readGlobal, writeGlobal } from "@/lib/storage";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  FileText,
  Edit2,
  Trash2,
  Loader2,
  Link2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  draft: "border-yellow-500 text-yellow-600",
  sent: "border-blue-500 text-blue-600",
  approved: "border-green-500 text-green-600",
  completed: "border-purple-500 text-purple-600",
};

function formatDate(dateStr) {
  if (!dateStr) return "";

  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function getCreatedAt(brief) {
  return brief?.created_at || brief?.createdAt;
}

function getShareToken(brief) {
  return brief?.share_token || brief?.shareToken;
}

function isSharingEnabled(brief) {
  return brief?.share_enabled === true || brief?.shareEnabled === true;
}

function getQuestionCount(brief) {
  if (Array.isArray(brief?.questions)) return brief.questions.length;

  if (typeof brief?.questions === "string") {
    try {
      const parsed = JSON.parse(brief.questions);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  return 0;
}

export default function Briefs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAddBrief, limits, usage, isPro } = usePlanLimits();

  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(null);

  const fetchBriefs = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from("briefs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setBriefs(data || []);
      } else {
        const localBriefs = readGlobal("briefs", [])
          .filter((brief) => brief?.user_id === user.id || brief?.userId === user.id)
          .sort((a, b) => new Date(getCreatedAt(b)) - new Date(getCreatedAt(a)));

        setBriefs(localBriefs);
      }
    } catch (err) {
      console.error("Failed to load briefs:", err);
      toast.error("Failed to load briefs");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBriefs();
  }, [fetchBriefs]);

  const handleDelete = async (briefId) => {
    if (!user?.id) return;

    setDeleting(briefId);

    try {
      if (isSupabaseEnabled) {
        const { error } = await supabase
          .from("briefs")
          .delete()
          .eq("id", briefId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        writeGlobal(
          "briefs",
          readGlobal("briefs", []).filter((brief) => brief.id !== briefId)
        );
      }

      setBriefs((prev) => prev.filter((brief) => brief.id !== briefId));
      toast.success("Brief deleted");
    } catch (err) {
      console.error("Failed to delete brief:", err);
      toast.error("Failed to delete brief");
    } finally {
      setDeleting(null);
    }
  };

  const handleNewBrief = () => {
    if (!canAddBrief) {
      toast.error("Brief limit reached. Upgrade to create more briefs.");
      navigate("/pricing-app");
      return;
    }

    navigate("/briefs/new");
  };

  const getIntakeLink = (brief) => {
    const token = getShareToken(brief);
    if (!token) return null;

    return `${window.location.origin}/#/intake/${token}`;
  };

  const handleShareWhatsApp = (e, brief) => {
    e.stopPropagation();

    const intakeLink = getIntakeLink(brief);

    if (!intakeLink) {
      toast.error("Open the brief and enable sharing first");
      return;
    }

    const text = `Hi ${brief.client_name || ""},

I have prepared a project brief for ${brief.title || "your project"} on GigVorx.

Please fill in your details using this link:
${intakeLink}

It will only take a few minutes.`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleCopyLink = async (e, brief) => {
    e.stopPropagation();

    const intakeLink = getIntakeLink(brief);

    if (!intakeLink) {
      toast.error("Open the brief and enable sharing first");
      return;
    }

    try {
      await navigator.clipboard.writeText(intakeLink);
      toast.success("Intake link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return briefs;

    return briefs.filter((brief) => {
      return (
        brief.title?.toLowerCase().includes(search) ||
        brief.client_name?.toLowerCase().includes(search) ||
        brief.client_email?.toLowerCase().includes(search)
      );
    });
  }, [briefs, query]);

  const briefsLeft =
    limits.briefs === Infinity ? Infinity : Math.max(0, limits.briefs - usage.briefs);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Briefs</h1>
          <p className="mt-1 text-muted-foreground">
            Create, share, and manage structured briefs for client work.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isPro && (
            <div className="rounded-lg border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <span
                className={
                  usage.briefs >= limits.briefs ? "font-semibold text-rose-600" : ""
                }
              >
                {usage.briefs}/{limits.briefs} briefs this month
              </span>
            </div>
          )}

          <Button
            onClick={handleNewBrief}
            className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Brief
          </Button>
        </div>
      </div>

      {!isPro && usage.briefs >= limits.briefs - 2 && usage.briefs < limits.briefs && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <span>
            You have{" "}
            <span className="font-semibold">
              {briefsLeft} brief{briefsLeft !== 1 ? "s" : ""}
            </span>{" "}
            left this month.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/pricing-app")}
            className="h-7 border-amber-300 text-xs text-amber-700 hover:bg-amber-100"
          >
            Upgrade
          </Button>
        </div>
      )}

      {!isPro && usage.briefs >= limits.briefs && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <span className="font-semibold">
            Monthly brief limit reached. Upgrade to create more briefs.
          </span>
          <Button
            size="sm"
            onClick={() => navigate("/pricing-app")}
            className="ml-3 h-7 bg-rose-600 text-xs text-white hover:bg-rose-700"
          >
            Upgrade Now
          </Button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search briefs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="mb-1 font-semibold">
            {briefs.length === 0 ? "No briefs yet" : "No matches"}
          </p>
          <p className="mb-5 text-sm text-muted-foreground">
            {briefs.length === 0
              ? "Create your first brief and share it with a client."
              : "Try a different search term."}
          </p>

          {briefs.length === 0 && (
            <Button
              onClick={handleNewBrief}
              className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create your first brief
            </Button>
          )}
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((brief) => {
            const shareToken = getShareToken(brief);
            const live = shareToken && isSharingEnabled(brief);

            return (
              <Card
                key={brief.id}
                className="group cursor-pointer p-5 transition-all hover:border-foreground/30 hover:shadow-md"
                onClick={() => navigate(`/briefs/${brief.id}`)}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF6B00]/20">
                    <FileText className="h-5 w-5 text-[#FF6B00]" />
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      statusColors[brief.status] || statusColors.draft
                    }`}
                  >
                    {brief.status || "draft"}
                  </Badge>
                </div>

                <p className="line-clamp-2 font-semibold leading-tight">
                  {brief.title || "Untitled Brief"}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {brief.client_name || "No client"}
                  {brief.client_email && ` · ${brief.client_email}`}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {getQuestionCount(brief)} questions
                  {live && <span className="ml-2 text-green-500">● Live</span>}
                </p>

                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>{formatDate(getCreatedAt(brief))}</span>

                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => handleCopyLink(e, brief)}
                      title="Copy intake link"
                    >
                      <Link2 className="h-3 w-3" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => handleShareWhatsApp(e, brief)}
                      title="Share via WhatsApp"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/briefs/${brief.id}`);
                      }}
                      title="Edit brief"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                          title="Delete brief"
                        >
                          {deleting === brief.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this brief?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &quot;
                            {brief.title || "Untitled Brief"}&quot; and cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(brief.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
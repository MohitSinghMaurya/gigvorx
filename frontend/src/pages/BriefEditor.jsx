import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readGlobal, writeGlobal, uid } from "@/lib/storage";
import { NICHES } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBriefDialog } from "@/components/ShareBriefDialog";
import {
  Save,
  Download,
  Link2,
  MessageCircle,
  Plus,
  X,
  Type,
  FileText,
  List,
  Upload,
  Image,
  Link,
  Video,
  CheckCircle2,
  Loader2,
  Phone,
  Mail,
  User,
  Lock,
  Crown,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const QUESTION_TYPES = [
  { id: "text", label: "Short Answer", icon: Type },
  { id: "long", label: "Long Answer", icon: FileText },
  { id: "select", label: "Multiple Choice", icon: List },
  { id: "file", label: "File Upload", icon: Upload },
  { id: "image", label: "Image Upload", icon: Image },
  { id: "link", label: "URL / Link", icon: Link },
  { id: "video", label: "Video Link", icon: Video },
];

const questionTypeLabels = Object.fromEntries(
  QUESTION_TYPES.map((type) => [type.id, type.label])
);

const questionTypeIcons = Object.fromEntries(
  QUESTION_TYPES.map((type) => [type.id, type.icon])
);

const questionTypeColors = {
  text: "bg-blue-100 text-blue-700 border-blue-200",
  long: "bg-indigo-100 text-indigo-700 border-indigo-200",
  select: "bg-purple-100 text-purple-700 border-purple-200",
  file: "bg-orange-100 text-orange-700 border-orange-200",
  image: "bg-pink-100 text-pink-700 border-pink-200",
  link: "bg-teal-100 text-teal-700 border-teal-200",
  video: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_OPTIONS = ["draft", "sent", "approved", "completed"];

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return uid();
}

function normalizeQuestions(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function templateQuestions(niche) {
  return (niche.questions || []).map((question) => ({
    id: makeId(),
    text: typeof question === "string" ? question : question.text,
    type: typeof question === "string" ? "long" : question.type || "long",
    options: typeof question === "string" ? undefined : question.options,
    required: true,
  }));
}

function cleanBriefPayload({
  user,
  clientName,
  clientEmail,
  clientPhone,
  projectTitle,
  description,
  budget,
  timeline,
  status,
  questions,
  answers,
  confirmed,
  currency,
}) {
  return {
    user_id: user.id,
    userId: user.id,
    client_name: clientName.trim(),
    client_email: clientEmail.trim(),
    client_phone: clientPhone.trim(),
    title: projectTitle.trim(),
    description: description.trim(),
    budget: budget.trim(),
    timeline: timeline.trim(),
    status,
    questions: questions.map((question) => ({
      ...question,
      id: question.id || makeId(),
    })),
    answers,
    confirmed,
    currency,
  };
}

function NichePickerModal({ open, onConfirm, saving }) {
  const [selected, setSelected] = useState([]);

  const toggle = (nicheName) => {
    if (selected.includes(nicheName)) {
      setSelected(selected.filter((item) => item !== nicheName));
      return;
    }

    if (selected.length < 5) {
      setSelected([...selected, nicheName]);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/10 bg-[#111] text-white"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Choose your 5 niches
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Starter plan users can choose 5 permanent niche templates. Upgrade
            later for all niches.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NICHES.map((niche) => {
            const selectedNow = selected.includes(niche.name);
            const disabled = !selectedNow && selected.length >= 5;

            return (
              <button
                key={niche.name}
                type="button"
                disabled={disabled}
                onClick={() => toggle(niche.name)}
                className={`rounded-lg border p-3 text-left text-sm font-medium transition-all ${
                  selectedNow
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : disabled
                    ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/20"
                    : "border-white/10 bg-white/5 text-white/80 hover:border-white/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {selectedNow && <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>{niche.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-sm text-white/50">{selected.length} / 5 selected</p>
          <Button
            disabled={selected.length !== 5 || saving}
            onClick={() => onConfirm(selected)}
            className="bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            Confirm niches
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BriefEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, saveChosenNiches } = useAuth();
  const { currency } = useCurrency();
  const { canAddBrief, isStarter, isPro } = usePlanLimits();

  const editing = Boolean(id && id !== "new");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [status, setStatus] = useState("draft");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(editing);
  const [briefData, setBriefData] = useState(null);
  const [savingNiches, setSavingNiches] = useState(false);

  const chosenNiches = user?.chosenNiches || user?.chosen_niches || null;
  const needsNichePicker = isStarter && !chosenNiches;

  const isNicheAllowed = useCallback(
    (nicheName) => {
      if (!isStarter) return true;
      return Array.isArray(chosenNiches) && chosenNiches.includes(nicheName);
    },
    [isStarter, chosenNiches]
  );

  useEffect(() => {
    if (!user?.id) return;

    const key = `gigvorx_templates_${user.id}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setSavedTemplates(JSON.parse(stored));
    } catch {
      setSavedTemplates([]);
    }
  }, [user?.id]);

  const loadBrief = useCallback(async () => {
    if (!editing || !user?.id) return;

    setLoadingBrief(true);

    try {
      let data = null;

      if (isSupabaseEnabled) {
        const res = await supabase
          .from("briefs")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (res.error) throw res.error;
        data = res.data;
      } else {
        data = readGlobal("briefs", []).find(
          (brief) =>
            brief.id === id &&
            (brief.user_id === user.id || brief.userId === user.id)
        );
      }

      if (!data) {
        toast.error("Brief not found");
        navigate("/briefs");
        return;
      }

      setClientName(data.client_name || "");
      setClientEmail(data.client_email || "");
      setClientPhone(data.client_phone || "");
      setProjectTitle(data.title || "");
      setDescription(data.description || "");
      setBudget(data.budget || "");
      setTimeline(data.timeline || "");
      setStatus(data.status || "draft");
      setQuestions(normalizeQuestions(data.questions));
      setAnswers(data.answers || {});
      setConfirmed(Boolean(data.confirmed));
      setBriefData(data);
    } catch (err) {
      console.error("Error loading brief:", err);
      toast.error("Error loading brief");
      navigate("/briefs");
    } finally {
      setLoadingBrief(false);
    }
  }, [editing, id, navigate, user?.id]);

  useEffect(() => {
    loadBrief();
  }, [loadBrief]);

  const handleConfirmNiches = async (selectedNiches) => {
    if (!saveChosenNiches) {
      toast.error("Niche saving is not available yet.");
      return;
    }

    setSavingNiches(true);

    try {
      await saveChosenNiches(selectedNiches);
      toast.success("Your 5 niches are saved.");
    } catch (err) {
      toast.error(err.message || "Failed to save niches");
    } finally {
      setSavingNiches(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Please sign in again.");
      return;
    }

    if (!editing && !canAddBrief) {
      toast.error("Brief limit reached. Upgrade to create more briefs.");
      navigate("/pricing-app");
      return;
    }

    if (!projectTitle.trim()) {
      toast.error("Project title is required");
      setActiveTab("details");
      return;
    }

    if (!clientName.trim()) {
      toast.error("Client name is required");
      setActiveTab("details");
      return;
    }

    if (!confirmed) {
      toast.error("Please confirm the information is accurate");
      setActiveTab("details");
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const payload = cleanBriefPayload({
        user,
        clientName,
        clientEmail,
        clientPhone,
        projectTitle,
        description,
        budget,
        timeline,
        status,
        questions,
        answers,
        confirmed,
        currency,
      });

      if (editing) {
        if (isSupabaseEnabled) {
          const { error } = await supabase
            .from("briefs")
            .update({
              ...payload,
              updated_at: now,
            })
            .eq("id", id)
            .eq("user_id", user.id);

          if (error) throw error;
        } else {
          writeGlobal(
            "briefs",
            readGlobal("briefs", []).map((brief) =>
              brief.id === id &&
              (brief.user_id === user.id || brief.userId === user.id)
                ? { ...brief, ...payload, updatedAt: now }
                : brief
            )
          );
        }

        toast.success("Brief updated successfully");
        await loadBrief();
      } else {
        const newId = makeId();
        const shareToken = makeId();

        if (isSupabaseEnabled) {
          const { data: newBrief, error } = await supabase
            .from("briefs")
            .insert({
              ...payload,
              created_at: now,
              updated_at: now,
              share_token: shareToken,
              share_enabled: true,
            })
            .select()
            .single();

          if (error) throw error;

          toast.success("Brief created successfully");
          navigate(`/briefs/${newBrief.id}`);
        } else {
          const newBrief = {
            id: newId,
            ...payload,
            createdAt: now,
            updatedAt: now,
            share_token: shareToken,
            share_enabled: true,
          };

          writeGlobal("briefs", [newBrief, ...readGlobal("briefs", [])]);
          toast.success("Brief created successfully");
          navigate(`/briefs/${newId}`);
        }
      }
    } catch (err) {
      console.error("Error saving brief:", err);
      toast.error(err.message || "Error saving brief");
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleAddQuestion = (type) => {
    setQuestions((prev) => [
      ...prev,
      {
        id: makeId(),
        text: "",
        type,
        options: type === "select" ? ["Option 1", "Option 2"] : undefined,
        required: false,
      },
    ]);

    setAddQuestionDialogOpen(false);
  };

  const handleUpdateQuestion = (index, updates) => {
    setQuestions((prev) =>
      prev.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...updates } : question
      )
    );
  };

  const handleDeleteQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, questionIndex) => questionIndex !== index));
  };

  const handleMoveQuestion = (index, direction) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const updated = [...questions];
    const current = updated[index];

    updated[index] = updated[targetIndex];
    updated[targetIndex] = current;

    setQuestions(updated);
  };

  const handleAddOption = (questionIndex) => {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: [
                ...(question.options || []),
                `Option ${(question.options || []).length + 1}`,
              ],
            }
          : question
      )
    );
  };

  const handleUpdateOption = (questionIndex, optionIndex, value) => {
    setQuestions((prev) =>
      prev.map((question, index) => {
        if (index !== questionIndex) return question;

        const options = [...(question.options || [])];
        options[optionIndex] = value;

        return { ...question, options };
      })
    );
  };

  const handleDeleteOption = (questionIndex, optionIndex) => {
    setQuestions((prev) =>
      prev.map((question, index) => {
        if (index !== questionIndex) return question;

        return {
          ...question,
          options: (question.options || []).filter(
            (_, currentIndex) => currentIndex !== optionIndex
          ),
        };
      })
    );
  };

  const handleSaveTemplate = () => {
    if (!user?.id) return;

    const key = `gigvorx_templates_${user.id}`;
    const template = {
      id: makeId(),
      name: `${projectTitle || "Untitled"} Template`,
      questions: [...questions],
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedTemplates, template];
    localStorage.setItem(key, JSON.stringify(updated));
    setSavedTemplates(updated);
    toast.success("Template saved");
  };

  const handleLoadTemplate = (template) => {
    setQuestions(
      normalizeQuestions(template.questions).map((question) => ({
        ...question,
        id: makeId(),
      }))
    );
    toast.success(`Loaded ${template.name}`);
  };

  const handleDeleteTemplate = (templateId) => {
    const updated = savedTemplates.filter((template) => template.id !== templateId);
    setSavedTemplates(updated);

    if (user?.id) {
      localStorage.setItem(`gigvorx_templates_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(projectTitle || "Project Brief", 20, 20);

    doc.setFontSize(12);
    doc.text(`Client: ${clientName || "-"}`, 20, 35);
    doc.text(`Email: ${clientEmail || "-"}`, 20, 42);
    doc.text(`Phone: ${clientPhone || "-"}`, 20, 49);
    doc.text(`Status: ${status.toUpperCase()}`, 20, 56);
    doc.text(`Budget: ${budget || "-"}`, 20, 63);
    doc.text(`Timeline: ${timeline || "-"}`, 20, 70);

    doc.setFontSize(14);
    doc.text("Description:", 20, 82);

    doc.setFontSize(11);
    const descLines = doc.splitTextToSize(
      description || "No description provided.",
      170
    );
    doc.text(descLines, 20, 89);

    let y = 89 + descLines.length * 5 + 10;

    doc.setFontSize(14);
    doc.text("Questions & Answers:", 20, y);
    y += 8;

    doc.setFontSize(11);

    questions.forEach((question, index) => {
      const qText = `${index + 1}. [${
        questionTypeLabels[question.type] || question.type
      }] ${question.text || "Untitled question"}`;

      const qLines = doc.splitTextToSize(qText, 170);
      if (y + qLines.length * 5 > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(qLines, 20, y);
      y += qLines.length * 5 + 2;

      if (answers[question.id]) {
        const aLines = doc.splitTextToSize(`Answer: ${answers[question.id]}`, 165);
        doc.setTextColor(100, 100, 100);
        doc.text(aLines, 25, y);
        doc.setTextColor(0, 0, 0);
        y += aLines.length * 5 + 2;
      }

      if (question.options?.length) {
        question.options.forEach((option, optionIndex) => {
          const optLines = doc.splitTextToSize(
            `${String.fromCharCode(97 + optionIndex)}) ${option}`,
            160
          );

          if (y + optLines.length * 5 > 280) {
            doc.addPage();
            y = 20;
          }

          doc.text(optLines, 25, y);
          y += optLines.length * 5 + 2;
        });
      }

      y += 3;
    });

    doc.save(`${projectTitle || "brief"}_gigvorx.pdf`);
    toast.success("PDF downloaded");
  };

  const handleShareWhatsApp = () => {
    if (!editing) {
      toast.error("Please save the brief first before sharing");
      return;
    }

    if (!briefData?.share_token) {
      toast.error("Please enable sharing from the Share button first");
      return;
    }

    const intakeLink = `${window.location.origin}/#/intake/${briefData.share_token}`;
    const text = `Hi ${clientName},

I have prepared a project brief for ${projectTitle} on GigVorx.

Please fill in your details using this link:
${intakeLink}

It will only take a few minutes. Let me know if you have any questions.`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleNicheSelect = (niche) => {
    if (!isNicheAllowed(niche.name)) {
      navigate("/pricing-app");
      return;
    }

    const loadedQuestions = templateQuestions(niche);
    setQuestions(loadedQuestions);
    setActiveTab("questions");
    toast.success(`Loaded ${niche.name} template with ${loadedQuestions.length} questions`);
  };

  const allowedNiches = useMemo(() => {
    return NICHES.filter((niche) => isNicheAllowed(niche.name));
  }, [isNicheAllowed]);

  if (loadingBrief) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 text-white">
      <NichePickerModal
        open={needsNichePicker}
        onConfirm={handleConfirmNiches}
        saving={savingNiches}
      />

      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/briefs")}
              className="text-white/60 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>

            <h1 className="text-xl font-bold text-white">
              {editing ? "Edit Brief" : "New Brief"}
            </h1>

            <Badge
              variant="outline"
              className={
                status === "approved"
                  ? "border-green-500 text-green-400"
                  : status === "sent"
                  ? "border-blue-500 text-blue-400"
                  : "border-yellow-500 text-yellow-400"
              }
            >
              {status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareOpen(true)}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  <Link2 className="mr-1.5 h-4 w-4" />
                  Share
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/briefs/${id}/responses`)}
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Responses
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Download className="mr-1.5 h-4 w-4" />
              PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              className="border-white/10 text-white hover:bg-white/5"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              WhatsApp
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  {editing ? "Update" : "Save"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {!editing && !canAddBrief && (
          <Card className="mb-6 border-rose-500/30 bg-rose-500/10">
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-semibold text-rose-300">Brief limit reached</p>
                <p className="text-sm text-rose-200/80">
                  Upgrade to create more briefs.
                </p>
              </div>
              <Button
                onClick={() => navigate("/pricing-app")}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                <Crown className="mr-1.5 h-4 w-4" />
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 border border-white/10 bg-white/5">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="questions"
              className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white"
            >
              Questions ({questions.length})
            </TabsTrigger>
            <TabsTrigger
              value="fill"
              className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white"
            >
              Fill Answers
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white"
            >
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card className="border-white/10 bg-[#111]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="h-5 w-5 text-[#FF6B00]" />
                  Project Details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-white/80">Project Title *</Label>
                    <Input
                      value={projectTitle}
                      onChange={(event) => setProjectTitle(event.target.value)}
                      placeholder="e.g., E-commerce Website Redesign"
                      className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Status</Label>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className="h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white"
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item.charAt(0).toUpperCase() + item.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-white/10 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <User className="h-4 w-4 text-[#FF6B00]" />
                    Client Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white/80">Client Name *</Label>
                      <Input
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                        placeholder="e.g., Rahul Sharma"
                        className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-white/80">
                        <Mail className="h-3 w-3" />
                        Client Email
                      </Label>
                      <Input
                        type="email"
                        value={clientEmail}
                        onChange={(event) => setClientEmail(event.target.value)}
                        placeholder="client@example.com"
                        className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-white/80">
                        <Phone className="h-3 w-3" />
                        Client Phone
                      </Label>
                      <Input
                        type="tel"
                        value={clientPhone}
                        onChange={(event) => setClientPhone(event.target.value)}
                        placeholder="+91 98765 43210"
                        className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Project Description</Label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe the project scope, goals, and requirements..."
                    rows={4}
                    className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-white/80">Budget ({currency})</Label>
                    <Input
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                      placeholder={`e.g., 50,000 ${currency === "INR" ? "Rs." : "$"}`}
                      className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Timeline</Label>
                    <Input
                      value={timeline}
                      onChange={(event) => setTimeline(event.target.value)}
                      placeholder="e.g., 2 weeks, by Dec 31"
                      className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111]">
              <CardContent className="pt-6">
                <label className="group flex cursor-pointer items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmed((prev) => !prev)}
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                      confirmed
                        ? "border-[#FF6B00] bg-[#FF6B00]"
                        : "border-white/30 group-hover:border-white/50"
                    }`}
                  >
                    {confirmed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </button>

                  <span className="text-sm text-white/70">
                    I confirm all the information provided is accurate and complete.
                  </span>
                </label>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Client Questions</h2>
                <p className="text-sm text-white/50">
                  Add questions to collect specific information from your client.
                </p>
              </div>

              <Dialog
                open={addQuestionDialogOpen}
                onOpenChange={setAddQuestionDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Question
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md border-white/10 bg-[#111] text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Choose Question Type</DialogTitle>
                  </DialogHeader>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {QUESTION_TYPES.map((type) => {
                      const Icon = type.icon;

                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => handleAddQuestion(type.id)}
                          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-[#FF6B00]/50 hover:bg-white/10"
                        >
                          <div
                            className={`rounded-lg border p-2 ${
                              questionTypeColors[type.id]
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {type.label}
                            </div>
                            <div className="text-xs text-white/40">
                              Add a {type.label.toLowerCase()} question
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {questions.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
                  <p className="text-sm text-white/40">
                    No questions yet. Click “Add Question” or use a niche template.
                  </p>
                </div>
              )}

              {questions.map((question, index) => {
                const Icon = questionTypeIcons[question.type] || Type;

                return (
                  <div
                    key={question.id}
                    className="space-y-3 rounded-xl border border-white/10 bg-[#111] p-4 transition-colors hover:border-white/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 font-mono text-sm text-white/30">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={`text-xs font-medium ${
                              questionTypeColors[question.type] ||
                              questionTypeColors.text
                            }`}
                          >
                            <Icon className="mr-1 h-3 w-3" />
                            {questionTypeLabels[question.type] || question.type}
                          </Badge>

                          <select
                            value={question.type}
                            onChange={(event) =>
                              handleUpdateQuestion(index, {
                                type: event.target.value,
                                options:
                                  event.target.value === "select"
                                    ? question.options || ["Option 1", "Option 2"]
                                    : undefined,
                              })
                            }
                            className="h-7 rounded-md border border-white/10 bg-[#1a1a1a] px-2 text-xs text-white/70"
                          >
                            {QUESTION_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Input
                          value={question.text}
                          onChange={(event) =>
                            handleUpdateQuestion(index, { text: event.target.value })
                          }
                          placeholder="Enter your question here..."
                          className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                        />

                        {question.type === "select" && (
                          <div className="space-y-2">
                            <Label className="text-xs text-white/60">Options</Label>
                            {(question.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <div className="h-4 w-4 flex-shrink-0 rounded-full border border-white/20" />
                                <Input
                                  value={option}
                                  onChange={(event) =>
                                    handleUpdateOption(
                                      index,
                                      optionIndex,
                                      event.target.value
                                    )
                                  }
                                  placeholder={`Option ${optionIndex + 1}`}
                                  className="border-white/10 bg-[#1a1a1a] text-sm text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteOption(index, optionIndex)}
                                  className="px-2 text-red-400 hover:bg-red-500/10"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddOption(index)}
                              className="text-xs text-[#FF6B00] hover:bg-[#FF6B00]/10"
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add Option
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveQuestion(index, -1)}
                          disabled={index === 0}
                          className="h-7 px-2 text-white/30 hover:bg-white/5 hover:text-white"
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveQuestion(index, 1)}
                          disabled={index === questions.length - 1}
                          className="h-7 px-2 text-white/30 hover:bg-white/5 hover:text-white"
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(index)}
                          className="h-7 px-2 text-red-400 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="fill" className="space-y-6">
            <div className="rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 p-4">
              <p className="text-sm font-medium text-[#FF6B00]">
                Freelancer Fill Mode
              </p>
              <p className="mt-1 text-xs text-white/60">
                Fill answers during a client call. Answers are saved with the brief
                and included in the PDF.
              </p>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                <p className="text-sm text-white/40">
                  No questions yet. Add questions first.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => {
                  const answer = answers[question.id] || "";

                  return (
                    <Card key={question.id} className="border-white/10 bg-[#111]">
                      <CardContent className="space-y-3 pb-5 pt-5">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-sm font-bold text-[#FF6B00]">
                            {index + 1}.
                          </span>
                          <p className="font-medium text-white">
                            {question.text || "Untitled Question"}
                          </p>
                        </div>

                        <div className="pl-5">
                          {["text", "link", "video", "file", "image"].includes(
                            question.type
                          ) && (
                            <Input
                              value={answer}
                              onChange={(event) =>
                                handleAnswerChange(question.id, event.target.value)
                              }
                              placeholder={
                                question.type === "link"
                                  ? "https://..."
                                  : question.type === "video"
                                  ? "https://youtube.com/..."
                                  : "Type answer here..."
                              }
                              className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                            />
                          )}

                          {question.type === "long" && (
                            <Textarea
                              value={answer}
                              onChange={(event) =>
                                handleAnswerChange(question.id, event.target.value)
                              }
                              placeholder="Type detailed answer here..."
                              rows={3}
                              className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                            />
                          )}

                          {question.type === "select" && (
                            <div className="space-y-2">
                              {(question.options || []).map((option, optionIndex) => (
                                <label
                                  key={optionIndex}
                                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                                    answer === option
                                      ? "border-[#FF6B00] bg-[#FF6B00]/10"
                                      : "border-white/10 bg-[#1a1a1a] hover:border-white/20"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`answer-${question.id}`}
                                    value={option}
                                    checked={answer === option}
                                    onChange={(event) =>
                                      handleAnswerChange(
                                        question.id,
                                        event.target.value
                                      )
                                    }
                                    className="h-4 w-4 accent-[#FF6B00]"
                                  />
                                  <span className="text-sm text-white">{option}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-12 w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save All Answers
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            {isStarter && chosenNiches && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-300">
                  <Lock className="mr-1.5 inline h-3.5 w-3.5" />
                  Starter plan: <strong>{chosenNiches.length} niches</strong>{" "}
                  selected. Upgrade for all niches.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/pricing-app")}
                  className="shrink-0 bg-amber-500 text-white hover:bg-amber-600"
                >
                  <Crown className="mr-1.5 h-3.5 w-3.5" />
                  Upgrade
                </Button>
              </div>
            )}

            <Card className="border-white/10 bg-[#111]">
              <CardHeader>
                <CardTitle className="text-white">Saved Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleSaveTemplate}
                  className="w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  Save Current Questions as Template
                </Button>

                {savedTemplates.length === 0 ? (
                  <p className="py-3 text-center text-sm text-white/40">
                    No saved templates yet.
                  </p>
                ) : (
                  savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">
                          {template.name}
                        </div>
                        <div className="text-xs text-white/40">
                          {normalizeQuestions(template.questions).length} questions
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLoadTemplate(template)}
                          className="text-[#FF6B00] hover:bg-[#FF6B00]/10"
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-white">
                Niche Templates
              </h2>

              {isStarter && allowedNiches.length === 0 && (
                <p className="mb-4 text-sm text-amber-300">
                  Choose your 5 Starter niches first to use templates.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {NICHES.map((niche) => {
                  const allowed = isNicheAllowed(niche.name);

                  return (
                    <button
                      key={niche.name}
                      type="button"
                      onClick={() => handleNicheSelect(niche)}
                      className={`relative rounded-xl border p-4 text-left transition-all ${
                        allowed
                          ? "border-white/10 bg-[#111] hover:border-[#FF6B00]/50 hover:bg-[#161616]"
                          : "border-white/5 bg-[#111]/50"
                      }`}
                    >
                      {!allowed && (
                        <div className="absolute right-3 top-3">
                          <Badge className="gap-1 border-amber-500/30 bg-amber-500/20 text-[10px] text-amber-400">
                            <Lock className="h-2.5 w-2.5" />
                            Pro
                          </Badge>
                        </div>
                      )}

                      <div className="mb-2 flex items-center justify-between">
                        <h3
                          className={`font-medium ${
                            allowed ? "text-white" : "text-white/40"
                          }`}
                        >
                          {niche.name}
                        </h3>

                        {allowed && (
                          <Badge
                            variant="outline"
                            className="border-white/10 text-xs text-white/50"
                          >
                            {(niche.questions || []).length} Qs
                          </Badge>
                        )}
                      </div>

                      <p className={`text-xs ${allowed ? "text-white/40" : "text-white/20"}`}>
                        {allowed
                          ? (niche.questions || [])
                              .slice(0, 3)
                              .join(" • ")
                              .substring(0, 90) + "..."
                          : "Upgrade to unlock this niche template."}
                      </p>

                      {!allowed && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-400">
                          <Crown className="h-3 w-3" />
                          Upgrade to unlock
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ShareBriefDialog
        brief={{
          id,
          share_token: briefData?.share_token,
          share_enabled: briefData?.share_enabled,
          clientName,
          clientEmail,
          projectTitle,
        }}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
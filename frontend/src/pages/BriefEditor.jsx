import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Download,
  FileText,
  Image,
  Link,
  Link2,
  List,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  Save,
  Sparkles,
  Type,
  Upload,
  Video,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import ClientEducationSection from "@/components/ClientEducationSection";
import { ShareBriefDialog } from "@/components/ShareBriefDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import {
  createDefaultClientEducation,
  getBriefGuidanceTemplate,
} from "@/lib/briefGuidanceTemplates";
import { NICHES } from "@/lib/niches";
import { readGlobal, uid, writeGlobal } from "@/lib/storage";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";
import { usePlanLimits } from "@/lib/usePlanLimits";

const QUESTION_TYPES = [
  { id: "text", label: "Short Answer", icon: Type },
  { id: "long", label: "Long Answer", icon: FileText },
  { id: "select", label: "Multiple Choice", icon: List },
  { id: "file", label: "File Upload", icon: Upload },
  { id: "image", label: "Image Upload", icon: Image },
  { id: "link", label: "URL / Link", icon: Link },
  { id: "video", label: "Video Link", icon: Video },
];

const STATUS_OPTIONS = ["draft", "sent", "approved", "completed"];

const questionTypeLabels = Object.fromEntries(
  QUESTION_TYPES.map((type) => [type.id, type.label])
);

const questionTypeIcons = Object.fromEntries(
  QUESTION_TYPES.map((type) => [type.id, type.icon])
);

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

function ensureList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  return String(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(value) {
  return ensureList(value).join("\n");
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

function getBriefMeta(answers) {
  return answers?.__v1 || {};
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
  meta,
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
    answers: {
      ...answers,
      __v1: meta,
    },
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
                  {selectedNow ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
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
  const {
    canAddBrief,
    isStarter,
    allowedNiches,
    isTrialExpired,
  } = usePlanLimits();

  const editing = Boolean(id && id !== "new");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [status, setStatus] = useState("draft");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [confirmed, setConfirmed] = useState(false);

  const [includedWork, setIncludedWork] = useState([]);
  const [excludedWork, setExcludedWork] = useState([]);
  const [revisionLimit, setRevisionLimit] = useState("2");
  const [revisionsUsed, setRevisionsUsed] = useState("0");
  const [advanceRequired, setAdvanceRequired] = useState(true);
  const [advanceType, setAdvanceType] = useState("percent");
  const [advanceValue, setAdvanceValue] = useState("50");
  const [approvalStatus, setApprovalStatus] = useState("not_approved");
  const [scopeApprovedAt, setScopeApprovedAt] = useState(null);
  const [clientEducation, setClientEducation] = useState(
    createDefaultClientEducation("Default")
  );

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
      if (Array.isArray(chosenNiches)) return chosenNiches.includes(nicheName);
      return allowedNiches.includes(nicheName);
    },
    [allowedNiches, chosenNiches, isStarter]
  );

  const scopeMeta = useMemo(
    () => ({
      selectedNiche,
      includedWork,
      excludedWork,
      revisionLimit: Number(revisionLimit) || 0,
      revisionsUsed: Number(revisionsUsed) || 0,
      advanceRequired,
      advanceType,
      advanceValue,
      approvalStatus,
      scopeApprovedAt,
      clientEducation,
    }),
    [
      advanceRequired,
      advanceType,
      advanceValue,
      approvalStatus,
      clientEducation,
      excludedWork,
      includedWork,
      revisionLimit,
      revisionsUsed,
      scopeApprovedAt,
      selectedNiche,
    ]
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
    if (!editing || !user?.id) {
      setLoadingBrief(false);
      return;
    }

    setLoadingBrief(true);

    try {
      let data = null;

      if (isSupabaseEnabled && supabase) {
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
        toast.error("Brief not found.");
        navigate("/briefs");
        return;
      }

      const loadedAnswers = data.answers || {};
      const meta = getBriefMeta(loadedAnswers);

      setClientName(data.client_name || data.clientName || "");
      setClientEmail(data.client_email || data.clientEmail || "");
      setClientPhone(data.client_phone || data.clientPhone || "");
      setProjectTitle(data.title || data.projectTitle || "");
      setDescription(data.description || "");
      setBudget(data.budget || "");
      setTimeline(data.timeline || "");
      setStatus(data.status || "draft");
      setQuestions(normalizeQuestions(data.questions));
      setAnswers(loadedAnswers);
      setConfirmed(Boolean(data.confirmed));
      setSelectedNiche(meta.selectedNiche || data.niche || "");
      setIncludedWork(ensureList(meta.includedWork));
      setExcludedWork(ensureList(meta.excludedWork));
      setRevisionLimit(String(meta.revisionLimit ?? "2"));
      setRevisionsUsed(String(meta.revisionsUsed ?? "0"));
      setAdvanceRequired(meta.advanceRequired ?? true);
      setAdvanceType(meta.advanceType || "percent");
      setAdvanceValue(String(meta.advanceValue ?? "50"));
      setApprovalStatus(meta.approvalStatus || "not_approved");
      setScopeApprovedAt(meta.scopeApprovedAt || null);
      setClientEducation(
        meta.clientEducation || createDefaultClientEducation(meta.selectedNiche || "Default")
      );
      setBriefData(data);
    } catch (error) {
      console.error("Error loading brief:", error);
      toast.error(error.message || "Error loading brief.");
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
    } catch (error) {
      toast.error(error.message || "Failed to save niches.");
    } finally {
      setSavingNiches(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Please sign in again.");
      return;
    }

    if (isTrialExpired) {
      toast.error("Your trial has expired. Upgrade to continue.");
      navigate("/pricing-app");
      return;
    }

    if (!editing && !canAddBrief) {
      toast.error("Brief limit reached. Upgrade to create more briefs.");
      navigate("/pricing-app");
      return;
    }

    if (!projectTitle.trim()) {
      toast.error("Project title is required.");
      setActiveTab("details");
      return;
    }

    if (!clientName.trim()) {
      toast.error("Client name is required.");
      setActiveTab("details");
      return;
    }

    if (!confirmed) {
      toast.error("Please confirm the information is accurate.");
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
        meta: scopeMeta,
      });

      if (editing) {
        if (isSupabaseEnabled && supabase) {
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

        toast.success("Brief updated successfully.");
        await loadBrief();
      } else {
        const newId = makeId();
        const shareToken = makeId();

        if (isSupabaseEnabled && supabase) {
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

          toast.success("Brief created successfully.");
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
          toast.success("Brief created successfully.");
          navigate(`/briefs/${newId}`);
        }
      }
    } catch (error) {
      console.error("Error saving brief:", error);
      toast.error(error.message || "Error saving brief.");
    } finally {
      setSaving(false);
    }
  };

  const handleNicheSelect = (niche) => {
    if (!isNicheAllowed(niche.name)) {
      toast.error("Upgrade to unlock this niche template.");
      navigate("/pricing-app");
      return;
    }

    const education = createDefaultClientEducation(niche.name);

    setSelectedNiche(niche.name);
    setQuestions(templateQuestions(niche));
    setClientEducation(education);
    setIncludedWork([]);
    setExcludedWork([]);
    toast.success(`${niche.name} template loaded.`);
    setActiveTab("questions");
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
  };

  const handleAddQuestion = (type) => {
    setQuestions((previous) => [
      ...previous,
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
    setQuestions((previous) =>
      previous.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...updates } : question
      )
    );
  };

  const handleDeleteQuestion = (index) => {
    setQuestions((previous) =>
      previous.filter((_, questionIndex) => questionIndex !== index)
    );
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
    setQuestions((previous) =>
      previous.map((question, index) =>
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
    setQuestions((previous) =>
      previous.map((question, index) => {
        if (index !== questionIndex) return question;

        const options = [...(question.options || [])];
        options[optionIndex] = value;

        return { ...question, options };
      })
    );
  };

  const handleDeleteOption = (questionIndex, optionIndex) => {
    setQuestions((previous) =>
      previous.map((question, index) => {
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
    toast.success("Template saved.");
  };

  const handleLoadTemplate = (template) => {
    setQuestions(
      normalizeQuestions(template.questions).map((question) => ({
        ...question,
        id: makeId(),
      }))
    );

    toast.success(`Loaded ${template.name}.`);
  };

  const handleDeleteTemplate = (templateId) => {
    const updated = savedTemplates.filter((template) => template.id !== templateId);
    setSavedTemplates(updated);

    if (user?.id) {
      localStorage.setItem(`gigvorx_templates_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleApproveScope = () => {
    setApprovalStatus("approved");
    setScopeApprovedAt(new Date().toISOString());
    setStatus("approved");
    toast.success("Scope marked as approved.");
  };

  const handleResetScopeApproval = () => {
    setApprovalStatus("not_approved");
    setScopeApprovedAt(null);
    if (status === "approved") setStatus("sent");
    toast.success("Scope approval reset.");
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

    let y = 82;

    const addSection = (title, lines) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text(title, 20, y);
      y += 8;

      doc.setFontSize(11);
      lines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, 170);

        if (y + wrapped.length * 5 > 280) {
          doc.addPage();
          y = 20;
        }

        doc.text(wrapped, 20, y);
        y += wrapped.length * 5 + 3;
      });

      y += 5;
    };

    addSection("Description", [description || "No description provided."]);

    addSection(
      "Included Work",
      includedWork.length ? includedWork.map((item) => `• ${item}`) : ["-"]
    );

    addSection(
      "Excluded Work",
      excludedWork.length ? excludedWork.map((item) => `• ${item}`) : ["-"]
    );

    addSection("Revisions and Payment", [
      `Revision limit: ${revisionLimit || "0"}`,
      `Revisions used: ${revisionsUsed || "0"}`,
      `Advance required: ${advanceRequired ? "Yes" : "No"}`,
      advanceRequired
        ? `Advance: ${advanceValue}${advanceType === "percent" ? "%" : ""}`
        : "Advance: Not required",
      `Scope approval: ${approvalStatus === "approved" ? "Approved" : "Not approved"}`,
    ]);

    addSection(
      "Questions",
      questions.map((question, index) => {
        const answer = answers[question.id];
        return `${index + 1}. ${question.text || "Untitled question"}${
          answer ? `\nAnswer: ${answer}` : ""
        }`;
      })
    );

    doc.save(`${projectTitle || "brief"}_gigvorx.pdf`);
    toast.success("PDF downloaded.");
  };

  const handleShareWhatsApp = () => {
    if (!editing) {
      toast.error("Please save the brief first before sharing.");
      return;
    }

    const token = briefData?.share_token || briefData?.shareToken;

    if (!token) {
      setShareOpen(true);
      return;
    }

    const shareUrl = `${window.location.origin}/#/intake/${token}`;
    const text = encodeURIComponent(
      `Hi ${clientName},\n\nPlease fill this project brief so I can understand the work clearly:\n\n${shareUrl}\n\nThis will help me confirm scope, timeline, files needed, revisions, and next steps.`
    );

    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  if (loadingBrief) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <NichePickerModal
        open={needsNichePicker}
        onConfirm={handleConfirmNiches}
        saving={savingNiches}
      />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <button
            type="button"
            onClick={() => navigate("/briefs")}
            className="mb-3 flex items-center gap-2 text-sm text-white/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to briefs
          </button>

          <h1 className="text-3xl font-bold tracking-tight text-white">
            {editing ? "Edit Brief" : "Create Brief"}
          </h1>

          <p className="mt-1 text-sm text-white/50">
            Build a protected client workflow with intake guidance, clear scope,
            revisions, approval, and payment expectations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadPDF}
            className="border-white/10 text-white hover:bg-white/5"
          >
            <Download className="mr-1.5 h-4 w-4" />
            PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleShareWhatsApp}
            className="border-white/10 text-white hover:bg-white/5"
          >
            <MessageCircle className="mr-1.5 h-4 w-4" />
            WhatsApp
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShareOpen(true)}
            className="border-white/10 text-white hover:bg-white/5"
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            Share
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-[#111] p-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="scope">Scope</TabsTrigger>
          <TabsTrigger value="education">Client Guide</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="fill">Fill Mode</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card className="border-white/10 bg-[#111]">
            <CardHeader>
              <CardTitle className="text-white">Project and Client Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-white/70">Client name *</Label>
                  <Input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="Client name"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Client email</Label>
                  <Input
                    value={clientEmail}
                    onChange={(event) => setClientEmail(event.target.value)}
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="client@example.com"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Client phone</Label>
                  <Input
                    value={clientPhone}
                    onChange={(event) => setClientPhone(event.target.value)}
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Status</Label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white"
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-white/70">Project title *</Label>
                  <Input
                    value={projectTitle}
                    onChange={(event) => setProjectTitle(event.target.value)}
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="Website redesign, logo design, SEO audit..."
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-white/70">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="mt-1 resize-none border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="Short project summary..."
                  />
                </div>

                <div>
                  <Label className="text-white/70">Budget</Label>
                  <Input
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="₹50,000"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Timeline</Label>
                  <Input
                    value={timeline}
                    onChange={(event) => setTimeline(event.target.value)}
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="2 weeks"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#FF6B00]"
                />
                <span className="text-sm text-white/70">
                  I confirm this brief information is accurate enough to save and
                  share with the client.
                </span>
              </label>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scope" className="space-y-6">
          <Card className="border-white/10 bg-[#111]">
            <CardHeader>
              <CardTitle className="text-white">Scope Protection</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-white/70">Included work</Label>
                  <Textarea
                    value={listToText(includedWork)}
                    onChange={(event) => setIncludedWork(ensureList(event.target.value))}
                    rows={7}
                    className="mt-1 resize-none border-white/10 bg-[#1a1a1a] text-white"
                    placeholder={"One item per line\nHomepage design\nContact form setup"}
                  />
                </div>

                <div>
                  <Label className="text-white/70">Excluded work</Label>
                  <Textarea
                    value={listToText(excludedWork)}
                    onChange={(event) => setExcludedWork(ensureList(event.target.value))}
                    rows={7}
                    className="mt-1 resize-none border-white/10 bg-[#1a1a1a] text-white"
                    placeholder={"One item per line\nPaid ads\nExtra pages\nUnlimited revisions"}
                  />
                </div>

                <div>
                  <Label className="text-white/70">Revision limit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={revisionLimit}
                    onChange={(event) => setRevisionLimit(event.target.value)}
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Revisions used</Label>
                  <Input
                    type="number"
                    min="0"
                    value={revisionsUsed}
                    onChange={(event) => setRevisionsUsed(event.target.value)}
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Advance required?</Label>
                  <select
                    value={advanceRequired ? "yes" : "no"}
                    onChange={(event) => setAdvanceRequired(event.target.value === "yes")}
                    className="mt-1 h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white"
                  >
                    <option value="yes">Yes, before work starts</option>
                    <option value="no">No advance required</option>
                  </select>
                </div>

                <div>
                  <Label className="text-white/70">Advance amount</Label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={advanceType}
                      onChange={(event) => setAdvanceType(event.target.value)}
                      className="h-10 rounded-md border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">Fixed</option>
                    </select>

                    <Input
                      value={advanceValue}
                      onChange={(event) => setAdvanceValue(event.target.value)}
                      className="border-white/10 bg-[#1a1a1a] text-white"
                      placeholder="50"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">Scope approval</p>
                    <p className="mt-1 text-sm text-white/50">
                      {approvalStatus === "approved"
                        ? `Approved on ${new Date(scopeApprovedAt).toLocaleString("en-IN")}`
                        : "Not approved yet. Mark approved after client confirms the scope."}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {approvalStatus === "approved" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetScopeApproval}
                        className="border-white/10 text-white hover:bg-white/5"
                      >
                        Reset approval
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleApproveScope}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Mark scope approved
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education" className="space-y-6">
          <Card className="border-white/10 bg-[#111]">
            <CardHeader>
              <CardTitle className="text-white">Client Education Guide</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-sm text-blue-200">
                  This section educates clients before they answer the brief. Add
                  video/audio links, documents, images, checklists, and process
                  notes so clients know exactly what details to provide.
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={clientEducation.enabled}
                  onChange={(event) =>
                    setClientEducation({
                      ...clientEducation,
                      enabled: event.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-[#FF6B00]"
                />
                <span className="text-sm text-white/70">
                  Show client education section on public intake page
                </span>
              </label>

              <div>
                <Label className="text-white/70">Guide title</Label>
                <Input
                  value={clientEducation.title || ""}
                  onChange={(event) =>
                    setClientEducation({
                      ...clientEducation,
                      title: event.target.value,
                    })
                  }
                  className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                />
              </div>

              <div>
                <Label className="text-white/70">Intro / explanation</Label>
                <Textarea
                  value={clientEducation.intro || ""}
                  onChange={(event) =>
                    setClientEducation({
                      ...clientEducation,
                      intro: event.target.value,
                    })
                  }
                  rows={4}
                  className="mt-1 resize-none border-white/10 bg-[#1a1a1a] text-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-white/70">Video guide URL</Label>
                  <Input
                    value={clientEducation.videoUrl || ""}
                    onChange={(event) =>
                      setClientEducation({
                        ...clientEducation,
                        videoUrl: event.target.value,
                      })
                    }
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="https://youtube.com/..."
                  />
                </div>

                <div>
                  <Label className="text-white/70">Audio guide URL</Label>
                  <Input
                    value={clientEducation.audioUrl || ""}
                    onChange={(event) =>
                      setClientEducation({
                        ...clientEducation,
                        audioUrl: event.target.value,
                      })
                    }
                    className="mt-1 border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label className="text-white/70">Image URLs</Label>
                  <Textarea
                    value={listToText(clientEducation.imageUrls)}
                    onChange={(event) =>
                      setClientEducation({
                        ...clientEducation,
                        imageUrls: ensureList(event.target.value),
                      })
                    }
                    rows={4}
                    className="mt-1 resize-none border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="One image URL per line"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Document / PDF URLs</Label>
                  <Textarea
                    value={listToText(clientEducation.documentUrls)}
                    onChange={(event) =>
                      setClientEducation({
                        ...clientEducation,
                        documentUrls: ensureList(event.target.value),
                      })
                    }
                    rows={4}
                    className="mt-1 resize-none border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="One document URL per line"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Client checklist</Label>
                  <Textarea
                    value={listToText(clientEducation.checklist)}
                    onChange={(event) =>
                      setClientEducation({
                        ...clientEducation,
                        checklist: ensureList(event.target.value),
                      })
                    }
                    rows={7}
                    className="mt-1 resize-none border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="One checklist item per line"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Tips for clearer details</Label>
                  <Textarea
                    value={listToText(clientEducation.tips)}
                    onChange={(event) =>
                      setClientEducation({
                        ...clientEducation,
                        tips: ensureList(event.target.value),
                      })
                    }
                    rows={7}
                    className="mt-1 resize-none border-white/10 bg-[#1a1a1a] text-white"
                    placeholder="One tip per line"
                  />
                </div>
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const template = getBriefGuidanceTemplate(selectedNiche || "Default");
                    setClientEducation({
                      ...createDefaultClientEducation(selectedNiche || "Default"),
                      videoUrl: clientEducation.videoUrl || "",
                      audioUrl: clientEducation.audioUrl || "",
                    });
                    toast.success(`${template.title} loaded.`);
                  }}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Reset to niche guidance template
                </Button>
              </div>

              <div className="rounded-xl bg-white p-4 text-foreground">
                <ClientEducationSection education={clientEducation} compact />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Brief Questions</h2>
              <p className="text-sm text-white/50">
                Ask the client for the details and files needed to avoid confusion.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setAddQuestionDialogOpen(true)}
              className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add question
            </Button>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
              <p className="text-sm text-white/40">
                No questions yet. Use a niche template or add your own questions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const Icon = questionTypeIcons[question.type] || Type;

                return (
                  <Card key={question.id} className="border-white/10 bg-[#111]">
                    <CardContent className="space-y-4 pb-5 pt-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF6B00] text-xs font-bold text-white">
                          {index + 1}
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-white/10 text-white/60"
                            >
                              <Icon className="mr-1 h-3 w-3" />
                              {questionTypeLabels[question.type] || question.type}
                            </Badge>

                            <label className="flex items-center gap-2 text-xs text-white/50">
                              <input
                                type="checkbox"
                                checked={Boolean(question.required)}
                                onChange={(event) =>
                                  handleUpdateQuestion(index, {
                                    required: event.target.checked,
                                  })
                                }
                                className="accent-[#FF6B00]"
                              />
                              Required
                            </label>
                          </div>

                          <Input
                            value={question.text || ""}
                            onChange={(event) =>
                              handleUpdateQuestion(index, {
                                text: event.target.value,
                              })
                            }
                            className="border-white/10 bg-[#1a1a1a] text-white"
                            placeholder="Question text"
                          />

                          {question.type === "select" ? (
                            <div className="space-y-2">
                              {(question.options || []).map((option, optionIndex) => (
                                <div key={optionIndex} className="flex gap-2">
                                  <Input
                                    value={option}
                                    onChange={(event) =>
                                      handleUpdateOption(
                                        index,
                                        optionIndex,
                                        event.target.value
                                      )
                                    }
                                    className="border-white/10 bg-[#1a1a1a] text-white"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteOption(index, optionIndex)}
                                    className="text-red-400 hover:bg-red-500/10"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddOption(index)}
                                className="border-white/10 text-white hover:bg-white/5"
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Add option
                              </Button>
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveQuestion(index, -1)}
                              disabled={index === 0}
                              className="h-7 px-2 text-white/40 hover:bg-white/5 hover:text-white"
                            >
                              Up
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveQuestion(index, 1)}
                              disabled={index === questions.length - 1}
                              className="h-7 px-2 text-white/40 hover:bg-white/5 hover:text-white"
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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
                        ) ? (
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
                        ) : null}

                        {question.type === "long" ? (
                          <Textarea
                            value={answer}
                            onChange={(event) =>
                              handleAnswerChange(question.id, event.target.value)
                            }
                            placeholder="Type detailed answer here..."
                            rows={3}
                            className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                          />
                        ) : null}

                        {question.type === "select" ? (
                          <div className="space-y-2">
                            {(question.options || []).map((option) => (
                              <label
                                key={option}
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
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-12 w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Save className="mr-2 h-5 w-5" />
                )}
                Save All Answers
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {isStarter && chosenNiches ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-300">
                <Lock className="mr-1.5 inline h-3.5 w-3.5" />
                Starter plan: <strong>{chosenNiches.length} niches</strong>{" "}
                selected. Upgrade for all niches.
              </p>

              <Button
                type="button"
                size="sm"
                onClick={() => navigate("/pricing-app")}
                className="shrink-0 bg-amber-500 text-white hover:bg-amber-600"
              >
                <Crown className="mr-1.5 h-3.5 w-3.5" />
                Upgrade
              </Button>
            </div>
          ) : null}

          <Card className="border-white/10 bg-[#111]">
            <CardHeader>
              <CardTitle className="text-white">Saved Templates</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <Button
                type="button"
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
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLoadTemplate(template)}
                        className="text-[#FF6B00] hover:bg-[#FF6B00]/10"
                      >
                        Load
                      </Button>

                      <Button
                        type="button"
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

            {isStarter && allowedNiches.length === 0 ? (
              <p className="mb-4 text-sm text-amber-300">
                Choose your 5 Starter niches first to use templates.
              </p>
            ) : null}

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
                    {!allowed ? (
                      <div className="absolute right-3 top-3">
                        <Badge className="gap-1 border-amber-500/30 bg-amber-500/20 text-[10px] text-amber-400">
                          <Lock className="h-2.5 w-2.5" />
                          Pro
                        </Badge>
                      </div>
                    ) : null}

                    <div className="mb-2 flex items-center justify-between">
                      <h3
                        className={`font-medium ${
                          allowed ? "text-white" : "text-white/40"
                        }`}
                      >
                        {niche.name}
                      </h3>

                      {allowed ? (
                        <Badge
                          variant="outline"
                          className="border-white/10 text-xs text-white/50"
                        >
                          {(niche.questions || []).length} Qs
                        </Badge>
                      ) : null}
                    </div>

                    <p
                      className={`text-xs ${
                        allowed ? "text-white/40" : "text-white/20"
                      }`}
                    >
                      {allowed
                        ? `${(niche.questions || []).slice(0, 3).join(" • ").substring(0, 90)}...`
                        : "Upgrade to unlock this niche template."}
                    </p>

                    {!allowed ? (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-400">
                        <Crown className="h-3 w-3" />
                        Upgrade to unlock
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addQuestionDialogOpen} onOpenChange={setAddQuestionDialogOpen}>
        <DialogContent className="border-white/10 bg-[#111] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Question</DialogTitle>
            <DialogDescription className="text-white/50">
              Choose what type of information you want from the client.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUESTION_TYPES.map((type) => {
              const Icon = type.icon;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleAddQuestion(type.id)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-[#FF6B00]/60 hover:bg-[#FF6B00]/10"
                >
                  <Icon className="h-5 w-5 text-[#FF6B00]" />
                  <span className="font-medium text-white">{type.label}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <ShareBriefDialog
        brief={briefData}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onUpdated={(updatedBrief) => setBriefData(updatedBrief)}
      />
    </div>
  );
}
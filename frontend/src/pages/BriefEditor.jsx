import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Image,
  Link,
  Link2,
  List,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { NICHES } from "@/lib/niches";
import {
  cleanClientMessage,
  createBriefFromClientMessage,
} from "@/lib/pipeline";
import {
  createDefaultClientEducation,
  PROJECT_PROCESS_STEPS,
} from "@/lib/briefGuidanceTemplates";

import ClientEducationSection from "@/components/ClientEducationSection";
import { ShareBriefDialog } from "@/components/ShareBriefDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const questionTypeIcons = {
  text: Type,
  long: FileText,
  select: List,
  file: Upload,
  image: Image,
  link: Link,
  video: Video,
};

const questionTypeLabels = {
  text: "Short Answer",
  long: "Long Answer",
  select: "Multiple Choice",
  file: "File Upload",
  image: "Image Upload",
  link: "URL / Link",
  video: "Video Link",
};

const questionTypeColors = {
  text: "bg-blue-100 text-blue-700 border-blue-200",
  long: "bg-indigo-100 text-indigo-700 border-indigo-200",
  select: "bg-purple-100 text-purple-700 border-purple-200",
  file: "bg-orange-100 text-orange-700 border-orange-200",
  image: "bg-pink-100 text-pink-700 border-pink-200",
  link: "bg-teal-100 text-teal-700 border-teal-200",
  video: "bg-red-100 text-red-700 border-red-200",
};

const statusStyles = {
  draft: "border-yellow-500 text-yellow-400",
  sent: "border-blue-500 text-blue-400",
  approved: "border-green-500 text-green-400",
  completed: "border-emerald-500 text-emerald-400",
};

const approvalStyles = {
  draft: "border-white/20 text-white/60",
  sent: "border-blue-500 text-blue-400",
  approved: "border-green-500 text-green-400",
  changes_requested: "border-amber-500 text-amber-400",
};

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function toLines(value) {
  if (Array.isArray(value)) return value.join("\n");
  return value || "";
}

function fromLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildQuestionsFromNiche(niche) {
  return (niche?.questions || []).map((text) => ({
    id: makeId(),
    text,
    type:
      text.toLowerCase().includes("upload") ||
      text.toLowerCase().includes("file")
        ? "file"
        : text.toLowerCase().includes("website") ||
            text.toLowerCase().includes("link") ||
            text.toLowerCase().includes("url")
          ? "link"
          : "long",
    required: false,
  }));
}

function buildQuestion(text, type = "long") {
  return {
    id: makeId(),
    text,
    type,
    required: false,
    options: type === "select" ? ["Option 1", "Option 2"] : undefined,
  };
}

function getMeta(answers) {
  return answers?.__v1 || {};
}

function mergeEducation(education, selectedNiche) {
  return {
    ...createDefaultClientEducation(selectedNiche || "Default"),
    ...(education || {}),
  };
}

export default function BriefEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { isStarter } = usePlanLimits();
  const { toast } = useToast();

  const editing = id && id !== "new";

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

  const [selectedNiche, setSelectedNiche] = useState("Custom");
  const [includedWork, setIncludedWork] = useState("");
  const [excludedWork, setExcludedWork] = useState("");
  const [revisionLimit, setRevisionLimit] = useState(2);
  const [revisionsUsed, setRevisionsUsed] = useState(0);
  const [advanceRequired, setAdvanceRequired] = useState(true);
  const [advanceType, setAdvanceType] = useState("percent");
  const [advanceValue, setAdvanceValue] = useState("50");
  const [approvalStatus, setApprovalStatus] = useState("draft");
  const [scopeApprovedAt, setScopeApprovedAt] = useState("");
  const [clientEducation, setClientEducation] = useState(
    createDefaultClientEducation("Custom")
  );

  const [rawClientMessage, setRawClientMessage] = useState("");
  const [cleanedMessage, setCleanedMessage] = useState("");

  const [briefData, setBriefData] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);

  useEffect(() => {
    if (editing && user?.id) loadBrief();
  }, [editing, id, user?.id]);

  const allowedNiches = useMemo(() => {
    if (!isStarter || !user?.chosenNiches) return NICHES;
    return NICHES.filter((niche) => user.chosenNiches.includes(niche.name));
  }, [isStarter, user?.chosenNiches]);

  const educationText = useMemo(
    () => ({
      imageUrls: toLines(clientEducation.imageUrls),
      documentUrls: toLines(clientEducation.documentUrls),
      checklist: toLines(clientEducation.checklist),
      tips: toLines(clientEducation.tips),
    }),
    [clientEducation]
  );

  const loadBrief = async () => {
    setLoadingBrief(true);

    try {
      const { data, error } = await supabase
        .from("briefs")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        toast({
          title: "Brief not found",
          variant: "destructive",
        });
        navigate("/briefs");
        return;
      }

      const meta = getMeta(data.answers);

      setClientName(data.client_name || "");
      setClientEmail(data.client_email || "");
      setClientPhone(data.client_phone || "");
      setProjectTitle(data.title || "");
      setDescription(data.description || "");
      setBudget(data.budget || "");
      setTimeline(data.timeline || "");
      setStatus(data.status || "draft");
      setQuestions(data.questions || []);
      setAnswers(data.answers || {});
      setConfirmed(data.confirmed || false);
      setBriefData(data);

      setSelectedNiche(meta.selectedNiche || "Custom");
      setIncludedWork(toLines(meta.includedWork));
      setExcludedWork(toLines(meta.excludedWork));
      setRevisionLimit(meta.revisionLimit ?? 2);
      setRevisionsUsed(meta.revisionsUsed ?? 0);
      setAdvanceRequired(meta.advanceRequired ?? true);
      setAdvanceType(meta.advanceType || "percent");
      setAdvanceValue(meta.advanceValue ?? "50");
      setApprovalStatus(meta.approvalStatus || "draft");
      setScopeApprovedAt(meta.scopeApprovedAt || "");
      setClientEducation(
        mergeEducation(meta.clientEducation, meta.selectedNiche || "Custom")
      );
    } catch (err) {
      toast({
        title: "Error loading brief",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleSave = async () => {
    if (!projectTitle.trim()) {
      toast({
        title: "Project title is required",
        variant: "destructive",
      });
      return;
    }

    if (!clientName.trim()) {
      toast({
        title: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    if (!confirmed) {
      toast({
        title: "Please confirm the information is accurate",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const finalAnswers = {
      ...answers,
      __v1: {
        selectedNiche,
        includedWork: fromLines(includedWork),
        excludedWork: fromLines(excludedWork),
        revisionLimit: Number(revisionLimit) || 0,
        revisionsUsed: Number(revisionsUsed) || 0,
        advanceRequired,
        advanceType,
        advanceValue,
        approvalStatus,
        scopeApprovedAt:
          approvalStatus === "approved"
            ? scopeApprovedAt || new Date().toISOString()
            : scopeApprovedAt || "",
        clientEducation,
      },
    };

    const payload = {
      user_id: user.id,
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
      answers: finalAnswers,
      confirmed,
      currency,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editing) {
        const { error } = await supabase
          .from("briefs")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Brief updated successfully",
        });

        await loadBrief();
      } else {
        const { data: newBrief, error } = await supabase
          .from("briefs")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
            share_token: makeId(),
            share_enabled: true,
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Brief created successfully",
        });

        navigate(`/briefs/${newBrief.id}`);
      }
    } catch (err) {
      toast({
        title: "Error saving brief",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNicheSelect = (nicheName) => {
    const niche = NICHES.find((item) => item.name === nicheName);
    if (!niche) return;

    setSelectedNiche(niche.name);
    setQuestions(buildQuestionsFromNiche(niche));
    setClientEducation(createDefaultClientEducation(niche.name));

    if (!includedWork.trim()) {
      setIncludedWork(
        [
          `${niche.name} planning and setup`,
          "Work based on approved client brief",
          "Agreed deliverables mentioned in invoice/scope",
        ].join("\n")
      );
    }

    if (!excludedWork.trim()) {
      setExcludedWork(
        [
          "Extra work not mentioned in approved scope",
          "Unlimited revisions",
          "Third-party paid tools, plugins, stock assets, or ad spend",
        ].join("\n")
      );
    }

    toast({
      title: `${niche.name} template loaded`,
      description: `${niche.questions.length} questions added with client guidance.`,
    });
  };

  const handleAddQuestion = (type) => {
    setQuestions((prev) => [...prev, buildQuestion("", type)]);
    setAddQuestionDialogOpen(false);
  };

  const handleUpdateQuestion = (index, updates) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ...updates,
      };
      return updated;
    });
  };

  const handleDeleteQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAddOption = (index) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const current = updated[index];
      updated[index] = {
        ...current,
        options: [
          ...(current.options || []),
          `Option ${(current.options || []).length + 1}`,
        ],
      };
      return updated;
    });
  };

  const handleUpdateOption = (qIndex, optionIndex, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const options = [...(updated[qIndex].options || [])];
      options[optionIndex] = value;
      updated[qIndex] = {
        ...updated[qIndex],
        options,
      };
      return updated;
    });
  };

  const handleDeleteOption = (qIndex, optionIndex) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = {
        ...updated[qIndex],
        options: (updated[qIndex].options || []).filter(
          (_, index) => index !== optionIndex
        ),
      };
      return updated;
    });
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleCleanMessage = () => {
    const cleaned = cleanClientMessage(rawClientMessage);
    setCleanedMessage(cleaned);
    toast({
      title: "Client message cleaned",
    });
  };

  const handleGenerateBrief = () => {
    const generated = createBriefFromClientMessage(
      cleanedMessage || rawClientMessage
    );

    setProjectTitle(generated.title || projectTitle || "New Client Brief");
    setDescription(generated.summary || description);

    const generatedQuestions = (generated.questions || []).map((question) =>
      buildQuestion(question, "long")
    );

    setQuestions((prev) => [...prev, ...generatedQuestions]);

    toast({
      title: "AI-style brief generated",
      description: "Project summary and useful questions were added.",
    });
  };

  const handleApproveScope = () => {
    const approvedAt = new Date().toISOString();
    setApprovalStatus("approved");
    setScopeApprovedAt(approvedAt);
    setStatus("approved");

    toast({
      title: "Scope marked as approved",
    });
  };

  const updateEducation = (patch) => {
    setClientEducation((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    const addText = (text, size = 11, gap = 7) => {
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(String(text || ""), 170);
      if (y + lines.length * 6 > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, 20, y);
      y += lines.length * 6 + gap;
    };

    addText(projectTitle || "Project Brief", 20, 8);
    addText(`Client: ${clientName}`);
    addText(`Email: ${clientEmail || "Not added"}`);
    addText(`Phone: ${clientPhone || "Not added"}`);
    addText(`Budget: ${budget || "Not mentioned"}`);
    addText(`Timeline: ${timeline || "Not mentioned"}`);
    addText(`Status: ${status}`);

    addText("Project Description", 14, 4);
    addText(description || "No description provided.");

    addText("Scope Protection", 14, 4);
    addText(`Included work:\n${includedWork || "Not added"}`);
    addText(`Excluded work:\n${excludedWork || "Not added"}`);
    addText(`Revision limit: ${revisionLimit || 0}`);
    addText(`Revisions used: ${revisionsUsed || 0}`);
    addText(
      `Advance payment: ${
        advanceRequired
          ? `${advanceValue}${advanceType === "percent" ? "%" : ` ${currency}`}`
          : "Not required"
      }`
    );
    addText(`Scope approval: ${approvalStatus}`);

    addText("Client Questions", 14, 4);
    questions.forEach((question, index) => {
      addText(
        `${index + 1}. [${questionTypeLabels[question.type] || question.type}] ${
          question.text || "Untitled question"
        }`,
        11,
        3
      );

      if (answers[question.id]) {
        addText(`Answer: ${answers[question.id]}`, 10, 4);
      }
    });

    doc.save(`${projectTitle || "brief"}_gigvorx.pdf`);

    toast({
      title: "PDF downloaded",
    });
  };

  const handleShareWhatsApp = () => {
    if (!editing) {
      toast({
        title: "Please save the brief first before sharing",
        variant: "destructive",
      });
      return;
    }

    if (!briefData?.share_token) {
      toast({
        title: "Please enable sharing from the Share button first",
        variant: "destructive",
      });
      return;
    }

    const intakeLink = `${window.location.origin}/#/intake/${briefData.share_token}`;

    const text = `Hi ${clientName},

I have prepared a project brief for ${projectTitle}.

Please fill in your details using this link:
${intakeLink}

This will help me confirm scope, files, timeline, revisions, payment steps, and next actions clearly.

Thank you.`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loadingBrief) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 text-white">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
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

            <div>
              <h1 className="text-xl font-bold text-white">
                {editing ? "Edit Brief" : "New Brief"}
              </h1>
              <p className="text-xs text-white/40">
                Protect scope, revisions, payment, and client expectations.
              </p>
            </div>

            <Badge
              variant="outline"
              className={statusStyles[status] || statusStyles.draft}
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

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 border border-white/10 bg-white/5 p-1">
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
              value="scope"
              className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white"
            >
              Scope
            </TabsTrigger>
            <TabsTrigger
              value="guide"
              className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white"
            >
              Client Guide
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white"
            >
              AI Cleaner
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
                  <DarkField
                    label="Project Title *"
                    value={projectTitle}
                    onChange={setProjectTitle}
                    placeholder="e.g. E-commerce Website Redesign"
                  />

                  <div className="space-y-2">
                    <Label className="text-white/80">Status</Label>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className="h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 p-4">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
                    <User className="h-4 w-4 text-[#FF6B00]" />
                    Client Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <DarkField
                      label="Client Name *"
                      value={clientName}
                      onChange={setClientName}
                      placeholder="Client name"
                    />

                    <DarkField
                      label="Client Email"
                      value={clientEmail}
                      onChange={setClientEmail}
                      placeholder="client@example.com"
                      icon={<Mail className="h-3 w-3" />}
                    />

                    <DarkField
                      label="Client Phone"
                      value={clientPhone}
                      onChange={setClientPhone}
                      placeholder="+91 98765 43210"
                      icon={<Phone className="h-3 w-3" />}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Project Description</Label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe project goals, scope, and important requirements..."
                    rows={5}
                    className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DarkField
                    label={`Budget (${currency})`}
                    value={budget}
                    onChange={setBudget}
                    placeholder={`e.g. 50,000 ${currency}`}
                  />

                  <DarkField
                    label="Timeline"
                    value={timeline}
                    onChange={setTimeline}
                    placeholder="e.g. 2 weeks"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111]">
              <CardContent className="pt-6">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="h-4 w-4 accent-[#FF6B00]"
                  />
                  <span className="text-sm text-white/70">
                    I confirm all the information provided is accurate and
                    complete.
                  </span>
                </label>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Client Questions
                </h2>
                <p className="text-sm text-white/50">
                  Ask the right questions before starting work.
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
                    <DialogTitle className="text-white">
                      Choose Question Type
                    </DialogTitle>
                  </DialogHeader>

                  <div className="mt-4 grid gap-2">
                    {Object.entries(questionTypeLabels).map(([type, label]) => {
                      const Icon = questionTypeIcons[type];

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleAddQuestion(type)}
                          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-[#FF6B00]/50 hover:bg-white/10"
                        >
                          <div className={`rounded-lg p-2 ${questionTypeColors[type]}`}>
                            <Icon className="h-4 w-4" />
                          </div>

                          <div>
                            <div className="text-sm font-medium text-white">
                              {label}
                            </div>
                            <div className="text-xs text-white/40">
                              Add {label.toLowerCase()} question
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {questions.length === 0 ? (
              <EmptyBox text='No questions yet. Click "Add Question" or load a template.' />
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => {
                  const Icon = questionTypeIcons[question.type] || Type;

                  return (
                    <Card
                      key={question.id}
                      className="border-white/10 bg-[#111]"
                    >
                      <CardContent className="space-y-3 pt-5">
                        <div className="flex items-start gap-3">
                          <span className="mt-2 font-mono text-sm text-white/30">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={`text-xs ${
                                  questionTypeColors[question.type] ||
                                  questionTypeColors.text
                                }`}
                              >
                                <Icon className="mr-1 h-3 w-3" />
                                {questionTypeLabels[question.type] ||
                                  question.type}
                              </Badge>

                              <select
                                value={question.type}
                                onChange={(event) =>
                                  handleUpdateQuestion(index, {
                                    type: event.target.value,
                                    options:
                                      event.target.value === "select"
                                        ? question.options || [
                                            "Option 1",
                                            "Option 2",
                                          ]
                                        : undefined,
                                  })
                                }
                                className="rounded-md border border-white/10 bg-[#1a1a1a] px-2 py-1 text-xs text-white"
                              >
                                {Object.entries(questionTypeLabels).map(
                                  ([type, label]) => (
                                    <option key={type} value={type}>
                                      {label}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <Input
                              value={question.text}
                              onChange={(event) =>
                                handleUpdateQuestion(index, {
                                  text: event.target.value,
                                })
                              }
                              placeholder="Enter your question..."
                              className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                            />

                            {question.type === "select" && (
                              <div className="space-y-2">
                                <Label className="text-xs text-white/60">
                                  Options
                                </Label>

                                {(question.options || []).map(
                                  (option, optionIndex) => (
                                    <div
                                      key={optionIndex}
                                      className="flex items-center gap-2"
                                    >
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
                                        size="icon"
                                        onClick={() =>
                                          handleDeleteOption(index, optionIndex)
                                        }
                                        className="text-red-400 hover:bg-red-500/10"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )
                                )}

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddOption(index)}
                                  className="text-[#FF6B00] hover:bg-[#FF6B00]/10"
                                >
                                  <Plus className="mr-1 h-3.5 w-3.5" />
                                  Add Option
                                </Button>
                              </div>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteQuestion(index)}
                            className="text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scope" className="space-y-6">
            <Card className="border-white/10 bg-[#111]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-5 w-5 text-[#FF6B00]" />
                  Scope Protection
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ScopeTextarea
                    label="Included Work"
                    value={includedWork}
                    onChange={setIncludedWork}
                    placeholder="Add one included deliverable per line"
                  />

                  <ScopeTextarea
                    label="Excluded Work"
                    value={excludedWork}
                    onChange={setExcludedWork}
                    placeholder="Add one excluded item per line"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <DarkField
                    label="Revision Limit"
                    value={revisionLimit}
                    onChange={setRevisionLimit}
                    placeholder="2"
                    type="number"
                  />

                  <DarkField
                    label="Revisions Used"
                    value={revisionsUsed}
                    onChange={setRevisionsUsed}
                    placeholder="0"
                    type="number"
                  />

                  <div className="space-y-2">
                    <Label className="text-white/80">Advance Required</Label>
                    <select
                      value={advanceRequired ? "yes" : "no"}
                      onChange={(event) =>
                        setAdvanceRequired(event.target.value === "yes")
                      }
                      className="h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Advance Type</Label>
                    <select
                      value={advanceType}
                      onChange={(event) => setAdvanceType(event.target.value)}
                      className="h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white"
                    >
                      <option value="percent">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                </div>

                <DarkField
                  label={
                    advanceType === "percent"
                      ? "Advance Percentage"
                      : `Advance Amount (${currency})`
                  }
                  value={advanceValue}
                  onChange={setAdvanceValue}
                  placeholder={advanceType === "percent" ? "50" : "10000"}
                />

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Scope Approval
                      </p>
                      <p className="text-xs text-white/50">
                        Mark the scope as approved after the client confirms the
                        included work, excluded work, revisions, and payment
                        terms.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          approvalStyles[approvalStatus] ||
                          approvalStyles.draft
                        }
                      >
                        {approvalStatus.replaceAll("_", " ")}
                      </Badge>

                      <Button
                        type="button"
                        onClick={handleApproveScope}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Approve Scope
                      </Button>
                    </div>
                  </div>

                  {scopeApprovedAt && (
                    <p className="mt-3 text-xs text-white/40">
                      Approved at: {new Date(scopeApprovedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            <Card className="border-white/10 bg-[#111]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="h-5 w-5 text-[#FF6B00]" />
                  Client Education / Guidance Section
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={clientEducation.enabled}
                    onChange={(event) =>
                      updateEducation({
                        enabled: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[#FF6B00]"
                  />
                  Show this education section on public intake form
                </label>

                <DarkField
                  label="Guide Title"
                  value={clientEducation.title}
                  onChange={(value) => updateEducation({ title: value })}
                  placeholder="Before we start"
                />

                <div className="space-y-2">
                  <Label className="text-white/80">Intro Text</Label>
                  <Textarea
                    value={clientEducation.intro}
                    onChange={(event) =>
                      updateEducation({
                        intro: event.target.value,
                      })
                    }
                    rows={3}
                    className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DarkField
                    label="Instruction Video URL"
                    value={clientEducation.videoUrl}
                    onChange={(value) => updateEducation({ videoUrl: value })}
                    placeholder="https://youtube.com/..."
                  />

                  <DarkField
                    label="Audio Guidance URL"
                    value={clientEducation.audioUrl}
                    onChange={(value) => updateEducation({ audioUrl: value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ScopeTextarea
                    label="Image / Screenshot URLs"
                    value={educationText.imageUrls}
                    onChange={(value) =>
                      updateEducation({
                        imageUrls: fromLines(value),
                      })
                    }
                    placeholder="Add one image URL per line"
                  />

                  <ScopeTextarea
                    label="Document / PDF URLs"
                    value={educationText.documentUrls}
                    onChange={(value) =>
                      updateEducation({
                        documentUrls: fromLines(value),
                      })
                    }
                    placeholder="Add one PDF/document URL per line"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ScopeTextarea
                    label="Client Preparation Checklist"
                    value={educationText.checklist}
                    onChange={(value) =>
                      updateEducation({
                        checklist: fromLines(value),
                      })
                    }
                    placeholder="Logo&#10;Brand colors&#10;Reference links"
                  />

                  <ScopeTextarea
                    label="Tips for Client"
                    value={educationText.tips}
                    onChange={(value) =>
                      updateEducation({
                        tips: fromLines(value),
                      })
                    }
                    placeholder="Give clear references&#10;Upload all files together"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="mb-3 text-sm font-semibold text-white">
                    Default Project Process
                  </p>

                  <div className="grid gap-2 md:grid-cols-2">
                    {PROJECT_PROCESS_STEPS.map((step, index) => (
                      <div
                        key={step.title}
                        className="rounded-lg border border-white/10 bg-[#1a1a1a] p-3"
                      >
                        <p className="text-sm font-semibold text-white">
                          {index + 1}. {step.title}
                        </p>
                        <p className="mt-1 text-xs text-white/50">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white p-4 text-black">
                  <ClientEducationSection education={clientEducation} compact />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card className="border-white/10 bg-[#111]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="h-5 w-5 text-[#FF6B00]" />
                  AI Client Message Cleaner / Brief Generator
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/80">
                    Paste messy client message
                  </Label>
                  <Textarea
                    value={rawClientMessage}
                    onChange={(event) => setRawClientMessage(event.target.value)}
                    placeholder="Paste WhatsApp/email/client message here..."
                    rows={7}
                    className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleCleanMessage}
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Clean Message
                  </Button>

                  <Button
                    type="button"
                    onClick={handleGenerateBrief}
                    className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
                  >
                    <FileText className="mr-1.5 h-4 w-4" />
                    Generate Brief
                  </Button>
                </div>

                {cleanedMessage && (
                  <div className="space-y-2">
                    <Label className="text-white/80">Cleaned Message</Label>
                    <Textarea
                      value={cleanedMessage}
                      onChange={(event) =>
                        setCleanedMessage(event.target.value)
                      }
                      rows={6}
                      className="resize-none border-white/10 bg-[#1a1a1a] text-white"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fill" className="space-y-6">
            <div className="rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 p-4">
              <p className="text-sm font-medium text-[#FF6B00]">
                Freelancer Fill Mode
              </p>
              <p className="mt-1 text-xs text-white/60">
                Fill client answers during a call. These answers are saved with
                the brief and included in PDF.
              </p>
            </div>

            {questions.length === 0 ? (
              <EmptyBox text="No questions yet. Add questions first." />
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <Card
                    key={question.id}
                    className="border-white/10 bg-[#111]"
                  >
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-sm font-bold text-[#FF6B00]">
                          {index + 1}.
                        </span>
                        <p className="font-medium text-white">
                          {question.text || "Untitled Question"}
                        </p>
                      </div>

                      <div className="pl-5">
                        {question.type === "long" ? (
                          <Textarea
                            value={answers[question.id] || ""}
                            onChange={(event) =>
                              handleAnswerChange(question.id, event.target.value)
                            }
                            placeholder="Type detailed answer..."
                            rows={3}
                            className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30"
                          />
                        ) : question.type === "select" ? (
                          <div className="space-y-2">
                            {(question.options || []).map((option) => (
                              <label
                                key={option}
                                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] p-3"
                              >
                                <input
                                  type="radio"
                                  name={`answer-${question.id}`}
                                  value={option}
                                  checked={answers[question.id] === option}
                                  onChange={(event) =>
                                    handleAnswerChange(
                                      question.id,
                                      event.target.value
                                    )
                                  }
                                  className="accent-[#FF6B00]"
                                />
                                <span className="text-sm text-white">
                                  {option}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <Input
                            value={answers[question.id] || ""}
                            onChange={(event) =>
                              handleAnswerChange(question.id, event.target.value)
                            }
                            placeholder="Type answer..."
                            className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

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
            {isStarter && user?.chosenNiches && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                Starter plan: you can use your selected niches. Upgrade for all
                templates.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allowedNiches.map((niche) => (
                <button
                  key={niche.slug}
                  type="button"
                  onClick={() => handleNicheSelect(niche.name)}
                  className="group rounded-xl border border-white/10 bg-[#111] p-4 text-left transition-all hover:border-[#FF6B00]/50 hover:bg-[#161616]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium text-white transition-colors group-hover:text-[#FF6B00]">
                      {niche.name}
                    </h3>

                    <Badge
                      variant="outline"
                      className="border-white/10 text-xs text-white/50"
                    >
                      {niche.questions.length} Qs
                    </Badge>
                  </div>

                  <p className="text-xs text-white/40">
                    {niche.questions.slice(0, 3).join(" • ").slice(0, 120)}...
                  </p>
                </button>
              ))}
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

function DarkField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon = null,
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1 text-white/80">
        {icon}
        {label}
      </Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
      />
    </div>
  );
}

function ScopeTextarea({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-2">
      <Label className="text-white/80">{label}</Label>
      <Textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={6}
        className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
      />
      <p className="text-xs text-white/30">Add one item per line.</p>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
      <p className="text-sm text-white/40">{text}</p>
    </div>
  );
}
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { readGlobal } from "@/lib/storage";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";

function formatDate(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function normalizeAnswers(value) {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return value;
}

function getMeta(brief) {
  return brief?.answers?.__v1 || {};
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function AnswerDisplay({ question, answer }) {
  if (!answer) {
    return <p className="text-sm italic text-white/20">No answer provided</p>;
  }

  if (Array.isArray(answer)) {
    return (
      <div className="space-y-1">
        {answer.map((file, index) => (
          <button
            key={`${file?.url || file?.name || index}`}
            type="button"
            onClick={() =>
              file?.url && window.open(file.url, "_blank", "noopener,noreferrer")
            }
            className="block text-left text-sm text-[#FF6B00] underline"
          >
            📎 {file?.name || `Attachment ${index + 1}`}
          </button>
        ))}
      </div>
    );
  }

  if (typeof answer === "string") {
    try {
      const parsed = JSON.parse(answer);

      if (Array.isArray(parsed)) {
        return <AnswerDisplay question={question} answer={parsed} />;
      }
    } catch {
      // Plain text answer.
    }
  }

  if (question.type === "link" || question.type === "video") {
    return (
      <button
        type="button"
        onClick={() =>
          window.open(String(answer), "_blank", "noopener,noreferrer")
        }
        className="w-full break-all text-left text-sm text-[#FF6B00] underline"
      >
        {String(answer)}
      </button>
    );
  }

  return <p className="whitespace-pre-wrap text-sm text-white">{String(answer)}</p>;
}

function ScopeReviewCard({ meta }) {
  const includedWork = ensureArray(meta.includedWork);
  const excludedWork = ensureArray(meta.excludedWork);
  const revisionLimit = meta.revisionLimit ?? 0;
  const revisionsUsed = meta.revisionsUsed ?? 0;
  const advanceRequired = meta.advanceRequired;
  const advanceType = meta.advanceType || "percent";
  const advanceValue = meta.advanceValue || "";
  const approved = meta.approvalStatus === "approved";

  const hasScope =
    includedWork.length > 0 ||
    excludedWork.length > 0 ||
    revisionLimit ||
    advanceRequired ||
    approved;

  if (!hasScope) return null;

  return (
    <Card className="border-white/10 bg-[#111]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Scope, revisions, and payment
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {includedWork.length > 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="mb-2 text-sm font-semibold text-emerald-300">
                Included work
              </p>
              <ul className="space-y-1 text-xs text-emerald-50/80">
                {includedWork.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {excludedWork.length > 0 ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
              <p className="mb-2 text-sm font-semibold text-rose-300">
                Not included
              </p>
              <ul className="space-y-1 text-xs text-rose-50/80">
                {excludedWork.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/40">Revisions</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {revisionsUsed} / {revisionLimit} used
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="flex items-center gap-1 text-xs text-white/40">
              <CreditCard className="h-3 w-3" />
              Advance
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {advanceRequired
                ? `${advanceValue}${advanceType === "percent" ? "%" : ""} required`
                : "Not required"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/40">Approval</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-white">
              {approved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Approved
                </>
              ) : (
                "Not approved"
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BriefResponses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [brief, setBrief] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user?.id || !id) return;

    setLoading(true);

    try {
      let briefData = null;
      let responsesData = [];

      if (isSupabaseEnabled && supabase) {
        const briefResult = await supabase
          .from("briefs")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (briefResult.error || !briefResult.data) {
          toast.error("Brief not found.");
          navigate("/briefs");
          return;
        }

        briefData = briefResult.data;

        const responseResult = await supabase
          .from("brief_responses")
          .select("*")
          .eq("brief_id", id)
          .order("created_at", { ascending: false });

        if (responseResult.error) throw responseResult.error;

        responsesData = responseResult.data || [];
      } else {
        briefData = readGlobal("briefs", []).find(
          (item) =>
            item.id === id && (item.user_id === user.id || item.userId === user.id)
        );

        if (!briefData) {
          toast.error("Brief not found.");
          navigate("/briefs");
          return;
        }

        responsesData = readGlobal("brief_responses", [])
          .filter((response) => response.brief_id === id || response.briefId === id)
          .sort(
            (a, b) =>
              new Date(b.created_at || b.createdAt) -
              new Date(a.created_at || a.createdAt)
          );
      }

      const normalizedBrief = {
        ...briefData,
        questions: normalizeQuestions(briefData.questions),
        answers: normalizeAnswers(briefData.answers),
      };

      const normalizedResponses = responsesData.map((response) => ({
        ...response,
        answers: normalizeAnswers(response.answers),
      }));

      setBrief(normalizedBrief);
      setResponses(normalizedResponses);
      setSelectedResponse(normalizedResponses[0] || null);
    } catch (err) {
      console.error("Failed to load responses:", err);
      toast.error("Failed to load responses.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleShareWhatsApp = (response) => {
    const meta = getMeta(brief);
    const approved = meta.approvalStatus === "approved";

    const text = `Hi ${response.client_name || "there"},

Thank you for filling out the project brief for ${brief?.title || "your project"}.

I have reviewed your details. ${
      approved
        ? "The scope is approved, so the next step is advance/payment confirmation and project start."
        : "Next, I will confirm the scope, included work, revision limit, and payment steps with you."
    }

- GigVorx`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const answerToPdfText = (answer) => {
    if (!answer) return "No answer provided";

    if (Array.isArray(answer)) {
      return answer.map((file) => file?.url || file?.name || "Attachment").join(", ");
    }

    if (typeof answer === "object") {
      return JSON.stringify(answer);
    }

    return String(answer);
  };

  const handleDownloadPDF = (response) => {
    const doc = new jsPDF();
    const meta = getMeta(brief);

    doc.setFontSize(20);
    doc.text(brief?.title || "Project Brief Response", 20, 20);

    doc.setFontSize(12);
    doc.text(`Client: ${response.client_name || ""}`, 20, 35);
    doc.text(`Email: ${response.client_email || ""}`, 20, 42);
    doc.text(`Phone: ${response.client_phone || ""}`, 20, 49);
    doc.text(`Submitted: ${formatDate(response.created_at || response.createdAt)}`, 20, 56);

    let y = 70;

    const addLine = (text) => {
      const lines = doc.splitTextToSize(text, 170);
      if (y + lines.length * 5 > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, 20, y);
      y += lines.length * 5 + 3;
    };

    doc.setFontSize(14);
    doc.text("Scope Summary:", 20, y);
    y += 8;

    doc.setFontSize(11);
    ensureArray(meta.includedWork).forEach((item) => addLine(`Included: ${item}`));
    ensureArray(meta.excludedWork).forEach((item) => addLine(`Excluded: ${item}`));
    addLine(`Revision limit: ${meta.revisionLimit ?? 0}`);
    addLine(
      `Advance: ${
        meta.advanceRequired
          ? `${meta.advanceValue || ""}${meta.advanceType === "percent" ? "%" : ""} required`
          : "Not required"
      }`
    );
    addLine(`Approval: ${meta.approvalStatus === "approved" ? "Approved" : "Not approved"}`);

    y += 5;
    doc.setFontSize(14);
    doc.text("Responses:", 20, y);
    y += 8;

    doc.setFontSize(11);

    const questions = normalizeQuestions(brief?.questions);
    const answers = normalizeAnswers(response.answers);

    questions.forEach((question, index) => {
      const answer = answerToPdfText(answers[question.id]);
      addLine(`${index + 1}. ${question.text || "Untitled question"}`);
      addLine(`Answer: ${answer}`);
      y += 2;
    });

    doc.save(
      `${brief?.title || "brief"}_response_${response.client_name || "client"}.pdf`
    );

    toast.success("PDF downloaded.");
  };

  const copyIntakeLink = async () => {
    if (!brief?.share_token) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/#/intake/${brief.share_token}`
      );
      toast.success("Link copied!");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  const meta = getMeta(brief);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 text-white">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/briefs/${id}`)}
              className="text-white/60 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>

            <div>
              <h1 className="text-lg font-bold text-white">
                {brief?.title || "Brief"}
              </h1>
              <p className="text-xs text-white/40">
                {responses.length} response{responses.length !== 1 ? "s" : ""} received
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/briefs/${id}`)}
            className="border-white/10 text-white hover:bg-white/5"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Edit Brief
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {responses.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Clock className="h-8 w-8 text-white/30" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-white">
              No responses yet
            </h2>

            <p className="mb-6 text-white/50">
              Share the intake form link with your client and responses will appear
              here.
            </p>

            {brief?.share_token ? (
              <div className="mx-auto max-w-md space-y-3 rounded-xl border border-white/10 bg-[#111] p-4 text-left">
                <p className="text-sm font-medium text-white/60">Intake form link:</p>

                <code className="break-all text-xs text-[#FF6B00]">
                  {window.location.origin}/#/intake/{brief.share_token}
                </code>

                <Button
                  type="button"
                  className="w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
                  onClick={copyIntakeLink}
                >
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy Link
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-3">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">
                Submissions ({responses.length})
              </h2>

              {responses.map((response) => (
                <button
                  key={response.id}
                  type="button"
                  onClick={() => setSelectedResponse(response)}
                  className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-all ${
                    selectedResponse?.id === response.id
                      ? "border-[#FF6B00] bg-[#FF6B00]/10"
                      : "border-white/10 bg-[#111] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6B00]/20">
                      <User className="h-4 w-4 text-[#FF6B00]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {response.client_name || "Unknown"}
                      </p>
                      <p className="truncate text-xs text-white/40">
                        {response.client_email || ""}
                      </p>
                    </div>

                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
                  </div>

                  <p className="mt-2 text-xs text-white/30">
                    {formatDate(response.created_at || response.createdAt)}
                  </p>
                </button>
              ))}
            </div>

            {selectedResponse ? (
              <div className="space-y-4 lg:col-span-2">
                <ScopeReviewCard meta={meta} />

                <Card className="border-white/10 bg-[#111]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base text-white">
                        <User className="h-4 w-4 text-[#FF6B00]" />
                        Client Details
                      </CardTitle>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(selectedResponse)}
                          className="h-7 border-white/10 text-xs text-white hover:bg-white/5"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          PDF
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleShareWhatsApp(selectedResponse)}
                          className="h-7 border-white/10 text-xs text-white hover:bg-white/5"
                        >
                          <MessageCircle className="mr-1 h-3 w-3" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-white/30" />
                        <div>
                          <p className="text-xs text-white/40">Name</p>
                          <p className="text-sm font-medium text-white">
                            {selectedResponse.client_name || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-white/30" />
                        <div>
                          <p className="text-xs text-white/40">Email</p>
                          <p className="text-sm font-medium text-white">
                            {selectedResponse.client_email || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-white/30" />
                        <div>
                          <p className="text-xs text-white/40">Phone</p>
                          <p className="text-sm font-medium text-white">
                            {selectedResponse.client_phone || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-white/10 pt-3">
                      <p className="text-xs text-white/30">
                        Submitted on{" "}
                        {formatDate(
                          selectedResponse.created_at || selectedResponse.createdAt
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Answers ({normalizeQuestions(brief?.questions).length} questions)
                  </h3>

                  {normalizeQuestions(brief?.questions).map((question, index) => {
                    const answer = normalizeAnswers(selectedResponse.answers)[question.id];

                    return (
                      <Card
                        key={question.id || index}
                        className="border-white/10 bg-[#111]"
                      >
                        <CardContent className="pb-4 pt-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex-shrink-0 text-sm font-bold text-[#FF6B00]">
                              {index + 1}.
                            </span>

                            <div className="flex-1">
                              <p className="mb-2 text-sm font-medium text-white/70">
                                {question.text || "Untitled question"}
                              </p>

                              <div className="rounded-lg border border-white/5 bg-[#1a1a1a] p-3">
                                <AnswerDisplay question={question} answer={answer} />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
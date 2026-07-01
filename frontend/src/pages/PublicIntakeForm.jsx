import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck,
  FileText,
  Image,
  Link,
  List,
  Loader2,
  Send,
  Type,
  Upload,
  Video,
  X,
} from "lucide-react";

import ClientEducationSection from "@/components/ClientEducationSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

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

function normalizeUrl(value) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function getMeta(brief) {
  return brief?.answers?.__v1 || {};
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ScopeSummary({ meta }) {
  const includedWork = ensureArray(meta.includedWork);
  const excludedWork = ensureArray(meta.excludedWork);
  const revisionLimit = meta.revisionLimit ?? 0;
  const advanceRequired = meta.advanceRequired;
  const advanceType = meta.advanceType || "percent";
  const advanceValue = meta.advanceValue || "";

  if (
    includedWork.length === 0 &&
    excludedWork.length === 0 &&
    !revisionLimit &&
    !advanceRequired
  ) {
    return null;
  }

  return (
    <Card className="border-white/10 bg-[#111]">
      <CardContent className="space-y-5 pt-6">
        <div>
          <h3 className="text-lg font-bold text-white">Project scope summary</h3>
          <p className="mt-1 text-sm text-white/50">
            Please review this before submitting your details. It helps avoid confusion
            later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {includedWork.length > 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <h4 className="mb-2 text-sm font-semibold text-emerald-300">
                Included work
              </h4>
              <ul className="space-y-1.5 text-sm text-emerald-50/80">
                {includedWork.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {excludedWork.length > 0 ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
              <h4 className="mb-2 text-sm font-semibold text-rose-300">
                Not included
              </h4>
              <ul className="space-y-1.5 text-sm text-rose-50/80">
                {excludedWork.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-white/40">
              Revision limit
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {revisionLimit || 0} revision round(s) included
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-white/40">
              Advance payment
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {advanceRequired
                ? `${advanceValue}${advanceType === "percent" ? "%" : ""} advance required before work starts`
                : "No advance required"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicIntakeForm() {
  const { shareToken } = useParams();

  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [filePreviews, setFilePreviews] = useState({});

  const fileInputRefs = useRef({});

  const meta = getMeta(brief);

  useEffect(() => {
    async function fetchBrief() {
      try {
        setLoading(true);
        setError("");

        const { data, error: fetchError } = await supabase
          .from("briefs")
          .select("*")
          .eq("share_token", shareToken)
          .eq("share_enabled", true)
          .single();

        if (fetchError || !data) {
          setError("This intake form link is invalid or has been disabled.");
          return;
        }

        const normalizedBrief = {
          ...data,
          questions: normalizeQuestions(data.questions),
          answers: data.answers || {},
        };

        setBrief(normalizedBrief);
        setClientName(data.client_name || data.clientName || "");
        setClientEmail(data.client_email || data.clientEmail || "");
        setClientPhone(data.client_phone || data.clientPhone || "");
      } catch (err) {
        console.error("Public intake load error:", err);
        setError("Something went wrong. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchBrief();
  }, [shareToken]);

  useEffect(() => {
    if (!brief) return;

    const total = brief.questions?.length || 0;
    if (total === 0) {
      setProgress(0);
      return;
    }

    let filled = 0;

    brief.questions.forEach((question) => {
      if (question.type === "file" || question.type === "image") {
        if (
          files[question.id]?.length > 0 ||
          filePreviews[question.id]?.length > 0
        ) {
          filled += 1;
        }
      } else if (String(answers[question.id] || "").trim()) {
        filled += 1;
      }
    });

    setProgress(Math.round((filled / total) * 100));
  }, [answers, files, filePreviews, brief]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleFileSelect = (questionId, event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setFiles((prev) => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ...selectedFiles],
    }));

    const previews = selectedFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    }));

    setFilePreviews((prev) => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ...previews],
    }));

    if (fileInputRefs.current[questionId]) {
      fileInputRefs.current[questionId].value = "";
    }
  };

  const handleRemoveFile = (questionId, fileIndex) => {
    setFiles((prev) => {
      const updated = [...(prev[questionId] || [])];
      updated.splice(fileIndex, 1);
      return { ...prev, [questionId]: updated };
    });

    setFilePreviews((prev) => {
      const updated = [...(prev[questionId] || [])];
      if (updated[fileIndex]?.url) URL.revokeObjectURL(updated[fileIndex].url);
      updated.splice(fileIndex, 1);
      return { ...prev, [questionId]: updated };
    });
  };

  const uploadFilesToSupabase = async (questionId, fileList) => {
    if (!fileList?.length) return [];

    setUploading((prev) => ({ ...prev, [questionId]: true }));

    const uploaded = [];

    for (const file of fileList) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${shareToken}/${questionId}/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("gigvorx-attachments")
          .upload(fileName, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("gigvorx-attachments")
          .getPublicUrl(fileName);

        uploaded.push({
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
        });
      } catch (err) {
        console.error("Upload error:", err);
        uploaded.push({
          name: file.name,
          url: "",
          type: file.type,
          uploadError: true,
        });
      }
    }

    setUploading((prev) => ({ ...prev, [questionId]: false }));
    return uploaded;
  };

  const handleSubmit = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      alert("Please enter your name and email.");
      return;
    }

    setSubmitting(true);

    try {
      const fileAnswers = {};

      for (const question of brief.questions || []) {
        if (
          (question.type === "file" || question.type === "image") &&
          files[question.id]?.length > 0
        ) {
          const uploaded = await uploadFilesToSupabase(
            question.id,
            files[question.id]
          );
          fileAnswers[question.id] = uploaded;
        }
      }

      const finalAnswers = { ...answers };

      Object.entries(fileAnswers).forEach(([questionId, uploads]) => {
        finalAnswers[questionId] = JSON.stringify(uploads);
      });

      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("email", clientEmail.trim())
        .eq("user_id", brief.user_id)
        .maybeSingle();

      let clientId = existingClient?.id;

      if (!clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: clientName.trim(),
            email: clientEmail.trim(),
            phone: clientPhone.trim() || null,
            user_id: brief.user_id,
            source: "public_intake",
            status: "new_lead",
            is_lead: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient?.id;
      }

      const { error: responseError } = await supabase
        .from("brief_responses")
        .insert({
          brief_id: brief.id,
          client_id: clientId,
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          client_phone: clientPhone.trim() || null,
          answers: finalAnswers,
          share_token: shareToken,
          created_at: new Date().toISOString(),
        });

      if (responseError) throw responseError;

      await supabase
        .from("briefs")
        .update({
          status: "sent",
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          client_phone: clientPhone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brief.id);

      try {
        await supabase.from("analytics_events").insert({
          user_id: brief.user_id,
          event_name: "public_intake_submit",
          event_data: { brief_id: brief.id, share_token: shareToken },
          created_at: new Date().toISOString(),
        });
      } catch {
        // Analytics should not block intake submission.
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerFileInput = (questionId) => {
    fileInputRefs.current[questionId]?.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <Card className="max-w-md border-white/10 bg-[#111] text-center">
          <CardContent className="pt-6">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
            <h1 className="text-xl font-bold text-white">Link unavailable</h1>
            <p className="mt-2 text-sm text-white/50">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <Card className="max-w-md border-white/10 bg-[#111] text-center">
          <CardContent className="pt-6">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">Brief submitted</h1>
            <p className="mt-2 text-sm text-white/50">
              Thank you. Your details have been sent to the freelancer. They can now
              review your answers, confirm scope, and share next steps.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-10">
      <div className="border-b border-white/10 bg-[#111]">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Badge className="mb-3 bg-[#FF6B00] text-white">Client Intake</Badge>
          <h1 className="text-2xl font-bold text-white">
            {brief?.title || "Project Brief"}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Please read the guidance, prepare your files, and answer clearly. This
            helps the freelancer understand your project and avoid scope confusion.
          </p>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-white/40">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/10" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <ClientEducationSection education={meta.clientEducation} />

        <ScopeSummary meta={meta} />

        <Card className="border-white/10 bg-[#111]">
          <CardContent className="space-y-4 pt-6">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00] text-xs font-bold text-white">
                1
              </span>
              Your Contact Information
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-white/80">Full Name *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John Doe"
                  className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Email *</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-white/80">Phone (optional)</Label>
                <Input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00] text-xs font-bold text-white">
              2
            </span>
            Project Questions
          </h3>

          {(brief?.questions || []).map((question, index) => {
            const Icon = questionTypeIcons[question.type] || Type;
            const answer = answers[question.id] || "";
            const previews = filePreviews[question.id] || [];
            const isUploading = uploading[question.id];

            return (
              <Card key={question.id || index} className="border-white/10 bg-[#111]">
                <CardContent className="space-y-3 pb-5 pt-5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm font-bold text-[#FF6B00]">
                      {index + 1}.
                    </span>

                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-white/10 px-1.5 py-0 text-[10px] text-white/50"
                        >
                          <Icon className="mr-1 h-3 w-3" />
                          {questionTypeLabels[question.type] || question.type}
                        </Badge>
                      </div>

                      <p className="font-medium text-white">
                        {question.text || "Untitled Question"}
                      </p>
                    </div>
                  </div>

                  <div className="pl-5">
                    {question.type === "text" ? (
                      <Input
                        value={answer}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Type your answer..."
                        className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                      />
                    ) : null}

                    {question.type === "long" ? (
                      <Textarea
                        value={answer}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Type your detailed answer..."
                        rows={4}
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
                              name={`question-${question.id}`}
                              value={option}
                              checked={answer === option}
                              onChange={(e) =>
                                handleAnswerChange(question.id, e.target.value)
                              }
                              className="h-4 w-4 accent-[#FF6B00]"
                            />
                            <span className="text-sm text-white">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}

                    {(question.type === "link" || question.type === "video") ? (
                      <Input
                        type="url"
                        value={answer}
                        onChange={(e) =>
                          handleAnswerChange(question.id, normalizeUrl(e.target.value))
                        }
                        placeholder={
                          question.type === "video"
                            ? "https://youtube.com/..."
                            : "https://example.com"
                        }
                        className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                      />
                    ) : null}

                    {(question.type === "file" || question.type === "image") ? (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => triggerFileInput(question.id)}
                          className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 transition-all hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5"
                        >
                          {isUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-[#FF6B00]" />
                          ) : question.type === "image" ? (
                            <>
                              <Image className="h-5 w-5 text-white/30" />
                              <span className="text-sm text-white/30">
                                Click to upload images
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-5 w-5 text-white/30" />
                              <span className="text-sm text-white/30">
                                Click to upload files
                              </span>
                            </>
                          )}
                        </button>

                        <input
                          ref={(el) => {
                            fileInputRefs.current[question.id] = el;
                          }}
                          type="file"
                          multiple
                          accept={
                            question.type === "image"
                              ? "image/png,image/jpeg,image/jpg,image/gif,image/webp"
                              : ".pdf,.doc,.docx,.zip,.txt,.xls,.xlsx,.ppt,.pptx"
                          }
                          onChange={(e) => handleFileSelect(question.id, e)}
                          className="hidden"
                        />

                        {previews.length > 0 ? (
                          <div className="space-y-2">
                            {previews.map((file, fileIndex) => (
                              <div
                                key={`${file.name}-${fileIndex}`}
                                className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] p-2"
                              >
                                <FileCheck className="h-4 w-4 text-[#FF6B00]" />
                                <span className="flex-1 truncate text-sm text-white">
                                  {file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveFile(question.id, fileIndex)
                                  }
                                  className="p-1 text-white/30 hover:text-red-400"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="h-12 w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Submit Brief Details
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
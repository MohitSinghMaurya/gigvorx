import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ShieldCheck,
  Type,
  Upload,
  Video,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import ClientEducationSection from "@/components/ClientEducationSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

function getMeta(brief) {
  return brief?.answers?.__v1 || {};
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  return String(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAdvanceText(meta, currency = "INR") {
  if (!meta?.advanceRequired) return "No advance payment required";

  if (meta.advanceType === "fixed") {
    return `${meta.advanceValue || 0} ${currency} advance before work starts`;
  }

  return `${meta.advanceValue || 0}% advance before work starts`;
}

export default function PublicIntakeForm() {
  const { shareToken } = useParams();

  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [filePreviews, setFilePreviews] = useState({});
  const [uploading, setUploading] = useState({});

  const fileInputRefs = useRef({});

  const meta = useMemo(() => getMeta(brief), [brief]);

  const progress = useMemo(() => {
    const questions = brief?.questions || [];
    if (questions.length === 0) return 0;

    const filled = questions.reduce((count, question) => {
      if (question.type === "file" || question.type === "image") {
        return files[question.id]?.length > 0 ||
          filePreviews[question.id]?.length > 0
          ? count + 1
          : count;
      }

      return answers[question.id]?.trim?.() ? count + 1 : count;
    }, 0);

    return Math.round((filled / questions.length) * 100);
  }, [answers, brief, filePreviews, files]);

  useEffect(() => {
    fetchBrief();
  }, [shareToken]);

  const fetchBrief = async () => {
    setLoading(true);
    setError("");

    try {
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

      setBrief(data);
      setClientName(data.client_name || "");
      setClientEmail(data.client_email || "");
      setClientPhone(data.client_phone || "");
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
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

      return {
        ...prev,
        [questionId]: updated,
      };
    });

    setFilePreviews((prev) => {
      const updated = [...(prev[questionId] || [])];

      if (updated[fileIndex]?.url) {
        URL.revokeObjectURL(updated[fileIndex].url);
      }

      updated.splice(fileIndex, 1);

      return {
        ...prev,
        [questionId]: updated,
      };
    });
  };

  const uploadFilesToSupabase = async (questionId, fileList) => {
    if (!fileList?.length) return [];

    setUploading((prev) => ({
      ...prev,
      [questionId]: true,
    }));

    const uploaded = [];

    for (const file of fileList) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${shareToken}/${questionId}/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("gigvorx-attachments")
          .upload(fileName, file, {
            upsert: false,
          });

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
      }
    }

    setUploading((prev) => ({
      ...prev,
      [questionId]: false,
    }));

    return uploaded;
  };

  const validateRequired = () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      alert("Please enter your name and email.");
      return false;
    }

    const missingRequired = (brief?.questions || []).find((question) => {
      if (!question.required) return false;

      if (question.type === "file" || question.type === "image") {
        return !files[question.id]?.length;
      }

      return !answers[question.id]?.trim?.();
    });

    if (missingRequired) {
      alert(`Please answer required question: ${missingRequired.text}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateRequired()) return;

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

      const finalAnswers = {
        ...answers,
      };

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
        const { data: newClient } = await supabase
          .from("clients")
          .insert({
            name: clientName.trim(),
            email: clientEmail.trim(),
            phone: clientPhone.trim() || null,
            user_id: brief.user_id,
            source: "public_intake",
            status: "lead",
          })
          .select("id")
          .single();

        clientId = newClient?.id;
      }

      await supabase.from("brief_responses").insert({
        brief_id: brief.id,
        client_id: clientId,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || null,
        answers: finalAnswers,
        share_token: shareToken,
      });

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

      await supabase.from("analytics_events").insert({
        user_id: brief.user_id,
        event_type: "public_intake_submit",
        metadata: {
          brief_id: brief.id,
          share_token: shareToken,
        },
      });

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
        <Card className="w-full max-w-md border-white/10 bg-[#111]">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-white">
              Link Not Available
            </h2>
            <p className="text-white/60">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <Card className="w-full max-w-md border-white/10 bg-[#111]">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-400" />

            <h2 className="mb-2 text-xl font-bold text-white">
              Thank You!
            </h2>

            <p className="mb-4 text-white/60">
              Your response has been submitted successfully. The freelancer will
              review your details and confirm the next step.
            </p>

            <p className="text-sm text-white/40">
              Submitted by: {clientName} ({clientEmail})
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 text-white">
      <div className="border-b border-white/10 bg-[#111]">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Badge className="mb-3 border-[#FF6B00]/30 bg-[#FF6B00]/20 text-[#FF6B00]">
            Client Intake Form
          </Badge>

          <h1 className="mb-2 text-2xl font-bold text-white">
            {brief?.title || "Project Brief"}
          </h1>

          {brief?.description && (
            <p className="text-sm text-white/60">{brief.description}</p>
          )}

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

        <ScopeSummary brief={brief} meta={meta} />

        <Card className="border-white/10 bg-[#111]">
          <CardContent className="space-y-4 pt-6">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00] text-xs font-bold text-white">
                1
              </span>
              Your Contact Information
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Full Name *"
                value={clientName}
                onChange={setClientName}
                placeholder="John Doe"
              />

              <Field
                label="Email *"
                type="email"
                value={clientEmail}
                onChange={setClientEmail}
                placeholder="john@example.com"
              />

              <div className="md:col-span-2">
                <Field
                  label="Phone optional"
                  type="tel"
                  value={clientPhone}
                  onChange={setClientPhone}
                  placeholder="+91 98765 43210"
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

          {(brief?.questions || []).length === 0 ? (
            <Card className="border-dashed border-white/10 bg-[#111]">
              <CardContent className="py-10 text-center text-sm text-white/40">
                No questions were added to this brief.
              </CardContent>
            </Card>
          ) : (
            (brief?.questions || []).map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                answer={answers[question.id] || ""}
                previews={filePreviews[question.id] || []}
                uploading={uploading[question.id]}
                fileInputRef={(element) => {
                  fileInputRefs.current[question.id] = element;
                }}
                onAnswerChange={(value) =>
                  handleAnswerChange(question.id, value)
                }
                onFileSelect={(event) => handleFileSelect(question.id, event)}
                onRemoveFile={(fileIndex) =>
                  handleRemoveFile(question.id, fileIndex)
                }
                onTriggerFile={() => triggerFileInput(question.id)}
              />
            ))
          )}
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 w-full bg-[#FF6B00] text-lg font-semibold text-white hover:bg-[#FF6B00]/90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Submit Response
              </>
            )}
          </Button>

          <p className="mt-3 text-center text-xs text-white/30">
            Powered by GigVorx — your information is secure and confidential.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScopeSummary({ brief, meta }) {
  const includedWork = asList(meta.includedWork);
  const excludedWork = asList(meta.excludedWork);
  const hasScope =
    includedWork.length ||
    excludedWork.length ||
    meta.revisionLimit ||
    meta.advanceRequired ||
    meta.approvalStatus;

  if (!hasScope) return null;

  return (
    <Card className="border-[#FF6B00]/20 bg-[#111]">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-[#FF6B00]" />

          <div>
            <h2 className="font-semibold text-white">
              Scope, Revisions & Payment Summary
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Please review this before submitting details. It helps avoid
              confusion later.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {includedWork.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-sm font-semibold text-green-400">
                Included Work
              </p>

              <ul className="space-y-1 text-sm text-white/70">
                {includedWork.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {excludedWork.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-sm font-semibold text-amber-400">
                Not Included
              </p>

              <ul className="space-y-1 text-sm text-white/70">
                {excludedWork.map((item) => (
                  <li key={item} className="flex gap-2">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <InfoBox
            label="Revision Limit"
            value={
              meta.revisionLimit
                ? `${meta.revisionsUsed || 0}/${meta.revisionLimit} used`
                : "Not mentioned"
            }
          />

          <InfoBox
            label="Advance Payment"
            value={getAdvanceText(meta, brief?.currency || "INR")}
          />

          <InfoBox
            label="Scope Approval"
            value={meta.approvalStatus || "Pending"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 font-medium text-white">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-2">
      <Label className="text-white/80">{label}</Label>

      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:ring-[#FF6B00]/20"
      />
    </div>
  );
}

function QuestionCard({
  question,
  index,
  answer,
  previews,
  uploading,
  fileInputRef,
  onAnswerChange,
  onFileSelect,
  onRemoveFile,
  onTriggerFile,
}) {
  const Icon = questionTypeIcons[question.type] || Type;

  return (
    <Card className="border-white/10 bg-[#111]">
      <CardContent className="space-y-3 pb-5 pt-5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-sm font-bold text-[#FF6B00]">
            {index + 1}.
          </span>

          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-white/10 px-1.5 py-0 text-[10px] text-white/50"
              >
                <Icon className="mr-1 h-3 w-3" />
                {questionTypeLabels[question.type] || question.type}
              </Badge>

              {question.required && (
                <Badge className="bg-red-500/20 text-red-300">
                  Required
                </Badge>
              )}
            </div>

            <p className="font-medium text-white">
              {question.text || "Untitled Question"}
            </p>
          </div>
        </div>

        <div className="pl-5">
          {question.type === "text" && (
            <Input
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              placeholder="Type your answer..."
              className="border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
            />
          )}

          {question.type === "long" && (
            <Textarea
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              placeholder="Type your detailed answer..."
              rows={4}
              className="resize-none border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/30 focus:border-[#FF6B00]"
            />
          )}

          {question.type === "select" && (
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
                    onChange={(event) => onAnswerChange(event.target.value)}
                    className="h-4 w-4 accent-[#FF6B00]"
                  />
                  <span className="text-sm text-white">{option}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === "file" && (
            <FileUploader
              accept=".pdf,.doc,.docx,.zip,.txt,.xls,.xlsx,.ppt,.pptx"
              icon={<Upload className="h-5 w-5 text-white/30" />}
              label="Click to upload files PDF, DOC, ZIP"
              previews={previews}
              uploading={uploading}
              inputRef={fileInputRef}
              onTriggerFile={onTriggerFile}
              onFileSelect={onFileSelect}
              onRemoveFile={onRemoveFile}
            />
          )}

          {question.type === "image" && (
            <ImageUploader
              previews={previews}
              uploading={uploading}
              inputRef={fileInputRef}
              onTriggerFile={onTriggerFile}
              onFileSelect={onFileSelect}
              onRemoveFile={onRemoveFile}
            />
          )}

          {question.type === "link" && (
            <LinkInput
              icon={<Link className="h-4 w-4 text-white/20" />}
              value={answer}
              onChange={onAnswerChange}
              placeholder="https://example.com"
              actionLabel="Open"
            />
          )}

          {question.type === "video" && (
            <LinkInput
              icon={<Video className="h-4 w-4 text-white/20" />}
              value={answer}
              onChange={onAnswerChange}
              placeholder="https://youtube.com/... or https://vimeo.com/..."
              actionLabel="Watch"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FileUploader({
  accept,
  icon,
  label,
  previews,
  uploading,
  inputRef,
  onTriggerFile,
  onFileSelect,
  onRemoveFile,
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onTriggerFile}
        className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 transition-all hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#FF6B00]" />
        ) : (
          <>
            {icon}
            <span className="text-sm text-white/30">{label}</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={onFileSelect}
        className="hidden"
      />

      {previews.length > 0 && (
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
                onClick={() => onRemoveFile(fileIndex)}
                className="p-1 text-white/30 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageUploader({
  previews,
  uploading,
  inputRef,
  onTriggerFile,
  onFileSelect,
  onRemoveFile,
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onTriggerFile}
        className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 transition-all hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#FF6B00]" />
        ) : (
          <>
            <Image className="h-5 w-5 text-white/30" />
            <span className="text-sm text-white/30">
              Click to upload images PNG, JPG, GIF
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={onFileSelect}
        className="hidden"
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((file, fileIndex) => (
            <div
              key={`${file.name}-${fileIndex}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-white/10"
            >
              <img
                src={file.url}
                alt={file.name}
                className="h-full w-full object-cover"
              />

              <button
                type="button"
                onClick={() => onRemoveFile(fileIndex)}
                className="absolute right-1 top-1 rounded-full bg-red-500/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>

              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                <span className="block truncate text-[10px] text-white">
                  {file.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkInput({ icon, value, onChange, placeholder, actionLabel }) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>

        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="border-white/10 bg-[#1a1a1a] pl-10 text-white placeholder:text-white/30 focus:border-[#FF6B00]"
        />
      </div>

      {value && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-md bg-[#FF6B00]/20 px-3 py-2 text-sm text-[#FF6B00] transition-colors hover:bg-[#FF6B00]/30"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
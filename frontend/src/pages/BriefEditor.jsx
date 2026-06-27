import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Image, Link, Video, CheckCircle2, Loader2, Send,
  FileText, Type, List, AlertCircle, X, FileCheck
} from "lucide-react";

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

export default function PublicIntakeForm() {
  const { shareToken } = useParams();
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    fetchBrief();
  }, [shareToken]);

  useEffect(() => {
    if (!brief) return;
    const total = brief.questions?.length || 0;
    if (total === 0) { setProgress(0); return; }
    let filled = 0;
    brief.questions.forEach(q => {
      if (q.type === "file" || q.type === "image") {
        if (files[q.id]?.length > 0 || filePreviews[q.id]?.length > 0) filled++;
      } else {
        if (answers[q.id]?.trim?.()) filled++;
      }
    });
    setProgress(Math.round((filled / total) * 100));
  }, [answers, files, filePreviews, brief]);

  const fetchBrief = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("briefs")
        .select("*")
        .eq("share_token", shareToken)
        .eq("share_enabled", true)
        .single();

      if (error || !data) {
        setError("This intake form link is invalid or has been disabled.");
        return;
      }
      setBrief(data);
      if (data.clientEmail) setClientEmail(data.clientEmail);
      if (data.clientName) setClientName(data.clientName);
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleFileSelect = async (questionId, event) => {
    const selectedFiles = Array.from(event.target.files);
    if (!selectedFiles.length) return;

    setFiles(prev => ({ ...prev, [questionId]: [...(prev[questionId] || []), ...selectedFiles] }));

    const previews = selectedFiles.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    }));
    setFilePreviews(prev => ({ ...prev, [questionId]: [...(prev[questionId] || []), ...previews] }));

    if (fileInputRefs.current[questionId]) {
      fileInputRefs.current[questionId].value = "";
    }
  };

  const handleRemoveFile = (questionId, fileIndex) => {
    setFiles(prev => {
      const updated = [...(prev[questionId] || [])];
      updated.splice(fileIndex, 1);
      return { ...prev, [questionId]: updated };
    });
    setFilePreviews(prev => {
      const updated = [...(prev[questionId] || [])];
      if (updated[fileIndex]?.url) URL.revokeObjectURL(updated[fileIndex].url);
      updated.splice(fileIndex, 1);
      return { ...prev, [questionId]: updated };
    });
  };

  const uploadFilesToSupabase = async (questionId, fileList) => {
    if (!fileList?.length) return [];
    setUploading(prev => ({ ...prev, [questionId]: true }));
    const uploaded = [];

    for (const file of fileList) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${shareToken}/${questionId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
      try {
        const { error: upError } = await supabase.storage
          .from("gigvorx-attachments")
          .upload(fileName, file, { upsert: false });
        if (upError) throw upError;

        const { data: urlData } = supabase.storage
          .from("gigvorx-attachments")
          .getPublicUrl(fileName);
        uploaded.push({ name: file.name, url: urlData.publicUrl, type: file.type });
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    setUploading(prev => ({ ...prev, [questionId]: false }));
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
      for (const q of brief.questions || []) {
        if ((q.type === "file" || q.type === "image") && files[q.id]?.length > 0) {
          const uploaded = await uploadFilesToSupabase(q.id, files[q.id]);
          fileAnswers[q.id] = uploaded;
        }
      }

      const finalAnswers = { ...answers };
      Object.entries(fileAnswers).forEach(([qid, uploads]) => {
        finalAnswers[qid] = JSON.stringify(uploads);
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
        .update({ status: "sent", clientName: clientName.trim(), clientEmail: clientEmail.trim() })
        .eq("id", brief.id);

      await supabase.from("analytics_events").insert({
        user_id: brief.user_id,
        event_type: "public_intake_submit",
        metadata: { brief_id: brief.id, share_token: shareToken },
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
    const input = fileInputRefs.current[questionId];
    if (input) {
      input.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <Card className="bg-[#111] border-white/10 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Link Not Available</h2>
            <p className="text-white/60">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <Card className="bg-[#111] border-white/10 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Thank You!</h2>
            <p className="text-white/60 mb-4">Your response has been submitted successfully. We will get back to you soon.</p>
            <p className="text-white/40 text-sm">Submitted by: {clientName} ({clientEmail})</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <div className="border-b border-white/10 bg-[#111]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Badge className="bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/30 mb-3">Client Intake Form</Badge>
          <h1 className="text-2xl font-bold text-white mb-2">{brief?.projectTitle || "Project Brief"}</h1>
          {brief?.description && <p className="text-white/60 text-sm">{brief.description}</p>}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/10" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="bg-[#111] border-white/10">
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FF6B00] text-white text-xs flex items-center justify-center font-bold">1</span>
              Your Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Full Name *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:ring-[#FF6B00]/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Email *</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:ring-[#FF6B00]/20"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-white/80">Phone (optional)</Label>
                <Input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:ring-[#FF6B00]/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FF6B00] text-white text-xs flex items-center justify-center font-bold">2</span>
            Project Questions
          </h3>

          {(brief?.questions || []).map((q, index) => {
            const Icon = questionTypeIcons[q.type] || Type;
            const answer = answers[q.id] || "";
            const qPreviews = filePreviews[q.id] || [];
            const isUploading = uploading[q.id];

            return (
              <Card key={q.id} className="bg-[#111] border-white/10">
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-[#FF6B00] font-bold text-sm mt-0.5">{index + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="border-white/10 text-white/50 text-[10px] px-1.5 py-0">
                          <Icon className="w-3 h-3 mr-1" />
                          {questionTypeLabels[q.type] || q.type}
                        </Badge>
                      </div>
                      <p className="text-white font-medium">{q.text || "Untitled Question"}</p>
                    </div>
                  </div>

                  <div className="pl-5">
                    {q.type === "text" && (
                      <Input
                        value={answer}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Type your answer..."
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:ring-[#FF6B00]/20"
                      />
                    )}

                    {q.type === "long" && (
                      <Textarea
                        value={answer}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Type your detailed answer..."
                        rows={4}
                        className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:ring-[#FF6B00]/20 resize-none"
                      />
                    )}

                    {q.type === "select" && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt, oIndex) => (
                          <label
                            key={oIndex}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              answer === opt
                                ? "border-[#FF6B00] bg-[#FF6B00]/10"
                                : "border-white/10 bg-[#1a1a1a] hover:border-white/20"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value={opt}
                              checked={answer === opt}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="w-4 h-4 accent-[#FF6B00]"
                            />
                            <span className="text-white text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "file" && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => triggerFileInput(q.id)}
                          className="w-full h-20 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5 transition-all cursor-pointer"
                        >
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 text-[#FF6B00] animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-white/30" />
                              <span className="text-white/30 text-sm">Click to upload files (PDF, DOC, ZIP)</span>
                            </>
                          )}
                        </button>
                        <input
                          ref={el => { fileInputRefs.current[q.id] = el; }}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.zip,.txt,.xls,.xlsx,.ppt,.pptx"
                          onChange={(e) => handleFileSelect(q.id, e)}
                          style={{ display: "none" }}
                        />
                        {qPreviews.length > 0 && (
                          <div className="space-y-2">
                            {qPreviews.map((file, fIndex) => (
                              <div key={fIndex} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-white/10">
                                <FileCheck className="w-4 h-4 text-[#FF6B00]" />
                                <span className="text-white text-sm flex-1 truncate">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(q.id, fIndex)}
                                  className="text-white/30 hover:text-red-400 p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {q.type === "image" && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => triggerFileInput(q.id)}
                          className="w-full h-20 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5 transition-all cursor-pointer"
                        >
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 text-[#FF6B00] animate-spin" />
                          ) : (
                            <>
                              <Image className="w-5 h-5 text-white/30" />
                              <span className="text-white/30 text-sm">Click to upload images (PNG, JPG, GIF)</span>
                            </>
                          )}
                        </button>
                        <input
                          ref={el => { fileInputRefs.current[q.id] = el; }}
                          type="file"
                          multiple
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                          onChange={(e) => handleFileSelect(q.id, e)}
                          style={{ display: "none" }}
                        />
                        {qPreviews.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {qPreviews.map((file, fIndex) => (
                              <div key={fIndex} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10">
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(q.id, fIndex)}
                                  className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                                  <span className="text-white text-[10px] truncate block">{file.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {q.type === "link" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <Input
                              value={answer}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              placeholder="https://example.com"
                              className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:ring-[#FF6B00]/20 pl-10"
                            />
                          </div>
                          {answer && (
                            <a
                              href={answer}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-md bg-[#FF6B00]/20 text-[#FF6B00] text-sm hover:bg-[#FF6B00]/30 transition-colors flex items-center gap-1"
                            >
                              <Link className="w-3.5 h-3.5" />Open
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {q.type === "video" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <Input
                              value={answer}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              placeholder="https://youtube.com/... or https://vimeo.com/..."
                              className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:ring-[#FF6B00]/20 pl-10"
                            />
                          </div>
                          {answer && (
                            <a
                              href={answer}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-md bg-[#FF6B00]/20 text-[#FF6B00] text-sm hover:bg-[#FF6B00]/30 transition-colors flex items-center gap-1"
                            >
                              <Video className="w-3.5 h-3.5" />Watch
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white h-12 text-lg font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Response
              </>
            )}
          </Button>
          <p className="text-center text-white/30 text-xs mt-3">
            Powered by GigVorx - Your information is secure and confidential
          </p>
        </div>
      </div>
    </div>
  );
}
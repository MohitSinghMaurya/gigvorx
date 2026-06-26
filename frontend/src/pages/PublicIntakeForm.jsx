import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { findNiche, NICHES } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BrandLogoLarge } from "@/components/Brand";
import { toast } from "sonner";
import {
  Send, CheckCircle2, Loader2, Sparkles, FileText,
  Upload, X, AlertCircle, Mail, Phone, Building2
} from "lucide-react";

async function uploadFile(file, bucket = "gigvorx-attachments") {
  if (!file) return null;
  const ext = file.name.split(".").pop();
  const path = `public-intake/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

export default function PublicIntakeForm() {
  const { shareToken } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [briefConfig, setBriefConfig] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    async function loadSharedBrief() {
      try {
        setLoading(true);
        const { data: briefData, error: briefError } = await supabase
          .from("briefs")
          .select("*, owner:user_id(id, name, email, business_name, logo)")
          .eq("share_token", shareToken)
          .eq("status", "sent")
          .single();

        if (briefError || !briefData) {
          const nicheSlug = searchParams.get("niche") || "web-design";
          const niche = findNiche(nicheSlug);
          setBriefConfig({
            type: "niche",
            niche: niche.slug,
            title: `${niche.name} Project Brief`,
            description: `Fill out this brief to help us understand your ${niche.name.toLowerCase()} project needs.`,
            questions: niche.questions.map((q, i) => ({ id: `q-${i}`, text: q })),
            owner: { name: "GigVorx Freelancer", email: "gigvorx@gmail.com" },
            allowFileUpload: true,
            maxFiles: 3,
          });
          setOwnerProfile({ name: "GigVorx Freelancer", business_name: "GigVorx" });
        } else {
          setBriefConfig({
            type: "shared",
            briefId: briefData.id,
            userId: briefData.user_id,
            niche: briefData.niche,
            title: briefData.title,
            description: briefData.sections?.overview?.replace(/^#.*\n/m, "") || "Please fill out this project brief.",
            questions: briefData.questions?.map((q, i) => ({ id: q.id || `q-${i}`, text: q.q })) || [],
            owner: briefData.owner,
            allowFileUpload: true,
            maxFiles: 5,
          });
          setOwnerProfile(briefData.owner);
        }
      } catch (err) {
        console.error("Failed to load shared brief:", err);
        setError("This link appears to be invalid or expired.");
      } finally {
        setLoading(false);
      }
    }
    if (shareToken) loadSharedBrief();
  }, [shareToken, searchParams]);

  const updateAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const maxFiles = briefConfig?.maxFiles || 3;
    if (files.length + newFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const completionPercent = () => {
    if (!briefConfig) return 0;
    const totalQuestions = briefConfig.questions.length;
    if (totalQuestions === 0) return 0;
    const answered = Object.values(answers).filter(v => v && v.trim().length > 0).length;
    const hasContact = clientName && clientEmail;
    return Math.round(((answered + (hasContact ? 1 : 0)) / (totalQuestions + 1)) * 100);
  };

  const handleSubmit = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error("Please provide your name and email");
      return;
    }
    try {
      setSubmitting(true);
      setUploadProgress(10);
      const fileUrls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadFile(files[i]);
        if (url) fileUrls.push({ name: files[i].name, url });
        setUploadProgress(10 + Math.round(((i + 1) / files.length) * 40));
      }
      setUploadProgress(55);
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", briefConfig.userId)
        .eq("email", clientEmail.toLowerCase())
        .maybeSingle();
      let clientId = existingClient?.id;
      if (!clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            user_id: briefConfig.userId,
            name: clientName,
            email: clientEmail.toLowerCase(),
            phone: clientPhone,
            company: clientCompany,
            is_lead: true,
            lead_source: "public_form",
            status: "new_lead",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (clientError) throw clientError;
        clientId = newClient.id;
      }
      setUploadProgress(75);
      const responsePayload = {
        user_id: briefConfig.userId,
        client_id: clientId,
        client_name: clientName,
        client_email: clientEmail,
        title: briefConfig.title,
        niche: briefConfig.niche,
        status: "draft",
        source: "public_intake",
        share_token: shareToken,
        questions: briefConfig.questions.map(q => ({
          id: q.id,
          q: q.text,
          a: answers[q.id] || "",
        })),
        sections: {
          overview: `# Project Overview\n\nSubmitted by ${clientName} (${clientEmail}) via public intake form.`,
          clientDetails: `# Client Details\n\nName: ${clientName}\nEmail: ${clientEmail}\nPhone: ${clientPhone || "—"}\nCompany: ${clientCompany || "—"}`,
          requirements: `# Requirements\n\n${briefConfig.questions.map(q => `**${q.text}**\n${answers[q.id] || "Not answered"}\n`).join("\n")}`,
          timeline: "# Timeline\n\nTo be discussed.",
          budget: "# Budget\n\nTo be discussed.",
          deliverables: "# Deliverables\n\nTo be defined.",
          notes: `# Notes\n\nSubmitted via public form. Files attached: ${fileUrls.length}`,
        },
        attachments: fileUrls,
        confirmation: false,
        created_at: new Date().toISOString(),
      };
      const { error: briefError } = await supabase.from("briefs").insert(responsePayload);
      if (briefError) throw briefError;
      setUploadProgress(100);
      setSubmitted(true);
      toast.success("Brief submitted successfully!");
      await supabase.from("analytics_events").insert({
        user_id: briefConfig.userId,
        event_name: "public_intake_submitted",
        event_data: {
          share_token: shareToken,
          niche: briefConfig.niche,
          client_email: clientEmail,
          questions_answered: Object.keys(answers).length,
          files_attached: fileUrls.length,
        },
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Submit failed:", err);
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Loading your brief...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Link Not Found</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">GigVorx</span>
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
        <div className="max-w-lg mx-auto">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Brief Submitted!</h2>
            <p className="text-muted-foreground mb-2">
              Thank you, <span className="font-semibold text-foreground">{clientName}</span>.
            </p>
            <p className="text-muted-foreground mb-6">
              {ownerProfile?.business_name || ownerProfile?.name || "The freelancer"} has received your brief and will get back to you shortly.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-2">
              <p><span className="font-medium">Reference:</span> #{shareToken?.slice(0, 8).toUpperCase()}</p>
              <p><span className="font-medium">Email:</span> {clientEmail}</p>
              <p><span className="font-medium">Project:</span> {briefConfig?.title}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Powered by <span className="font-semibold">GigVorx</span> — Professional client intake for freelancers
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const niche = findNiche(briefConfig?.niche || "web-design");
  const pct = completionPercent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogoLarge size={36} />
            <div>
              <p className="font-bold text-sm leading-tight">{ownerProfile?.business_name || ownerProfile?.name || "GigVorx"}</p>
              <p className="text-[10px] text-muted-foreground">Client Intake Form</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {niche.name}
          </Badge>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Form completion</span>
            <span className="font-medium">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        <Card className="overflow-hidden">
          <div className={`h-1.5 bg-gradient-to-r ${niche.accent}`} />
          <div className="p-6 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{briefConfig?.title}</h1>
            <p className="text-muted-foreground mb-8">{briefConfig?.description}</p>
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Full Name *</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="John Doe" className="mt-1.5" required />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</Label>
                  <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="john@company.com" className="mt-1.5" required />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1.5" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Acme Inc." className="mt-1.5" />
                </div>
              </div>
            </div>
            <div className="space-y-6 mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Project Questions</h3>
              {briefConfig?.questions.map((q, i) => (
                <div key={q.id} className="space-y-2">
                  <Label className="text-sm font-medium leading-relaxed">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>{q.text}
                  </Label>
                  <Textarea value={answers[q.id] || ""} onChange={(e) => updateAnswer(q.id, e.target.value)} placeholder="Your answer..." rows={3} className="resize-y" />
                </div>
              ))}
            </div>
            {briefConfig?.allowFileUpload && (
              <div className="space-y-3 mb-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Attachments</h3>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:bg-muted/20 transition-colors">
                  <input type="file" multiple onChange={handleFileChange} className="hidden" id="file-upload" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Click to upload files</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, PNG, JPG up to 10MB each. Max {briefConfig.maxFiles} files.</p>
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="pt-6 border-t">
              {submitting && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Uploading...</span><span>{uploadProgress}%</span></div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}
              <Button onClick={handleSubmit} disabled={submitting || !clientName || !clientEmail} className="w-full bg-brand-gradient text-white hover:opacity-90 h-12 text-base font-semibold shadow-sm shadow-blue-500/20">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><Send className="w-4 h-4 mr-2" />Submit Brief</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Your information is secure and will only be shared with <span className="font-medium">{ownerProfile?.business_name || ownerProfile?.name || "the freelancer"}</span>.
              </p>
            </div>
          </div>
        </Card>
        <div className="text-center mt-8 pb-8">
          <p className="text-xs text-muted-foreground">
            Powered by <a href="https://gigvorx.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline">GigVorx</a> — Professional client intake for freelancers
          </p>
        </div>
      </main>
    </div>
  );
}
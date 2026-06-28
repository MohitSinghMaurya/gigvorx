import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, User, Mail, Phone, MessageCircle,
  CheckCircle2, Clock, FileText, Loader2, Download
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
function AnswerDisplay({ q, answer }) {
  if (!answer) {
    return <p className="text-white/20 text-sm italic">No answer provided</p>;
  }

  try {
    const parsed = JSON.parse(answer);
    if (Array.isArray(parsed)) {
      return (
        <div className="space-y-1">
          {parsed.map((f, fi) => (
            <button
              key={fi}
              onClick={() => window.open(f.url, "_blank")}
              className="text-[#FF6B00] text-sm underline block text-left"
            >
              📎 {f.name}
            </button>
          ))}
        </div>
      );
    }
  } catch (e) {}

  if (q.type === "link" || q.type === "video") {
    return (
      <button
        onClick={() => window.open(answer, "_blank")}
        className="text-[#FF6B00] text-sm underline break-all text-left w-full"
      >
        {answer}
      </button>
    );
  }

  return <p className="text-white text-sm">{answer}</p>;
}

export default function BriefResponses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [brief, setBrief] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);

  useEffect(() => {
    if (user?.id && id) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: briefData, error: briefError } = await supabase
        .from("briefs")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (briefError || !briefData) {
        toast.error("Brief not found");
        navigate("/briefs");
        return;
      }
      setBrief(briefData);

      const { data: responsesData, error: responsesError } = await supabase
        .from("brief_responses")
        .select("*")
        .eq("brief_id", id)
        .order("created_at", { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

      if (responsesData && responsesData.length > 0) {
        setSelectedResponse(responsesData[0]);
      }
    } catch (err) {
      toast.error("Failed to load responses");
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = (response) => {
    const text = `Hi ${response.client_name},\n\nThank you for filling out the project brief for *${brief?.title}*.\n\nI have reviewed your details and will get back to you shortly!\n\n- Powered by GigVorx`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDownloadPDF = (response) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(brief?.title || "Project Brief Response", 20, 20);
    doc.setFontSize(12);
    doc.text(`Client: ${response.client_name || ""}`, 20, 35);
    doc.text(`Email: ${response.client_email || ""}`, 20, 42);
    doc.text(`Phone: ${response.client_phone || ""}`, 20, 49);
    doc.text(`Submitted: ${formatDate(response.created_at)}`, 20, 56);

    let y = 70;
    doc.setFontSize(14);
    doc.text("Responses:", 20, y);
    y += 8;
    doc.setFontSize(11);

    const questions = brief?.questions || [];
    const answers = response.answers || {};

    questions.forEach((q, i) => {
      const answer = answers[q.id] || "No answer provided";
      const qText = `${i + 1}. ${q.text}`;
      const qLines = doc.splitTextToSize(qText, 170);
      if (y + qLines.length * 5 > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(qLines, 20, y);
      y += qLines.length * 5 + 2;
      doc.setTextColor(80, 80, 80);
      const aLines = doc.splitTextToSize(`Answer: ${answer}`, 165);
      if (y + aLines.length * 5 > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(aLines, 25, y);
      doc.setTextColor(0, 0, 0);
      y += aLines.length * 5 + 5;
    });

    doc.save(`${brief?.title || "brief"}_response_${response.client_name || "client"}.pdf`);
    toast.success("PDF downloaded");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <div className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/briefs/${id}`)}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />Back
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">{brief?.title || "Brief"}</h1>
              <p className="text-white/40 text-xs">
                {responses.length} response{responses.length !== 1 ? "s" : ""} received
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/briefs/${id}`)}
            className="border-white/10 text-white hover:bg-white/5"
          >
            <FileText className="w-4 h-4 mr-1.5" />Edit Brief
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {responses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-white/30" />
            </div>
            <h2 className="text-white font-semibold text-xl mb-2">No responses yet</h2>
            <p className="text-white/50 mb-6">
              Share the intake form link with your client and responses will appear here.
            </p>
            {brief?.share_token && (
              <div className="max-w-md mx-auto bg-[#111] border border-white/10 rounded-xl p-4 text-left space-y-3">
                <p className="text-white/60 text-sm font-medium">Intake form link:</p>
                <code className="text-[#FF6B00] text-xs break-all">
                  {window.location.origin}/#/intake/{brief.share_token}
                </code>
                <Button
                  className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/#/intake/${brief.share_token}`
                    );
                    toast.success("Link copied!");
                  }}
                >
                  Copy Link
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
                Submissions ({responses.length})
              </h2>
              {responses.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedResponse(r)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedResponse?.id === r.id
                      ? "border-[#FF6B00] bg-[#FF6B00]/10"
                      : "border-white/10 bg-[#111] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FF6B00]/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-[#FF6B00]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {r.client_name || "Unknown"}
                      </p>
                      <p className="text-white/40 text-xs truncate">{r.client_email || ""}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  </div>
                  <p className="text-white/30 text-xs mt-2">{formatDate(r.created_at)}</p>
                </div>
              ))}
            </div>

            {selectedResponse && (
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-[#111] border-white/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-base flex items-center gap-2">
                        <User className="w-4 h-4 text-[#FF6B00]" />Client Details
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(selectedResponse)}
                          className="border-white/10 text-white hover:bg-white/5 h-7 text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShareWhatsApp(selectedResponse)}
                          className="border-white/10 text-white hover:bg-white/5 h-7 text-xs"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />WhatsApp
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-white/30" />
                        <div>
                          <p className="text-white/40 text-xs">Name</p>
                          <p className="text-white text-sm font-medium">
                            {selectedResponse.client_name || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-white/30" />
                        <div>
                          <p className="text-white/40 text-xs">Email</p>
                          <p className="text-white text-sm font-medium">
                            {selectedResponse.client_email || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-white/30" />
                        <div>
                          <p className="text-white/40 text-xs">Phone</p>
                          <p className="text-white text-sm font-medium">
                            {selectedResponse.client_phone || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-white/30 text-xs">
                        Submitted on {formatDate(selectedResponse.created_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                    Answers ({brief?.questions?.length || 0} questions)
                  </h3>
                  {(brief?.questions || []).map((q, index) => {
                    const answer = selectedResponse.answers?.[q.id];
                    return (
                      <Card key={q.id} className="bg-[#111] border-white/10">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start gap-3">
                            <span className="text-[#FF6B00] font-bold text-sm mt-0.5 flex-shrink-0">
                              {index + 1}.
                            </span>
                            <div className="flex-1">
                              <p className="text-white/70 text-sm font-medium mb-2">{q.text}</p>
                              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-white/5">
                                <AnswerDisplay q={q} answer={answer} />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
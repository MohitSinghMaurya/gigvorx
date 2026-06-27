import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, Copy, CheckCircle2, Globe, Lock, Mail, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

function generateToken() {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");
}

export function ShareBriefDialog({ brief, open, onOpenChange }) {
  const [shareUrl, setShareUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && brief?.share_token) {
      const url = `${window.location.origin}/#/intake/${brief.share_token}`;
      setShareUrl(url);
      setIsPublic(true);
    } else if (open) {
      setShareUrl("");
      setIsPublic(false);
    }
  }, [open, brief]);

  const enableSharing = async () => {
    if (!brief?.id) {
      toast.error("Please save the brief first before sharing.");
      return;
    }
    setLoading(true);
    try {
      const token = generateToken();
      const { error } = await supabase
        .from("briefs")
        .update({
          share_token: token,
          share_enabled: true,
          status: "sent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", brief.id);
      if (error) throw error;
      const url = `${window.location.origin}/#/intake/${token}`;
      setShareUrl(url);
      setIsPublic(true);
      toast.success("Public link created!");
    } catch (err) {
      toast.error("Failed to create link: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const disableSharing = async () => {
    if (!brief?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("briefs")
        .update({
          share_token: null,
          share_enabled: false,
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", brief.id);
      if (error) throw error;
      setShareUrl("");
      setIsPublic(false);
      toast.success("Public link disabled");
    } catch (err) {
      toast.error("Failed to disable link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Project Brief: ${brief?.projectTitle || "New Project"}`);
    const body = encodeURIComponent(
      `Hi ${brief?.clientName || ""},\n\nI have prepared a project brief for you on GigVorx.\n\nPlease click the link below to fill in your details:\n\n${shareUrl}\n\nIt will only take a few minutes. Let me know if you have any questions!\n\nBest regards`
    );
    window.open(`mailto:${brief?.clientEmail || ""}?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Hi ${brief?.clientName || ""},\n\nI have prepared a project brief for *${brief?.projectTitle || "your project"}* on GigVorx.\n\nPlease fill in your details using this link:\n${shareUrl}\n\nIt will only take a few minutes. Let me know if you have any questions!`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#111] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Link2 className="w-5 h-5 text-[#FF6B00]" />Share Brief
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Create a public link so your client can fill out this brief without signing in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              {isPublic
                ? <><Globe className="w-4 h-4 text-green-400" /><span className="text-sm font-medium text-white">Public link active</span></>
                : <><Lock className="w-4 h-4 text-white/40" /><span className="text-sm text-white/40">Private (not shared)</span></>
              }
            </div>
            <Badge className={isPublic ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 text-white/40 border-white/10"}>
              {isPublic ? "Live" : "Draft"}
            </Badge>
          </div>

          {isPublic && shareUrl && (
            <div className="space-y-2">
              <Label className="text-white/80">Public intake form link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-sm bg-[#1a1a1a] border-white/10 text-white"
                />
                <Button size="sm" variant="outline" onClick={copyToClipboard} className="shrink-0 border-white/10 text-white hover:bg-white/5">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-white/40">Anyone with this link can fill out the brief. No login required.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!isPublic ? (
              <Button
                onClick={enableSharing}
                disabled={loading}
                className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
              >
                <Globe className="w-4 h-4 mr-2" />
                {loading ? "Creating link..." : "Create public link"}
              </Button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={shareViaEmail}
                    className="text-sm border-white/10 text-white hover:bg-white/5"
                  >
                    <Mail className="w-4 h-4 mr-1.5" />Email Client
                  </Button>
                  <Button
                    variant="outline"
                    onClick={shareViaWhatsApp}
                    className="text-sm border-white/10 text-white hover:bg-white/5"
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={disableSharing}
                  disabled={loading}
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Lock className="w-4 h-4 mr-2" />Disable public link
                </Button>
              </>
            )}
          </div>

          <div className="text-xs text-white/40 space-y-1 bg-white/5 p-3 rounded-lg border border-white/10">
            <p>• Client fills the form without creating an account</p>
            <p>• Responses appear in your Briefs dashboard automatically</p>
            <p>• Client is added to your Leads/Clients list</p>
            <p>• You can also fill this yourself during a client call</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
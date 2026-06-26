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
    if (!brief?.id) return;
    setLoading(true);
    try {
      const token = generateToken();
      const { error } = await supabase
        .from("briefs")
        .update({ share_token: token, status: "sent", updated_at: new Date().toISOString() })
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
        .update({ share_token: null, status: "draft", updated_at: new Date().toISOString() })
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
    const subject = encodeURIComponent(`Project Brief: ${brief?.title || "New Project"}`);
    const body = encodeURIComponent(`Hi,\n\nI'd like you to fill out a brief for our upcoming project.\n\nPlease click the link below to get started:\n\n${shareUrl}\n\nLooking forward to hearing from you!\n\nBest regards`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Hi! I'd like you to fill out a brief for our project.\n\n${shareUrl}\n\nIt'll only take a few minutes. Thanks!`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="w-5 h-5" />Share Brief</DialogTitle>
          <DialogDescription>Create a public link so your client can fill out this brief without signing in.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              {isPublic ? <><Globe className="w-4 h-4 text-emerald-600" /><span className="text-sm font-medium">Public link active</span></>
              : <><Lock className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Private (not shared)</span></>}
            </div>
            <Badge variant={isPublic ? "default" : "outline"} className={isPublic ? "bg-emerald-600" : ""}>{isPublic ? "Live" : "Draft"}</Badge>
          </div>
          {isPublic && shareUrl && (
            <div className="space-y-2">
              <Label>Public link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-sm" />
                <Button size="sm" variant="outline" onClick={copyToClipboard} className="shrink-0">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Anyone with this link can fill out the brief. No login required.</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {!isPublic ? (
              <Button onClick={enableSharing} disabled={loading} className="w-full bg-brand-gradient text-white hover:opacity-90">
                <Globe className="w-4 h-4 mr-2" />{loading ? "Creating link..." : "Create public link"}
              </Button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={shareViaEmail} className="text-sm"><Mail className="w-4 h-4 mr-1.5" />Email</Button>
                  <Button variant="outline" onClick={shareViaWhatsApp} className="text-sm"><MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp</Button>
                </div>
                <Button variant="outline" onClick={disableSharing} disabled={loading} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Lock className="w-4 h-4 mr-2" />Disable public link
                </Button>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-3 rounded-lg">
            <p>• Client fills the form without creating an account</p>
            <p>• Responses appear in your Briefs dashboard automatically</p>
            <p>• Client is added to your Leads/Clients list</p>
            <p>• You get notified when they submit</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
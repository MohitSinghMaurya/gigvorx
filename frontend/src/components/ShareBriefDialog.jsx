import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Globe,
  Link2,
  Lock,
  Mail,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";

function generateToken() {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");
}

function getBriefTitle(brief) {
  return brief?.projectTitle || brief?.project_title || brief?.title || "New Project";
}

function getClientName(brief) {
  return brief?.clientName || brief?.client_name || "";
}

function getClientEmail(brief) {
  return brief?.clientEmail || brief?.client_email || "";
}

function createShareUrl(token) {
  return `${window.location.origin}/#/intake/${token}`;
}

export function ShareBriefDialog({ brief, open, onOpenChange, onUpdated }) {
  const [shareUrl, setShareUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (brief?.share_token || brief?.shareToken) {
      const token = brief.share_token || brief.shareToken;
      setShareUrl(createShareUrl(token));
      setIsPublic(true);
      setCopied(false);
      return;
    }

    setShareUrl("");
    setIsPublic(false);
    setCopied(false);
  }, [open, brief]);

  const enableSharing = async () => {
    if (!brief?.id) {
      toast.error("Please save the brief first before sharing.");
      return;
    }

    if (!isSupabaseEnabled) {
      toast.error("Sharing needs Supabase to be configured.");
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

      const nextUrl = createShareUrl(token);

      setShareUrl(nextUrl);
      setIsPublic(true);
      onUpdated?.({
        ...brief,
        share_token: token,
        share_enabled: true,
        status: "sent",
      });

      toast.success("Public link created!");
    } catch (error) {
      console.error("Failed to create public brief link:", error);
      toast.error(error.message || "Failed to create public link.");
    } finally {
      setLoading(false);
    }
  };

  const disableSharing = async () => {
    if (!brief?.id) return;

    if (!isSupabaseEnabled) {
      toast.error("Sharing needs Supabase to be configured.");
      return;
    }

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
      onUpdated?.({
        ...brief,
        share_token: null,
        share_enabled: false,
        status: "draft",
      });

      toast.success("Public link disabled.");
    } catch (error) {
      console.error("Failed to disable public brief link:", error);
      toast.error(error.message || "Failed to disable public link.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const shareViaEmail = () => {
    if (!shareUrl) return;

    const subject = encodeURIComponent(`Project Brief: ${getBriefTitle(brief)}`);
    const body = encodeURIComponent(
      `Hi ${getClientName(brief)},\n\nI have prepared a project brief for you on GigVorx.\n\nPlease click the link below to fill in your details:\n\n${shareUrl}\n\nIt will only take a few minutes. Let me know if you have any questions!\n\nBest regards`
    );

    window.open(`mailto:${getClientEmail(brief)}?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    if (!shareUrl) return;

    const text = encodeURIComponent(
      `Hi ${getClientName(brief)},\n\nI have prepared a project brief for ${getBriefTitle(
        brief
      )} on GigVorx.\n\nPlease fill in your details using this link:\n${shareUrl}\n\nIt will only take a few minutes. Let me know if you have any questions!`
    );

    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#111] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Link2 className="h-5 w-5 text-[#FF6B00]" />
            Share Brief
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Create a public link so your client can fill out this brief without signing in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <>
                  <Globe className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-white">Public link active</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-white/40" />
                  <span className="text-sm text-white/40">Private, not shared</span>
                </>
              )}
            </div>

            <Badge
              className={
                isPublic
                  ? "border-green-500/30 bg-green-500/20 text-green-400"
                  : "border-white/10 bg-white/5 text-white/40"
              }
            >
              {isPublic ? "Live" : "Draft"}
            </Badge>
          </div>

          {isPublic && shareUrl ? (
            <div className="space-y-2">
              <Label className="text-white/80">Public intake form link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="bg-[#1a1a1a] text-sm text-white border-white/10"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="shrink-0 border-white/10 text-white hover:bg-white/5"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-white/40">
                Anyone with this link can fill out the brief. No login required.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {!isPublic ? (
              <Button
                type="button"
                onClick={enableSharing}
                disabled={loading}
                className="w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
              >
                <Globe className="mr-2 h-4 w-4" />
                {loading ? "Creating link..." : "Create public link"}
              </Button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={shareViaEmail}
                    className="text-sm border-white/10 text-white hover:bg-white/5"
                  >
                    <Mail className="mr-1.5 h-4 w-4" />
                    Email Client
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={shareViaWhatsApp}
                    className="text-sm border-white/10 text-white hover:bg-white/5"
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={disableSharing}
                  disabled={loading}
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {loading ? "Disabling..." : "Disable public link"}
                </Button>
              </>
            )}
          </div>

          <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/40">
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
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Type, FileText, List, Upload, Image, Link, Video } from "lucide-react";

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

export function BriefPreview({ brief, open, onOpenChange }) {
  if (!brief) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Brief Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#FF6B00] text-[#FF6B00]">
              {brief.status || "draft"}
            </Badge>
            <span className="text-white/40 text-sm">{brief.currency}</span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">{brief.projectTitle || "Untitled Project"}</h3>
            <p className="text-white/60 text-sm mt-1">{brief.description || "No description"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/40">Client:</span>
              <span className="text-white ml-2">{brief.clientName || "-"}</span>
            </div>
            <div>
              <span className="text-white/40">Email:</span>
              <span className="text-white ml-2">{brief.clientEmail || "-"}</span>
            </div>
            <div>
              <span className="text-white/40">Budget:</span>
              <span className="text-white ml-2">{brief.budget || "-"}</span>
            </div>
            <div>
              <span className="text-white/40">Timeline:</span>
              <span className="text-white ml-2">{brief.timeline || "-"}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-semibold">Questions ({brief.questions?.length || 0})</h4>
            {(brief.questions || []).map((q, i) => {
              const Icon = questionTypeIcons[q.type] || Type;
              return (
                <Card key={q.id || i} className="bg-[#0a0a0a] border-white/10">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="border-white/10 text-white/50 text-[10px]">
                        <Icon className="w-3 h-3 mr-1" />
                        {questionTypeLabels[q.type] || q.type}
                      </Badge>
                    </div>
                    <p className="text-white font-medium">{q.text || "Untitled Question"}</p>
                    {q.type === "select" && q.options && (
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt, j) => (
                          <div key={j} className="flex items-center gap-2 text-white/40 text-sm">
                            <div className="w-3 h-3 rounded-full border border-white/20" />
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
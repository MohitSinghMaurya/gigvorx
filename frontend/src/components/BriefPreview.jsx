import {
  FileText,
  Image,
  Link,
  List,
  Type,
  Upload,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const questionTypeIcons = {
  text: Type,
  long: FileText,
  textarea: FileText,
  select: List,
  multi_select: List,
  toggle: List,
  file: Upload,
  image: Image,
  link: Link,
  url: Link,
  url_list: Link,
  video: Video,
  mixed: Upload,
};

const questionTypeLabels = {
  text: "Short Answer",
  long: "Long Answer",
  textarea: "Long Answer",
  select: "Single Choice",
  multi_select: "Multiple Choice",
  toggle: "Choice",
  file: "File Upload",
  image: "Image Upload",
  link: "URL / Link",
  url: "URL / Link",
  url_list: "URL List",
  video: "Video Link",
  mixed: "File or Link",
};

function getTitle(brief) {
  return brief?.projectTitle || brief?.project_title || brief?.title || "Untitled Project";
}

function getClientName(brief) {
  return brief?.clientName || brief?.client_name || "-";
}

function getClientEmail(brief) {
  return brief?.clientEmail || brief?.client_email || "-";
}

function getQuestionText(question) {
  return question?.text || question?.q || question?.label || "Untitled Question";
}

export function BriefPreview({ brief, open, onOpenChange }) {
  if (!brief) return null;

  const questions = Array.isArray(brief.questions) ? brief.questions : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto border-white/10 bg-[#111] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Brief Preview</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#FF6B00] text-[#FF6B00]">
              {brief.status || "draft"}
            </Badge>

            {brief.currency ? (
              <span className="text-sm text-white/40">{brief.currency}</span>
            ) : null}
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">{getTitle(brief)}</h3>
            <p className="mt-1 text-sm text-white/60">
              {brief.description || "No description"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-white/40">Client:</span>
              <span className="ml-2 text-white">{getClientName(brief)}</span>
            </div>

            <div>
              <span className="text-white/40">Email:</span>
              <span className="ml-2 text-white">{getClientEmail(brief)}</span>
            </div>

            <div>
              <span className="text-white/40">Budget:</span>
              <span className="ml-2 text-white">{brief.budget || "-"}</span>
            </div>

            <div>
              <span className="text-white/40">Timeline:</span>
              <span className="ml-2 text-white">{brief.timeline || "-"}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-white">Questions ({questions.length})</h4>

            {questions.length > 0 ? (
              questions.map((question, index) => {
                const Icon = questionTypeIcons[question.type] || Type;

                return (
                  <Card key={question.id || `${getQuestionText(question)}-${index}`} className="border-white/10 bg-[#0a0a0a]">
                    <CardContent className="pb-4 pt-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-white/10 text-[10px] text-white/50"
                        >
                          <Icon className="mr-1 h-3 w-3" />
                          {questionTypeLabels[question.type] || question.type || "Question"}
                        </Badge>
                      </div>

                      <p className="font-medium text-white">{getQuestionText(question)}</p>

                      {question.type === "select" && Array.isArray(question.options) ? (
                        <div className="mt-2 space-y-1">
                          {question.options.map((option) => (
                            <div
                              key={option}
                              className="flex items-center gap-2 text-sm text-white/40"
                            >
                              <div className="h-3 w-3 rounded-full border border-white/20" />
                              {option}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-white/10 bg-[#0a0a0a]">
                <CardContent className="py-6 text-center text-sm text-white/50">
                  No questions added yet.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BriefPreview;
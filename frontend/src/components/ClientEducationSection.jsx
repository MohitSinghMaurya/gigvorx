import {
  CheckCircle2,
  FileText,
  Image,
  Info,
  Link2,
  PlayCircle,
  Volume2,
} from "lucide-react";

import { Card } from "@/components/ui/card";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function MediaLink({ href, icon: Icon, label }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-blue-500" />
      {label}
    </a>
  );
}

export default function ClientEducationSection({ education, compact = false }) {
  if (!education?.enabled) return null;

  const checklist = ensureArray(education.checklist);
  const tips = ensureArray(education.tips);
  const processSteps = ensureArray(education.processSteps);
  const imageUrls = ensureArray(education.imageUrls);
  const documentUrls = ensureArray(education.documentUrls);

  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2">
          <Info className="h-5 w-5 text-blue-600" />
        </div>

        <div>
          <h2 className={compact ? "text-lg font-bold" : "text-xl font-bold"}>
            {education.title || "Before you fill this brief"}
          </h2>

          {education.intro ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {education.intro}
            </p>
          ) : null}
        </div>
      </div>

      {(education.videoUrl || education.audioUrl || imageUrls.length || documentUrls.length) ? (
        <div className="mb-5 rounded-xl border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold">Helpful guidance files</h3>

          <div className="flex flex-wrap gap-2">
            <MediaLink href={education.videoUrl} icon={PlayCircle} label="Watch video guide" />
            <MediaLink href={education.audioUrl} icon={Volume2} label="Listen to audio guide" />

            {imageUrls.map((url, index) => (
              <MediaLink
                key={`${url}-${index}`}
                href={url}
                icon={Image}
                label={`View image ${index + 1}`}
              />
            ))}

            {documentUrls.map((url, index) => (
              <MediaLink
                key={`${url}-${index}`}
                href={url}
                icon={FileText}
                label={`Open document ${index + 1}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {checklist.length > 0 ? (
        <div className="mb-5">
          <h3 className="mb-3 text-sm font-semibold">What you should prepare</h3>

          <div className="grid gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {processSteps.length > 0 ? (
        <div className="mb-5">
          <h3 className="mb-3 text-sm font-semibold">How the project usually works</h3>

          <div className="space-y-3">
            {processSteps.map((step, index) => (
              <div key={`${step.title}-${index}`} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {index + 1}
                </div>

                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tips.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Link2 className="h-4 w-4" />
            Tips for clearer details
          </h3>

          <ul className="space-y-1.5 text-sm text-amber-700">
            {tips.map((tip) => (
              <li key={tip}>• {tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
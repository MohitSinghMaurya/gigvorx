import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  Briefcase,
  Check,
  FileText,
  FolderOpen,
  Image,
  Link2,
  Monitor,
  Palette,
  Plus,
  Search,
  Share2,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";

function getCustomTemplatesKey(userId) {
  return `gv_custom_question_templates_${userId || "guest"}`;
}

function loadCustomTemplates(userId) {
  try {
    const raw = localStorage.getItem(getCustomTemplatesKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(userId, templates) {
  localStorage.setItem(getCustomTemplatesKey(userId), JSON.stringify(templates));
}

export const NICHE_QUESTIONS = {
  "web-design": {
    icon: Monitor,
    color: "from-violet-500 to-indigo-500",
    questions: [
      {
        id: "brand_name",
        label: "What is your brand name?",
        type: "text",
        placeholder: "e.g. Acme Studios",
        required: true,
      },
      {
        id: "logo_upload",
        label: "Upload your logo",
        type: "file",
        accept: ".png,.svg,.pdf,.jpg,.jpeg",
        description: "PNG, SVG, or PDF preferred",
      },
      {
        id: "reference_websites",
        label: "Share websites you like",
        type: "url_list",
        placeholder: "https://example.com",
        description: "Paste reference website URLs.",
        maxUrls: 5,
      },
      {
        id: "brand_colors",
        label: "What colors represent your brand?",
        type: "color_picker",
      },
      {
        id: "pages_needed",
        label: "What pages do you need?",
        type: "multi_select",
        options: [
          "Homepage",
          "About",
          "Services",
          "Portfolio",
          "Contact",
          "Blog",
          "Shop",
          "FAQ",
        ],
      },
      {
        id: "content_ready",
        label: "Do you have content ready?",
        type: "toggle",
        options: ["Content is ready", "Need copywriting help", "Not sure yet"],
      },
      {
        id: "deadline",
        label: "What is your target launch date?",
        type: "date",
      },
      {
        id: "budget_range",
        label: "What is your budget range?",
        type: "budget",
        placeholder: "e.g. 50000",
      },
    ],
  },

  "social-media": {
    icon: Share2,
    color: "from-pink-500 to-rose-500",
    questions: [
      {
        id: "platforms",
        label: "Which platforms do you want managed?",
        type: "multi_select",
        options: ["Instagram", "LinkedIn", "X / Twitter", "YouTube", "Facebook", "Pinterest"],
        required: true,
      },
      {
        id: "brand_voice",
        label: "What is your brand voice?",
        type: "select",
        options: [
          "Professional",
          "Casual and friendly",
          "Witty and fun",
          "Inspirational",
          "Bold and edgy",
          "Luxury and elegant",
        ],
      },
      {
        id: "target_audience",
        label: "Who is your target audience?",
        type: "structured",
        fields: [
          { id: "age", label: "Age range", type: "text", placeholder: "e.g. 25-34" },
          { id: "location", label: "Location", type: "text", placeholder: "e.g. India, USA, UK" },
          { id: "interests", label: "Interests", type: "text", placeholder: "e.g. Fitness, Tech" },
        ],
      },
      {
        id: "posts_per_week",
        label: "How many posts per week?",
        type: "select",
        options: ["3-5", "5-7", "7-10", "10+", "Not sure yet"],
      },
      {
        id: "campaigns",
        label: "Any upcoming campaigns or launches?",
        type: "textarea",
        placeholder: "Product launch, seasonal promo, event...",
      },
      {
        id: "kpis",
        label: "What KPIs matter most?",
        type: "multi_select",
        options: [
          "Follower growth",
          "Engagement rate",
          "Leads generated",
          "Sales",
          "Brand awareness",
          "Website traffic",
        ],
      },
    ],
  },

  "video-editing": {
    icon: Video,
    color: "from-orange-500 to-red-500",
    questions: [
      {
        id: "video_type",
        label: "What type of videos do you need edited?",
        type: "multi_select",
        options: [
          "YouTube videos",
          "Instagram Reels",
          "TikTok",
          "LinkedIn videos",
          "Ads and promos",
          "Podcasts",
          "Tutorials",
        ],
        required: true,
      },
      {
        id: "raw_footage",
        label: "Upload raw footage or share a link",
        type: "mixed",
        description: "Google Drive, Dropbox, or direct upload.",
      },
      {
        id: "reference_video",
        label: "Share a reference video with the style you want",
        type: "mixed",
      },
      {
        id: "platform",
        label: "What is the intended platform?",
        type: "multi_select",
        options: [
          "YouTube 16:9",
          "Instagram Reels 9:16",
          "TikTok 9:16",
          "LinkedIn",
          "Multiple platforms",
        ],
      },
      {
        id: "editing_style",
        label: "What editing style do you prefer?",
        type: "select",
        options: [
          "Fast cuts / energetic",
          "Cinematic / slow",
          "Talking head / clean",
          "Motion graphics heavy",
          "Minimal / subtle",
          "Match my reference video",
        ],
      },
      {
        id: "revisions",
        label: "How many revision rounds do you expect?",
        type: "select",
        options: ["1 round", "2 rounds", "3 rounds", "Not sure"],
      },
    ],
  },

  seo: {
    icon: Search,
    color: "from-emerald-500 to-teal-500",
    questions: [
      {
        id: "website_url",
        label: "Share your website URL for audit",
        type: "url",
        placeholder: "https://yourwebsite.com",
        required: true,
      },
      {
        id: "target_keywords",
        label: "What are your top target keywords?",
        type: "structured",
        fields: [
          { id: "kw1", label: "Keyword 1", type: "text", placeholder: "e.g. web design services" },
          { id: "kw2", label: "Keyword 2", type: "text", placeholder: "e.g. freelance designer" },
          { id: "kw3", label: "Keyword 3", type: "text", placeholder: "e.g. branding agency" },
        ],
      },
      {
        id: "competitor_websites",
        label: "Share competitor websites you want to outrank",
        type: "url_list",
        placeholder: "https://competitor.com",
        maxUrls: 5,
      },
      {
        id: "target_locations",
        label: "Which locations are important?",
        type: "text",
        placeholder: "e.g. Delhi, Mumbai, London, New York",
      },
      {
        id: "seo_tools",
        label: "Do you have any SEO tools set up?",
        type: "multi_select",
        options: ["Google Analytics", "Google Search Console", "SEMrush", "Ahrefs", "None yet"],
      },
      {
        id: "timeline",
        label: "What is your timeline expectation for results?",
        type: "select",
        options: ["1-3 months", "3-6 months", "6-12 months", "Flexible / ongoing"],
      },
    ],
  },

  "graphic-design": {
    icon: Palette,
    color: "from-fuchsia-500 to-purple-500",
    questions: [
      {
        id: "design_type",
        label: "What type of design do you need?",
        type: "multi_select",
        options: [
          "Logo design",
          "Brand identity",
          "Social media graphics",
          "Packaging",
          "Pitch deck",
          "Brochure / flyer",
          "UI/UX design",
        ],
        required: true,
      },
      {
        id: "existing_assets",
        label: "Upload any existing brand assets",
        type: "file",
        accept: ".png,.svg,.pdf,.ai,.zip",
        multiple: true,
      },
      {
        id: "design_references",
        label: "Share design references you love",
        type: "mixed",
      },
      {
        id: "design_feeling",
        label: "What feeling should the design give?",
        type: "multi_select",
        options: [
          "Professional",
          "Playful",
          "Luxury",
          "Minimal",
          "Bold",
          "Friendly",
          "Modern",
          "Trustworthy",
        ],
      },
      {
        id: "deliverables",
        label: "What file formats do you need on delivery?",
        type: "multi_select",
        options: ["AI / Vector", "PDF", "PNG", "SVG", "PSD", "All source files"],
      },
      {
        id: "deadline",
        label: "What is the project deadline?",
        type: "date",
      },
    ],
  },

  default: {
    icon: Briefcase,
    color: "from-slate-500 to-zinc-600",
    questions: [
      {
        id: "project_overview",
        label: "Describe your project in detail",
        type: "textarea",
        placeholder: "What do you need help with? Be as specific as possible...",
        required: true,
      },
      {
        id: "reference_files",
        label: "Upload any reference files or inspiration",
        type: "file",
        accept: ".png,.jpg,.jpeg,.pdf,.zip,.mp4",
        multiple: true,
      },
      {
        id: "reference_links",
        label: "Share any reference links",
        type: "url_list",
        placeholder: "https://example.com",
        maxUrls: 5,
      },
      {
        id: "budget",
        label: "What is your budget range?",
        type: "budget",
        placeholder: "e.g. 25000",
      },
      {
        id: "timeline",
        label: "What is your target timeline?",
        type: "date",
      },
      {
        id: "additional_notes",
        label: "Anything else we should know?",
        type: "textarea",
        placeholder: "Special requirements, constraints, preferences...",
      },
    ],
  },
};

function FileUploadField({ question, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState(Array.isArray(value) ? value : []);

  useEffect(() => {
    setFiles(Array.isArray(value) ? value : []);
  }, [value]);

  const handleFileChange = useCallback(
    async (event) => {
      const selectedFiles = Array.from(event.target.files || []);
      if (selectedFiles.length === 0) return;

      setUploading(true);

      try {
        const uploadedFiles = [];

        for (const file of selectedFiles) {
          if (isSupabaseEnabled && supabase?.storage) {
            const fileExt = file.name.split(".").pop() || "file";
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `brief-attachments/${fileName}`;

            const { error } = await supabase.storage
              .from("gigvorx-attachments")
              .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
              });

            if (error) throw error;

            const { data } = supabase.storage
              .from("gigvorx-attachments")
              .getPublicUrl(filePath);

            uploadedFiles.push({
              name: file.name,
              url: data.publicUrl,
              path: filePath,
              type: file.type,
              size: file.size,
            });
          } else {
            uploadedFiles.push({
              name: file.name,
              url: "",
              type: file.type,
              size: file.size,
            });
          }
        }

        const nextFiles = question.multiple === false ? uploadedFiles.slice(0, 1) : [...files, ...uploadedFiles];

        setFiles(nextFiles);
        onChange(nextFiles);
        toast.success(`${uploadedFiles.length} file(s) added.`);
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(error.message || "Upload failed. Please try again.");
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    },
    [files, onChange, question.multiple]
  );

  const removeFile = useCallback(
    (index) => {
      const nextFiles = files.filter((_, itemIndex) => itemIndex !== index);
      setFiles(nextFiles);
      onChange(nextFiles);
    },
    [files, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2 transition-colors hover:bg-muted ${
            uploading ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading..." : "Choose files"}
          </span>
          <input
            type="file"
            accept={question.accept}
            multiple={question.multiple}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </Label>

        {question.description ? (
          <span className="text-xs text-muted-foreground">{question.description}</span>
        ) : null}
      </div>

      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm"
            >
              {file.type?.startsWith("image/") ? (
                <Image className="h-4 w-4 text-blue-500" />
              ) : (
                <FileText className="h-4 w-4 text-amber-500" />
              )}

              <span className="flex-1 truncate text-xs">{file.name}</span>

              {file.url ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => removeFile(index)}
                className="rounded p-1 hover:bg-destructive/10"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UrlListField({ question, value, onChange }) {
  const [urls, setUrls] = useState(Array.isArray(value) && value.length ? value : [""]);

  const updateUrl = (index, url) => {
    const nextUrls = [...urls];
    nextUrls[index] = url;

    if (index === urls.length - 1 && url && urls.length < (question.maxUrls || 5)) {
      nextUrls.push("");
    }

    setUrls(nextUrls);
    onChange(nextUrls.filter((item) => item.trim()));
  };

  const removeUrl = (index) => {
    const nextUrls = urls.filter((_, itemIndex) => itemIndex !== index);
    if (nextUrls.length === 0) nextUrls.push("");

    setUrls(nextUrls);
    onChange(nextUrls.filter((item) => item.trim()));
  };

  return (
    <div className="space-y-2">
      {urls.map((url, index) => (
        <div key={`${question.id}-${index}`} className="flex items-center gap-2">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />

          <Input
            type="url"
            placeholder={question.placeholder || "https://..."}
            value={url}
            onChange={(event) => updateUrl(index, event.target.value)}
            className="flex-1"
          />

          {urls.length > 1 && url ? (
            <button
              type="button"
              onClick={() => removeUrl(index)}
              className="rounded p-1 hover:bg-muted"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ) : null}
        </div>
      ))}

      {question.description ? (
        <p className="text-xs text-muted-foreground">{question.description}</p>
      ) : null}
    </div>
  );
}

function ColorPickerField({ value, onChange }) {
  const [colors, setColors] = useState(Array.isArray(value) && value.length ? value : ["#3B82F6"]);
  const [customColor, setCustomColor] = useState("#3B82F6");

  const addColor = () => {
    if (colors.includes(customColor)) return;

    const nextColors = [...colors, customColor];
    setColors(nextColors);
    onChange(nextColors);
  };

  const removeColor = (index) => {
    const nextColors = colors.filter((_, itemIndex) => itemIndex !== index);
    setColors(nextColors);
    onChange(nextColors);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={customColor}
          onChange={(event) => setCustomColor(event.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border"
        />

        <Input
          value={customColor}
          onChange={(event) => setCustomColor(event.target.value)}
          placeholder="#3B82F6"
          className="w-32"
        />

        <Button type="button" size="sm" variant="outline" onClick={addColor}>
          <Palette className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <div
            key={`${color}-${index}`}
            className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
            style={{ backgroundColor: `${color}20`, borderColor: `${color}40` }}
          >
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span>{color}</span>

            <button type="button" onClick={() => removeColor(index)} className="ml-1">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiSelectField({ question, value, onChange }) {
  const [selected, setSelected] = useState(Array.isArray(value) ? value : []);

  const toggle = (option) => {
    const nextSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    setSelected(nextSelected);
    onChange(nextSelected);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(question.options || []).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            selected.includes(option)
              ? "bg-blue-500 text-white shadow-sm"
              : "border bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {selected.includes(option) ? <Check className="mr-1 inline h-3 w-3" /> : null}
          {option}
        </button>
      ))}
    </div>
  );
}

function ToggleField({ question, value, onChange }) {
  const [selected, setSelected] = useState(value || "");

  const handleSelect = (option) => {
    setSelected(option);
    onChange(option);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(question.options || []).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleSelect(option)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            selected === option
              ? "bg-blue-500 text-white shadow-sm"
              : "border bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function BudgetField({ value, onChange, placeholder }) {
  const [currency, setCurrency] = useState("₹");
  const [amount, setAmount] = useState(String(value || "").replace(/[^0-9]/g, ""));

  const updateValue = (nextCurrency, nextAmount) => {
    setCurrency(nextCurrency);
    setAmount(nextAmount);
    onChange(nextAmount ? `${nextCurrency}${nextAmount}` : "");
  };

  return (
    <div className="relative">
      <select
        value={currency}
        onChange={(event) => updateValue(event.target.value, amount)}
        className="absolute left-1 top-1/2 h-7 w-14 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-sm font-medium text-muted-foreground focus:ring-0"
      >
        <option value="₹">₹</option>
        <option value="$">$</option>
        <option value="£">£</option>
        <option value="€">€</option>
        <option value="AED">AED</option>
      </select>

      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder || "Enter amount"}
        value={amount}
        onChange={(event) =>
          updateValue(currency, event.target.value.replace(/[^0-9]/g, ""))
        }
        className="pl-16"
      />
    </div>
  );
}

function StructuredField({ question, value, onChange }) {
  const [data, setData] = useState(value || {});

  const updateField = (fieldId, nextValue) => {
    const nextData = { ...data, [fieldId]: nextValue };
    setData(nextData);
    onChange(nextData);
  };

  return (
    <div className="space-y-3">
      {(question.fields || []).map((field) => (
        <div key={field.id}>
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={data[field.id] || ""}
            onChange={(event) => updateField(field.id, event.target.value)}
            className="mt-1"
          />
        </div>
      ))}
    </div>
  );
}

function MixedField({ question, value, onChange }) {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState(value?.url || "");
  const [files, setFiles] = useState(value?.files || []);

  const handleUrlChange = (nextUrl) => {
    setUrl(nextUrl);
    onChange({ url: nextUrl, files });
  };

  const handleFilesChange = (nextFiles) => {
    setFiles(nextFiles);
    onChange({ url, files: nextFiles });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            mode === "url" ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          <Link2 className="mr-1 inline h-3 w-3" />
          Paste URL
        </button>

        <button
          type="button"
          onClick={() => setMode("file")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            mode === "file" ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          <Upload className="mr-1 inline h-3 w-3" />
          Upload File
        </button>
      </div>

      {mode === "url" ? (
        <Input
          type="url"
          placeholder={question.placeholder || "https://..."}
          value={url}
          onChange={(event) => handleUrlChange(event.target.value)}
        />
      ) : (
        <FileUploadField
          question={{
            accept: ".png,.jpg,.jpeg,.pdf,.mp4,.mov",
            multiple: true,
            description: question.description,
          }}
          value={files}
          onChange={handleFilesChange}
        />
      )}
    </div>
  );
}

function CustomQuestionBuilder({
  onAdd,
  onSaveTemplate,
  onLoadTemplate,
  templates,
  onDeleteTemplate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [required, setRequired] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const optionTypes = ["multi_select", "select", "toggle"];

  const buildQuestion = () => {
    const question = {
      id: `custom_${Date.now()}`,
      label: label.trim(),
      type,
      placeholder: placeholder.trim() || undefined,
      required,
      custom: true,
    };

    if (optionTypes.includes(type)) {
      const parsedOptions = options
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean);

      if (parsedOptions.length === 0) {
        toast.error("Please enter at least one option.");
        return null;
      }

      question.options = parsedOptions;
    }

    return question;
  };

  const handleAdd = () => {
    if (!label.trim()) {
      toast.error("Please enter a question label.");
      return;
    }

    const question = buildQuestion();
    if (!question) return;

    onAdd(question);
    setLabel("");
    setOptions("");
    setPlaceholder("");
    setRequired(false);
    setIsOpen(false);
    toast.success("Custom question added.");
  };

  const handleSaveTemplate = () => {
    if (!label.trim()) {
      toast.error("Please enter a question label first.");
      return;
    }

    onSaveTemplate(label.trim(), type, options, placeholder, required);
    toast.success("Template saved.");
  };

  return (
    <div className="space-y-3">
      {!isOpen ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="border-2 border-dashed"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add custom question
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates((value) => !value)}
          >
            <FolderOpen className="mr-1 h-4 w-4" />
            Saved templates
            {templates.length > 0 ? (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {templates.length}
              </Badge>
            ) : null}
          </Button>
        </div>
      ) : (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Add Custom Question</h4>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Question text</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. What is your preferred communication method?"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Answer type</Label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="text">Short text</option>
              <option value="textarea">Long text</option>
              <option value="select">Single select</option>
              <option value="multi_select">Multi select</option>
              <option value="toggle">Toggle</option>
              <option value="url">URL</option>
              <option value="date">Date</option>
              <option value="file">File upload</option>
            </select>
          </div>

          {optionTypes.includes(type) ? (
            <div className="space-y-2">
              <Label className="text-xs">Options, comma-separated</Label>
              <Input
                value={options}
                onChange={(event) => setOptions(event.target.value)}
                placeholder="e.g. Email, Phone, WhatsApp, Video call"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs">Placeholder, optional</Label>
            <Input
              value={placeholder}
              onChange={(event) => setPlaceholder(event.target.value)}
              placeholder="e.g. Enter your answer here..."
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Required question</span>
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" size="sm" onClick={handleAdd} className="bg-blue-600 text-white">
              <Plus className="mr-1 h-3 w-3" />
              Add question
            </Button>

            <Button type="button" size="sm" variant="outline" onClick={handleSaveTemplate}>
              <BookMarked className="mr-1 h-3 w-3" />
              Save as template
            </Button>

            <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {showTemplates && templates.length > 0 ? (
        <Card className="space-y-2 p-4">
          <h4 className="mb-2 text-sm font-semibold">Saved Question Templates</h4>

          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{template.label}</p>
                <p className="text-xs text-muted-foreground">Type: {template.type}</p>
              </div>

              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    onLoadTemplate(template);
                    setShowTemplates(false);
                  }}
                >
                  Use
                </Button>

                <button
                  type="button"
                  onClick={() => onDeleteTemplate(template.id)}
                  className="rounded p-1 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

export function SmartNicheBrief({ nicheSlug, questions, onQuestionsChange, userId }) {
  const nicheConfig = NICHE_QUESTIONS[nicheSlug] || NICHE_QUESTIONS.default;

  const [answers, setAnswers] = useState({});
  const [customQuestions, setCustomQuestions] = useState([]);
  const [templates, setTemplates] = useState(() => loadCustomTemplates(userId));

  useEffect(() => {
    setTemplates(loadCustomTemplates(userId));
  }, [userId]);

  const allQuestions = useMemo(
    () => [...nicheConfig.questions, ...customQuestions],
    [customQuestions, nicheConfig.questions]
  );

  const emitQuestionsChange = useCallback(
    (nextAnswers, nextQuestions = allQuestions) => {
      const updatedQuestions = nextQuestions.map((question) => ({
        id: question.id,
        q: question.label,
        a: nextAnswers[question.id] || "",
        custom: question.custom || false,
        type: question.type,
      }));

      onQuestionsChange?.(updatedQuestions);
    },
    [allQuestions, onQuestionsChange]
  );

  useEffect(() => {
    if (Array.isArray(questions) && questions.length > 0) {
      const nextAnswers = {};
      questions.forEach((item) => {
        if (item?.id) nextAnswers[item.id] = item.a || "";
      });
      setAnswers(nextAnswers);
    }
  }, [questions]);

  const updateAnswer = (questionId, answer) => {
    const nextAnswers = { ...answers, [questionId]: answer };
    setAnswers(nextAnswers);
    emitQuestionsChange(nextAnswers);
  };

  const addCustomQuestion = (question) => {
    const nextQuestions = [...customQuestions, question];
    setCustomQuestions(nextQuestions);
    emitQuestionsChange(answers, [...nicheConfig.questions, ...nextQuestions]);
  };

  const saveTemplate = (label, type, options, placeholder, required) => {
    const template = {
      id: `template_${Date.now()}`,
      label,
      type,
      options: options
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean),
      placeholder: placeholder.trim() || undefined,
      required,
      createdAt: new Date().toISOString(),
    };

    const updatedTemplates = [...templates, template];
    setTemplates(updatedTemplates);
    saveCustomTemplates(userId, updatedTemplates);
  };

  const loadTemplate = (template) => {
    const question = {
      id: `custom_${Date.now()}`,
      label: template.label,
      type: template.type,
      options: template.options,
      placeholder: template.placeholder,
      required: template.required,
      custom: true,
    };

    setCustomQuestions((items) => [...items, question]);
    toast.success(`Added "${template.label}" from template.`);
  };

  const deleteTemplate = (templateId) => {
    const updatedTemplates = templates.filter((template) => template.id !== templateId);
    setTemplates(updatedTemplates);
    saveCustomTemplates(userId, updatedTemplates);
    toast.success("Template deleted.");
  };

  const removeCustomQuestion = (questionId) => {
    const nextCustomQuestions = customQuestions.filter((question) => question.id !== questionId);
    const nextAnswers = { ...answers };

    delete nextAnswers[questionId];

    setCustomQuestions(nextCustomQuestions);
    setAnswers(nextAnswers);
    emitQuestionsChange(nextAnswers, [...nicheConfig.questions, ...nextCustomQuestions]);
  };

  const renderQuestion = (question) => {
    const currentValue = answers[question.id];

    switch (question.type) {
      case "textarea":
        return (
          <Textarea
            placeholder={question.placeholder}
            value={currentValue || ""}
            onChange={(event) => updateAnswer(question.id, event.target.value)}
            rows={4}
          />
        );

      case "file":
        return (
          <FileUploadField
            question={question}
            value={currentValue}
            onChange={(files) => updateAnswer(question.id, files)}
          />
        );

      case "url":
        return (
          <Input
            type="url"
            placeholder={question.placeholder}
            value={currentValue || ""}
            onChange={(event) => updateAnswer(question.id, event.target.value)}
          />
        );

      case "url_list":
        return (
          <UrlListField
            question={question}
            value={currentValue}
            onChange={(urls) => updateAnswer(question.id, urls)}
          />
        );

      case "color_picker":
        return (
          <ColorPickerField
            value={currentValue}
            onChange={(colors) => updateAnswer(question.id, colors)}
          />
        );

      case "multi_select":
        return (
          <MultiSelectField
            question={question}
            value={currentValue}
            onChange={(selected) => updateAnswer(question.id, selected)}
          />
        );

      case "toggle":
        return (
          <ToggleField
            question={question}
            value={currentValue}
            onChange={(value) => updateAnswer(question.id, value)}
          />
        );

      case "select":
        return (
          <select
            value={currentValue || ""}
            onChange={(event) => updateAnswer(question.id, event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select an option</option>
            {(question.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "date":
        return (
          <Input
            type="date"
            value={currentValue || ""}
            onChange={(event) => updateAnswer(question.id, event.target.value)}
          />
        );

      case "budget":
        return (
          <BudgetField
            value={currentValue}
            onChange={(value) => updateAnswer(question.id, value)}
            placeholder={question.placeholder}
          />
        );

      case "structured":
        return (
          <StructuredField
            question={question}
            value={currentValue}
            onChange={(data) => updateAnswer(question.id, data)}
          />
        );

      case "mixed":
        return (
          <MixedField
            question={question}
            value={currentValue}
            onChange={(data) => updateAnswer(question.id, data)}
          />
        );

      case "text":
      default:
        return (
          <Input
            placeholder={question.placeholder}
            value={currentValue || ""}
            onChange={(event) => updateAnswer(question.id, event.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-8">
      {allQuestions.map((question, index) => (
        <div key={question.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              {index + 1}
            </span>

            <div className="flex flex-1 items-center gap-2">
              <Label className="text-sm font-semibold">
                {question.label}
                {question.required ? <span className="ml-1 text-red-500">*</span> : null}
              </Label>

              {question.custom ? (
                <button
                  type="button"
                  onClick={() => removeCustomQuestion(question.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Remove custom question"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>

          {question.description ? (
            <p className="ml-8 text-xs text-muted-foreground">{question.description}</p>
          ) : null}

          <div className="ml-8">{renderQuestion(question)}</div>
        </div>
      ))}

      <div className="ml-8 border-t pt-4">
        <CustomQuestionBuilder
          onAdd={addCustomQuestion}
          onSaveTemplate={saveTemplate}
          onLoadTemplate={loadTemplate}
          templates={templates}
          onDeleteTemplate={deleteTemplate}
        />
      </div>
    </div>
  );
}

export function BriefAttachments({ answers }) {
  const attachments = [];

  Object.entries(answers || {}).forEach(([key, value]) => {
    if (Array.isArray(value) && value[0]?.url) {
      attachments.push(...value.map((file) => ({ ...file, field: key })));
    }

    if (value?.files) {
      attachments.push(...value.files.map((file) => ({ ...file, field: key })));
    }

    if (value?.url) {
      attachments.push({ name: "URL Link", url: value.url, type: "url", field: key });
    }
  });

  if (attachments.length === 0) return null;

  return (
    <Card className="mt-6 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <FileText className="h-4 w-4 text-blue-500" />
        Attachments ({attachments.length})
      </h4>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {attachments.map((file, index) => (
          <a
            key={`${file.url || file.name}-${index}`}
            href={file.url || "#"}
            target={file.url ? "_blank" : undefined}
            rel={file.url ? "noopener noreferrer" : undefined}
            className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm transition-colors hover:bg-muted"
          >
            {file.type?.startsWith("image/") ? (
              <Image className="h-4 w-4 shrink-0 text-blue-500" />
            ) : file.type === "url" ? (
              <Link2 className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-amber-500" />
            )}

            <span className="truncate text-xs">{file.name}</span>
          </a>
        ))}
      </div>
    </Card>
  );
}

export default SmartNicheBrief;
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { 
  Upload, Link2, Image, FileText, X, Check, Palette, 
  Globe, Share2, Video, Search, Smartphone, Briefcase,
  Monitor, Instagram, Linkedin, Twitter, Youtube,
  Plus, Trash2, BookMarked, FolderOpen, GripVertical
} from "lucide-react";

// ===== TEMPLATE HELPERS =====
function getCustomTemplatesKey(userId) {
  return `gv_custom_question_templates_${userId}`;
}

function loadCustomTemplates(userId) {
  try {
    const raw = localStorage.getItem(getCustomTemplatesKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomTemplates(userId, templates) {
  localStorage.setItem(getCustomTemplatesKey(userId), JSON.stringify(templates));
}

// ===== NICHE-SPECIFIC SMART QUESTIONS =====
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
        multiple: false,
      },
      {
        id: "reference_websites",
        label: "Share 3 websites you love the look of",
        type: "url_list",
        placeholder: "https://example.com",
        description: "Paste URLs or upload screenshots",
        maxUrls: 5,
      },
      {
        id: "brand_colors",
        label: "What colors represent your brand?",
        type: "color_picker",
        description: "Pick primary colors or upload brand guidelines",
      },
      {
        id: "brand_assets",
        label: "Upload existing brand assets",
        type: "file",
        accept: ".png,.jpg,.jpeg,.pdf,.zip",
        description: "Images, fonts, style guides, brand books",
        multiple: true,
      },
      {
        id: "pages_needed",
        label: "What pages do you need?",
        type: "multi_select",
        options: ["Homepage", "About", "Services", "Portfolio", "Contact", "Blog", "Shop", "FAQ", "Testimonials", "Careers"],
      },
      {
        id: "content_ready",
        label: "Do you have content ready or need copywriting?",
        type: "toggle",
        options: ["Content is ready", "Need copywriting help"],
      },
      {
        id: "competitor_sites",
        label: "Share competitor websites you want to stand out from",
        type: "url_list",
        placeholder: "https://competitor.com",
        maxUrls: 3,
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
        options: ["Instagram", "LinkedIn", "X / Twitter", "TikTok", "Pinterest", "YouTube", "Facebook"],
        required: true,
      },
      {
        id: "best_post",
        label: "Share your current best-performing post",
        type: "mixed",
        description: "Upload image or paste link",
      },
      {
        id: "brand_voice",
        label: "What is your brand voice?",
        type: "select",
        options: ["Professional", "Casual & Friendly", "Witty & Fun", "Inspirational", "Bold & Edgy", "Luxury & Elegant"],
      },
      {
        id: "brand_guidelines",
        label: "Upload brand guidelines (if any)",
        type: "file",
        accept: ".pdf,.png,.jpg,.jpeg",
        multiple: false,
      },
      {
        id: "target_audience",
        label: "Who is your target audience?",
        type: "structured",
        fields: [
          { id: "age", label: "Age range", type: "text", placeholder: "e.g. 25-34" },
          { id: "location", label: "Location", type: "text", placeholder: "e.g. UK, USA, India" },
          { id: "interests", label: "Interests", type: "text", placeholder: "e.g. Fitness, Tech, Fashion" },
        ],
      },
      {
        id: "competitor_accounts",
        label: "Share screenshots of competitor accounts you admire",
        type: "file",
        accept: ".png,.jpg,.jpeg",
        description: "Upload screenshots or paste profile URLs",
        multiple: true,
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
        options: ["Follower growth", "Engagement rate", "Leads generated", "Sales", "Brand awareness", "Website traffic"],
      },
      {
        id: "paid_ads",
        label: "Will you run paid ads alongside organic?",
        type: "toggle",
        options: ["Yes, plan to", "No, organic only", "Not sure yet"],
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
        options: ["YouTube videos", "Instagram Reels", "TikTok", "LinkedIn videos", "Ads & Promos", "Podcasts", "Tutorials", "Corporate"],
        required: true,
      },
      {
        id: "raw_footage",
        label: "Upload raw footage or share a link",
        type: "mixed",
        description: "Google Drive, Dropbox, or direct upload",
      },
      {
        id: "reference_video",
        label: "Share a reference video with the style you want",
        type: "mixed",
        description: "YouTube link or upload reference clip",
      },
      {
        id: "platform",
        label: "What is the intended platform?",
        type: "multi_select",
        options: ["YouTube (16:9)", "Instagram Reels (9:16)", "TikTok (9:16)", "LinkedIn (1:1 or 16:9)", "Twitter/X", "Multiple platforms"],
      },
      {
        id: "logo_intro",
        label: "Do you have a logo for intro/outro?",
        type: "file",
        accept: ".png,.svg,.mp4,.mov",
        description: "Upload logo animation or static logo",
        multiple: false,
      },
      {
        id: "brand_style",
        label: "Upload your brand colors, fonts, or motion style guide",
        type: "file",
        accept: ".pdf,.png,.jpg,.zip",
        description: "Brand book, style guide, or reference images",
        multiple: true,
      },
      {
        id: "editing_style",
        label: "What editing style do you prefer?",
        type: "select",
        options: ["Fast cuts / energetic", "Cinematic / slow", "Talking head / clean", "Motion graphics heavy", "Minimal / subtle", "Match my reference video"],
      },
      {
        id: "deliverables",
        label: "What deliverables do you need?",
        type: "multi_select",
        options: ["Main video", "Short clips / teasers", "Thumbnails", "Subtitles / captions", "Sound design", "Color grading"],
      },
      {
        id: "turnaround",
        label: "What is your typical turnaround expectation?",
        type: "select",
        options: ["24 hours", "2-3 days", "1 week", "2 weeks", "Flexible"],
      },
      {
        id: "revisions",
        label: "How many revision rounds do you expect?",
        type: "select",
        options: ["1 round", "2 rounds", "3 rounds", "Unlimited", "Not sure"],
      },
    ],
  },

  "seo": {
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
        id: "analytics_screenshot",
        label: "Upload your Google Analytics or Search Console screenshot",
        type: "file",
        accept: ".png,.jpg,.jpeg",
        description: "Current traffic data helps us benchmark",
        multiple: true,
      },
      {
        id: "target_keywords",
        label: "What are your top 5 target keywords?",
        type: "structured",
        fields: [
          { id: "kw1", label: "Keyword 1", type: "text", placeholder: "e.g. web design services" },
          { id: "kw2", label: "Keyword 2", type: "text", placeholder: "e.g. freelance designer london" },
          { id: "kw3", label: "Keyword 3", type: "text", placeholder: "e.g. branding agency" },
          { id: "kw4", label: "Keyword 4", type: "text", placeholder: "Optional" },
          { id: "kw5", label: "Keyword 5", type: "text", placeholder: "Optional" },
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
        label: "Which geographic locations are most important?",
        type: "text",
        placeholder: "e.g. London, UK; New York, USA; Bangalore, India",
      },
      {
        id: "seo_tools",
        label: "Do you have any SEO tools set up?",
        type: "multi_select",
        options: ["Google Analytics", "Google Search Console", "SEMrush", "Ahrefs", "Moz", "Screaming Frog", "None yet"],
      },
      {
        id: "previous_reports",
        label: "Upload any previous SEO reports (if available)",
        type: "file",
        accept: ".pdf,.png,.jpg,.xlsx,.csv",
        description: "Helps us understand your SEO history",
        multiple: true,
      },
      {
        id: "content_capacity",
        label: "What is your monthly content publishing capacity?",
        type: "select",
        options: ["1-2 articles", "3-5 articles", "5-10 articles", "10+ articles", "Need help with content"],
      },
      {
        id: "timeline",
        label: "What is your timeline expectation for results?",
        type: "select",
        options: ["1-3 months", "3-6 months", "6-12 months", "Flexible / ongoing", "Not sure"],
      },
      {
        id: "penalty_history",
        label: "Have you been penalized or run prior SEO campaigns?",
        type: "textarea",
        placeholder: "Share results, challenges, or anything we should know...",
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
        options: ["Logo design", "Brand identity", "Social media graphics", "Packaging", "Pitch deck", "Brochure / flyer", "Illustrations", "UI/UX design"],
        required: true,
      },
      {
        id: "existing_assets",
        label: "Upload any existing brand assets",
        type: "file",
        accept: ".png,.svg,.pdf,.ai,.zip",
        description: "Old logo, colors, fonts, previous designs",
        multiple: true,
      },
      {
        id: "design_references",
        label: "Share 5 design references you love",
        type: "mixed",
        description: "Upload images or paste Pinterest board / Dribbble links",
      },
      {
        id: "design_feeling",
        label: "What feeling should the design give?",
        type: "multi_select",
        options: ["Professional", "Playful", "Luxury", "Minimal", "Bold", "Friendly", "Vintage", "Modern", "Trustworthy", "Innovative"],
      },
      {
        id: "color_preference",
        label: "Any color preferences or restrictions?",
        type: "color_picker",
        description: "Pick colors or describe your vision",
      },
      {
        id: "deliverables",
        label: "What file formats do you need on delivery?",
        type: "multi_select",
        options: ["AI / Vector", "PDF", "PNG", "SVG", "PSD", "All source files"],
      },
      {
        id: "ownership",
        label: "Will full ownership be transferred?",
        type: "toggle",
        options: ["Yes, full ownership", "License / usage rights only", "Not sure"],
      },
      {
        id: "usage",
        label: "Where will the design be used?",
        type: "multi_select",
        options: ["Print", "Digital / Web", "Social media", "Packaging", "Merchandise", "All of the above"],
      },
      {
        id: "concepts_revisions",
        label: "How many initial concepts and revisions?",
        type: "select",
        options: ["1 concept, 2 revisions", "2 concepts, 3 revisions", "3 concepts, unlimited revisions", "Not sure — advise me"],
      },
      {
        id: "deadline",
        label: "What is the project deadline?",
        type: "date",
      },
    ],
  },

  "default": {
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
        description: "Images, documents, videos, or any relevant files",
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

// ===== FILE UPLOAD COMPONENT =====
function FileUploadField({ question, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState(value || []);

  const handleFileChange = useCallback(async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `brief-attachments/${fileName}`;

        const { data, error } = await supabase.storage
          .from('gigvorx-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('gigvorx-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: publicUrl,
          path: filePath,
          type: file.type,
          size: file.size,
        });
      }

      const newFiles = [...files, ...uploadedFiles];
      setFiles(newFiles);
      onChange(newFiles);
      toast.success(`${uploadedFiles.length} file(s) uploaded`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [files, onChange]);

  const removeFile = useCallback((index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onChange(newFiles);
  }, [files, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Label 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed cursor-pointer transition-colors hover:bg-muted ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? 'Uploading...' : 'Choose files'}
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
        {question.description && (
          <span className="text-xs text-muted-foreground">{question.description}</span>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
              {file.type?.startsWith('image/') ? (
                <Image className="w-4 h-4 text-blue-500" />
              ) : (
                <FileText className="w-4 h-4 text-amber-500" />
              )}
              <span className="flex-1 truncate text-xs">{file.name}</span>
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View
              </a>
              <button
                onClick={() => removeFile(i)}
                className="p-1 hover:bg-destructive/10 rounded"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== URL LIST COMPONENT =====
function UrlListField({ question, value, onChange }) {
  const [urls, setUrls] = useState(value || ['']);

  const updateUrl = (index, url) => {
    const newUrls = [...urls];
    newUrls[index] = url;
    if (index === urls.length - 1 && url && urls.length < (question.maxUrls || 5)) {
      newUrls.push('');
    }
    setUrls(newUrls);
    onChange(newUrls.filter(u => u.trim()));
  };

  const removeUrl = (index) => {
    const newUrls = urls.filter((_, i) => i !== index);
    if (newUrls.length === 0) newUrls.push('');
    setUrls(newUrls);
    onChange(newUrls.filter(u => u.trim()));
  };

  return (
    <div className="space-y-2">
      {urls.map((url, i) => (
        <div key={i} className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            type="url"
            placeholder={question.placeholder || "https://..."}
            value={url}
            onChange={(e) => updateUrl(i, e.target.value)}
            className="flex-1"
          />
          {urls.length > 1 && url && (
            <button onClick={() => removeUrl(i)} className="p-1 hover:bg-muted rounded">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      ))}
      {question.description && (
        <p className="text-xs text-muted-foreground">{question.description}</p>
      )}
    </div>
  );
}

// ===== COLOR PICKER =====
function ColorPickerField({ value, onChange }) {
  const [colors, setColors] = useState(value || ['#3B82F6']);
  const [customColor, setCustomColor] = useState('#3B82F6');

  const addColor = () => {
    if (!colors.includes(customColor)) {
      const newColors = [...colors, customColor];
      setColors(newColors);
      onChange(newColors);
    }
  };

  const removeColor = (index) => {
    const newColors = colors.filter((_, i) => i !== index);
    setColors(newColors);
    onChange(newColors);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          className="w-10 h-10 rounded-lg border cursor-pointer"
        />
        <Input
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          placeholder="#3B82F6"
          className="w-32"
        />
        <Button type="button" size="sm" variant="outline" onClick={addColor}>
          <Palette className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, i) => (
          <div
            key={i}
            className="flex items-center gap-1 px-2 py-1 rounded-full border text-xs"
            style={{ backgroundColor: color + '20', borderColor: color + '40' }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span>{color}</span>
            <button onClick={() => removeColor(i)} className="ml-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== MULTI-SELECT =====
function MultiSelectField({ question, value, onChange }) {
  const [selected, setSelected] = useState(value || []);

  const toggle = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter(s => s !== option)
      : [...selected, option];
    setSelected(newSelected);
    onChange(newSelected);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {question.options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            selected.includes(option)
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 border'
          }`}
        >
          {selected.includes(option) && <Check className="w-3 h-3 inline mr-1" />}
          {option}
        </button>
      ))}
    </div>
  );
}

// ===== TOGGLE =====
function ToggleField({ question, value, onChange }) {
  const [selected, setSelected] = useState(value || '');

  const handleSelect = (option) => {
    setSelected(option);
    onChange(option);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {question.options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleSelect(option)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selected === option
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 border'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

// ===== BUDGET FIELD (DYNAMIC CURRENCY) =====
function BudgetField({ value, onChange, placeholder }) {
  const [amount, setAmount] = useState(value || '');
  const [currency, setCurrency] = useState('₹');

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const countryCurrency = {
          'IN': '₹', 'US': '$', 'GB': '£', 'EU': '€', 'CA': 'C$',
          'AU': 'A$', 'JP': '¥', 'CN': '¥', 'SG': 'S$', 'AE': 'AED',
          'SA': '﷼', 'BR': 'R$', 'MX': 'Mex$', 'ZA': 'R', 'NG': '₦',
          'PK': '₨', 'BD': '৳', 'LK': 'රු', 'MY': 'RM', 'TH': '฿',
          'ID': 'Rp', 'PH': '₱', 'VN': '₫', 'KR': '₩', 'RU': '₽',
        };
        setCurrency(countryCurrency[data.country_code] || '$');
      } catch {
        const lang = navigator.language || 'en-US';
        if (lang.startsWith('en-IN') || lang === 'hi') setCurrency('₹');
        else if (lang.startsWith('en-GB')) setCurrency('£');
        else if (lang.startsWith('en-EU') || lang.startsWith('de') || lang.startsWith('fr') || lang.startsWith('es')) setCurrency('€');
        else if (lang.startsWith('ja')) setCurrency('¥');
        else if (lang.startsWith('zh')) setCurrency('¥');
        else setCurrency('$');
      }
    };
    detectCurrency();
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAmount(val);
    onChange(`${currency}${val}`);
  };

  return (
    <div className="relative">
      <select
        value={currency}
        onChange={(e) => {
          setCurrency(e.target.value);
          if (amount) onChange(`${e.target.value}${amount}`);
        }}
        className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-14 text-sm bg-transparent border-0 focus:ring-0 cursor-pointer font-medium text-muted-foreground"
      >
        <option value="₹">₹</option>
        <option value="$">$</option>
        <option value="£">£</option>
        <option value="€">€</option>
        <option value="¥">¥</option>
        <option value="A$">A$</option>
        <option value="C$">C$</option>
        <option value="S$">S$</option>
        <option value="AED">AED</option>
      </select>
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder || "Enter amount"}
        value={amount}
        onChange={handleChange}
        className="pl-16"
      />
    </div>
  );
}

// ===== STRUCTURED FIELD =====
function StructuredField({ question, value, onChange }) {
  const [data, setData] = useState(value || {});

  const updateField = (fieldId, val) => {
    const newData = { ...data, [fieldId]: val };
    setData(newData);
    onChange(newData);
  };

  return (
    <div className="space-y-3">
      {question.fields.map((field) => (
        <div key={field.id}>
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={data[field.id] || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            className="mt-1"
          />
        </div>
      ))}
    </div>
  );
}

// ===== MIXED INPUT (File + URL) =====
function MixedField({ question, value, onChange }) {
  const [mode, setMode] = useState('url');
  const [url, setUrl] = useState(value?.url || '');
  const [files, setFiles] = useState(value?.files || []);

  const handleUrlChange = (newUrl) => {
    setUrl(newUrl);
    onChange({ url: newUrl, files });
  };

  const handleFilesChange = (newFiles) => {
    setFiles(newFiles);
    onChange({ url, files: newFiles });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'url' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          <Link2 className="w-3 h-3 inline mr-1" />
          Paste URL
        </button>
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'file' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          <Upload className="w-3 h-3 inline mr-1" />
          Upload File
        </button>
      </div>

      {mode === 'url' ? (
        <Input
          type="url"
          placeholder={question.placeholder || "https://..."}
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
      ) : (
        <FileUploadField
          question={{ accept: ".png,.jpg,.jpeg,.pdf,.mp4,.mov", multiple: true, description: question.description }}
          value={files}
          onChange={handleFilesChange}
        />
      )}
    </div>
  );
}

// ===== CUSTOM QUESTION BUILDER =====
function CustomQuestionBuilder({ onAdd, onSaveTemplate, onLoadTemplate, templates, onDeleteTemplate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');
  const [options, setOptions] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [required, setRequired] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleAdd = () => {
    if (!label.trim()) {
      toast.error("Please enter a question label");
      return;
    }

    const question = {
      id: `custom_${Date.now()}`,
      label: label.trim(),
      type,
      placeholder: placeholder.trim() || undefined,
      required,
      custom: true,
    };

    if (type === 'multi_select' || type === 'select' || type === 'toggle') {
      const opts = options.split(',').map(o => o.trim()).filter(Boolean);
      if (opts.length === 0) {
        toast.error("Please enter at least one option (comma-separated)");
        return;
      }
      question.options = opts;
    }

    onAdd(question);
    setLabel('');
    setOptions('');
    setPlaceholder('');
    setRequired(false);
    setIsOpen(false);
    toast.success("Custom question added");
  };

  const handleSaveTemplate = () => {
    if (!label.trim()) {
      toast.error("Please enter a question label first");
      return;
    }
    onSaveTemplate(label.trim(), type, options, placeholder, required);
    toast.success("Template saved");
  };

  return (
    <div className="space-y-3">
      {!isOpen ? (
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="border-dashed border-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add custom question
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Saved templates
            {templates.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">{templates.length}</Badge>
            )}
          </Button>
        </div>
      ) : (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Add Custom Question</h4>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Question text</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. What is your preferred communication method?"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Answer type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="text">Short text</option>
              <option value="textarea">Long text</option>
              <option value="select">Single select (dropdown)</option>
              <option value="multi_select">Multi select</option>
              <option value="toggle">Toggle (one option)</option>
              <option value="url">URL</option>
              <option value="date">Date</option>
              <option value="file">File upload</option>
            </select>
          </div>

          {(type === 'select' || type === 'multi_select' || type === 'toggle') && (
            <div className="space-y-2">
              <Label className="text-xs">Options (comma-separated)</Label>
              <Input
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="e.g. Email, Phone, WhatsApp, Video call"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Placeholder (optional)</Label>
            <Input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="e.g. Enter your answer here..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Required question</span>
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="button" size="sm" onClick={handleAdd} className="bg-blue-600 text-white">
              <Plus className="w-3 h-3 mr-1" />
              Add question
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleSaveTemplate}>
              <BookMarked className="w-3 h-3 mr-1" />
              Save as template
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {showTemplates && templates.length > 0 && (
        <Card className="p-4 space-y-2">
          <h4 className="font-semibold text-sm mb-2">Saved Question Templates</h4>
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.label}</p>
                <p className="text-xs text-muted-foreground">Type: {t.type}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { onLoadTemplate(t); setShowTemplates(false); }}
                >
                  Use
                </Button>
                <button
                  onClick={() => onDeleteTemplate(t.id)}
                  className="p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ===== MAIN COMPONENT =====
export function SmartNicheBrief({ nicheSlug, questions, onQuestionsChange, userId }) {
  const nicheConfig = NICHE_QUESTIONS[nicheSlug] || NICHE_QUESTIONS["default"];
  const [answers, setAnswers] = useState({});
  const [customQuestions, setCustomQuestions] = useState([]);
  const [templates, setTemplates] = useState(() => loadCustomTemplates(userId));

  const allQuestions = [...nicheConfig.questions, ...customQuestions];

  const updateAnswer = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    
    const updatedQuestions = allQuestions.map(q => ({
      id: q.id,
      q: q.label,
      a: newAnswers[q.id] || '',
      custom: q.custom || false,
    }));
    onQuestionsChange(updatedQuestions);
  };

  const addCustomQuestion = (question) => {
    setCustomQuestions([...customQuestions, question]);
  };

  const saveTemplate = (label, type, options, placeholder, required) => {
    const template = {
      id: `template_${Date.now()}`,
      label,
      type,
      options: options.split(',').map(o => o.trim()).filter(Boolean),
      placeholder: placeholder.trim() || undefined,
      required,
      createdAt: new Date().toISOString(),
    };
    const updated = [...templates, template];
    setTemplates(updated);
    saveCustomTemplates(userId, updated);
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
    setCustomQuestions([...customQuestions, question]);
    toast.success(`Added "${template.label}" from template`);
  };

  const deleteTemplate = (templateId) => {
    const updated = templates.filter(t => t.id !== templateId);
    setTemplates(updated);
    saveCustomTemplates(userId, updated);
    toast.success("Template deleted");
  };

  const removeCustomQuestion = (questionId) => {
    setCustomQuestions(customQuestions.filter(q => q.id !== questionId));
    const newAnswers = { ...answers };
    delete newAnswers[questionId];
    setAnswers(newAnswers);
  };

  const renderQuestion = (question) => {
    const currentValue = answers[question.id];

    switch (question.type) {
      case 'text':
        return (
          <Input
            placeholder={question.placeholder}
            value={currentValue || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
          />
        );
      case 'textarea':
        return (
          <Textarea
            placeholder={question.placeholder}
            value={currentValue || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            rows={4}
          />
        );
      case 'file':
        return (
          <FileUploadField
            question={question}
            value={currentValue}
            onChange={(files) => updateAnswer(question.id, files)}
          />
        );
      case 'url':
        return (
          <Input
            type="url"
            placeholder={question.placeholder}
            value={currentValue || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
          />
        );
      case 'url_list':
        return (
          <UrlListField
            question={question}
            value={currentValue}
            onChange={(urls) => updateAnswer(question.id, urls)}
          />
        );
      case 'color_picker':
        return (
          <ColorPickerField
            value={currentValue}
            onChange={(colors) => updateAnswer(question.id, colors)}
          />
        );
      case 'multi_select':
        return (
          <MultiSelectField
            question={question}
            value={currentValue}
            onChange={(selected) => updateAnswer(question.id, selected)}
          />
        );
      case 'toggle':
        return (
          <ToggleField
            question={question}
            value={currentValue}
            onChange={(val) => updateAnswer(question.id, val)}
          />
        );
      case 'select':
        return (
          <select
            value={currentValue || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select an option</option>
            {question.options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={currentValue || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            className="w-full"
          />
        );
      case 'budget':
        return (
          <BudgetField
            value={currentValue}
            onChange={(val) => updateAnswer(question.id, val)}
            placeholder={question.placeholder}
          />
        );
      case 'structured':
        return (
          <StructuredField
            question={question}
            value={currentValue}
            onChange={(data) => updateAnswer(question.id, data)}
          />
        );
      case 'mixed':
        return (
          <MixedField
            question={question}
            value={currentValue}
            onChange={(data) => updateAnswer(question.id, data)}
          />
        );
      default:
        return (
          <Input
            placeholder={question.placeholder}
            value={currentValue || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-8">
      {allQuestions.map((question, index) => (
        <div key={question.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <Label className="text-sm font-semibold">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {question.custom && (
                <button
                  onClick={() => removeCustomQuestion(question.id)}
                  className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                  title="Remove custom question"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {question.description && (
            <p className="text-xs text-muted-foreground ml-8">{question.description}</p>
          )}
          <div className="ml-8">
            {renderQuestion(question)}
          </div>
        </div>
      ))}

      <div className="ml-8 pt-4 border-t">
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

// ===== ATTACHMENTS DISPLAY =====
export function BriefAttachments({ answers }) {
  const attachments = [];

  Object.entries(answers || {}).forEach(([key, value]) => {
    if (Array.isArray(value) && value[0]?.url) {
      attachments.push(...value.map(f => ({ ...f, field: key })));
    }
    if (value?.files) {
      attachments.push(...value.files.map(f => ({ ...f, field: key })));
    }
    if (value?.url) {
      attachments.push({ name: 'URL Link', url: value.url, type: 'url', field: key });
    }
  });

  if (attachments.length === 0) return null;

  return (
    <Card className="p-4 mt-6">
      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-500" />
        Attachments ({attachments.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((file, i) => (
          <a
            key={i}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
          >
            {file.type?.startsWith('image/') ? (
              <Image className="w-4 h-4 text-blue-500 shrink-0" />
            ) : file.type === 'url' ? (
              <Link2 className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate text-xs">{file.name}</span>
          </a>
        ))}
      </div>
    </Card>
  );
}

export default SmartNicheBrief;
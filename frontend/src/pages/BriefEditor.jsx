import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBriefDialog } from "@/components/ShareBriefDialog";
import {
  Save, Download, Link2, MessageCircle, Plus, X, ChevronDown,
  Type, FileText, List, Upload, Image, Link, Video, CheckCircle2,
  Loader2, Phone, Mail, Globe, AtSign, User
} from "lucide-react";
import { jsPDF } from "jspdf";

const questionTypeIcons = {
  text: Type, long: FileText, select: List,
  file: Upload, image: Image, link: Link, video: Video,
};

const questionTypeLabels = {
  text: "Short Answer", long: "Long Answer", select: "Multiple Choice",
  file: "File Upload", image: "Image Upload", link: "URL / Link", video: "Video Link",
};

const questionTypeColors = {
  text: "bg-blue-100 text-blue-700 border-blue-200",
  long: "bg-indigo-100 text-indigo-700 border-indigo-200",
  select: "bg-purple-100 text-purple-700 border-purple-200",
  file: "bg-orange-100 text-orange-700 border-orange-200",
  image: "bg-pink-100 text-pink-700 border-pink-200",
  link: "bg-teal-100 text-teal-700 border-teal-200",
  video: "bg-red-100 text-red-700 border-red-200",
};

const nicheTemplates = {
  "Web Design": [
    { text: "What is your business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What is your website URL (if existing)?", type: "link" },
    { text: "What are your social media handles? (Instagram, Facebook, Twitter etc.)", type: "long" },
    { text: "Describe your business in a few sentences", type: "long" },
    { text: "Do you have an existing website?", type: "select", options: ["Yes, I need a redesign", "No, this is my first website", "I have a landing page only"] },
    { text: "Share reference websites you like", type: "link" },
    { text: "Upload your logo and brand assets", type: "image" },
    { text: "Upload any brand guidelines (PDF)", type: "file" },
    { text: "What pages do you need?", type: "select", options: ["Home, About, Contact", "Home, About, Services, Contact", "Full e-commerce site", "Custom - I will specify below"] },
    { text: "What is your budget range?", type: "select", options: ["Under Rs.25,000 / $300", "Rs.25,000 - Rs.75,000 / $300-$900", "Rs.75,000 - Rs.2,00,000 / $900-$2,400", "Above Rs.2,00,000 / $2,400+"] },
    { text: "Do you have any content ready?", type: "select", options: ["All content is ready", "I have partial content", "I need content writing too"] },
    { text: "Share any video references for style", type: "video" },
    { text: "When do you need this completed?", type: "text" },
  ],
  "Social Media": [
    { text: "What is your brand/business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What are your current social media handles?", type: "long" },
    { text: "Which platforms do you need content for?", type: "select", options: ["Instagram only", "Instagram + Facebook", "All major platforms", "YouTube Shorts + Reels"] },
    { text: "Describe your target audience", type: "long" },
    { text: "What is your content goal?", type: "select", options: ["Brand awareness", "Lead generation", "Sales/conversions", "Community building"] },
    { text: "Upload your brand logo and colors", type: "image" },
    { text: "Share competitor or inspiration accounts", type: "link" },
    { text: "Upload existing content or references", type: "file" },
    { text: "How many posts per week?", type: "select", options: ["3 posts/week", "5 posts/week", "Daily posts", "Custom schedule"] },
    { text: "Do you need caption writing too?", type: "select", options: ["Yes, include captions", "No, I will provide captions", "I need hashtag research only"] },
    { text: "What is your monthly budget?", type: "select", options: ["Under Rs.10,000 / $120", "Rs.10,000 - Rs.30,000 / $120-$360", "Rs.30,000 - Rs.75,000 / $360-$900", "Above Rs.75,000 / $900+"] },
    { text: "Share any video content references", type: "video" },
  ],
  "Graphic Design": [
    { text: "What is your business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What type of design do you need?", type: "select", options: ["Logo design", "Brand identity kit", "Marketing materials", "Social media graphics", "Packaging design"] },
    { text: "Describe your brand personality", type: "long" },
    { text: "Upload your current logo (if any)", type: "image" },
    { text: "Share design references you like", type: "link" },
    { text: "Upload brand guidelines or inspiration files", type: "file" },
    { text: "What is your preferred color palette?", type: "text" },
    { text: "Do you need print-ready files?", type: "select", options: ["Yes, print-ready PDF/AI", "Digital only (PNG/JPG)", "Both"] },
    { text: "What is your budget?", type: "select", options: ["Under Rs.5,000 / $60", "Rs.5,000 - Rs.20,000 / $60-$240", "Rs.20,000 - Rs.50,000 / $240-$600", "Above Rs.50,000 / $600+"] },
    { text: "How many design concepts do you want?", type: "select", options: ["1 concept", "2-3 concepts", "3-5 concepts", "Unlimited revisions"] },
    { text: "Share any video mood boards", type: "video" },
  ],
  "Video Editing": [
    { text: "What is your name or brand name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What type of video do you need edited?", type: "select", options: ["YouTube video", "Instagram Reel", "TikTok", "Corporate video", "Wedding/event video", "Ad/commercial"] },
    { text: "What is the approximate duration?", type: "text" },
    { text: "Upload your raw footage", type: "file" },
    { text: "Share reference videos for style", type: "video" },
    { text: "Describe the desired editing style", type: "long" },
    { text: "Do you need color grading?", type: "select", options: ["Yes, cinematic color grade", "Basic color correction", "No, keep it natural"] },
    { text: "Do you need motion graphics or titles?", type: "select", options: ["Full motion graphics package", "Simple titles only", "No graphics needed"] },
    { text: "Upload your logo for intro/outro", type: "image" },
    { text: "Share music or audio references", type: "link" },
    { text: "What is your budget?", type: "select", options: ["Under Rs.5,000 / $60", "Rs.5,000 - Rs.15,000 / $60-$180", "Rs.15,000 - Rs.50,000 / $180-$600", "Above Rs.50,000 / $600+"] },
    { text: "What is your deadline?", type: "text" },
  ],
  "SEO": [
    { text: "What is your business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What is your website URL?", type: "link" },
    { text: "What industry are you in?", type: "text" },
    { text: "What are your target keywords?", type: "long" },
    { text: "Who are your main competitors?", type: "text" },
    { text: "Upload your current analytics report", type: "file" },
    { text: "What is your current monthly traffic?", type: "select", options: ["Under 1,000 visitors", "1,000 - 10,000", "10,000 - 50,000", "50,000+"] },
    { text: "What SEO services do you need?", type: "select", options: ["On-page SEO only", "Off-page / link building", "Technical SEO audit", "Full SEO package"] },
    { text: "Do you have a blog/content strategy?", type: "select", options: ["Yes, active blog", "Yes, but inactive", "No blog yet", "Need content strategy too"] },
    { text: "What is your monthly SEO budget?", type: "select", options: ["Under Rs.15,000 / $180", "Rs.15,000 - Rs.50,000 / $180-$600", "Rs.50,000 - Rs.1,50,000 / $600-$1,800", "Above Rs.1,50,000 / $1,800+"] },
    { text: "Share any video tutorials or references", type: "video" },
  ],
  "Content Writing": [
    { text: "What is your name or business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What type of content do you need?", type: "select", options: ["Blog articles", "Website copy", "Product descriptions", "Email sequences", "Social media captions", "Technical documentation"] },
    { text: "Describe your target audience", type: "long" },
    { text: "What is the tone of voice?", type: "select", options: ["Professional/formal", "Casual/friendly", "Witty/humorous", "Authoritative/expert", "Sales-driven"] },
    { text: "Share reference articles or style guides", type: "link" },
    { text: "Upload any existing content briefs", type: "file" },
    { text: "How many words per piece?", type: "select", options: ["500-1,000 words", "1,000-2,000 words", "2,000-3,000 words", "3,000+ words"] },
    { text: "Do you need keyword research included?", type: "select", options: ["Yes, include keywords", "No, I will provide keywords", "I need full SEO strategy"] },
    { text: "What is your budget per article?", type: "select", options: ["Under Rs.1,000 / $12", "Rs.1,000 - Rs.3,000 / $12-$36", "Rs.3,000 - Rs.7,000 / $36-$84", "Above Rs.7,000 / $84+"] },
    { text: "How many pieces do you need?", type: "text" },
  ],
  "UI/UX Design": [
    { text: "What is your name or business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What type of product are you designing for?", type: "select", options: ["Mobile app", "Web app", "SaaS dashboard", "E-commerce", "Landing page"] },
    { text: "Describe your target users", type: "long" },
    { text: "Do you have existing designs?", type: "select", options: ["Yes, need a redesign", "No, starting from scratch", "I have wireframes only"] },
    { text: "Upload your current designs or wireframes", type: "image" },
    { text: "Share competitor products or references", type: "link" },
    { text: "Upload user research or persona docs", type: "file" },
    { text: "What deliverables do you need?", type: "select", options: ["UI design only", "UX research + UI design", "Full prototype + design system", "Design system only"] },
    { text: "What is your budget?", type: "select", options: ["Under Rs.30,000 / $360", "Rs.30,000 - Rs.1,00,000 / $360-$1,200", "Rs.1,00,000 - Rs.3,00,000 / $1,200-$3,600", "Above Rs.3,00,000 / $3,600+"] },
    { text: "What is your timeline?", type: "text" },
  ],
  "Logo Design": [
    { text: "What is your business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What does your business do?", type: "long" },
    { text: "Who is your target audience?", type: "text" },
    { text: "What style do you prefer?", type: "select", options: ["Minimalist/modern", "Vintage/classic", "Playful/fun", "Luxury/elegant", "Tech/futuristic", "Hand-drawn/artistic"] },
    { text: "Upload any existing branding", type: "image" },
    { text: "Share logo references you like", type: "link" },
    { text: "What colors do you prefer?", type: "text" },
    { text: "Do you need additional brand assets?", type: "select", options: ["Logo only", "Logo + business card", "Full brand identity kit", "Logo + social media kit"] },
    { text: "What is your budget?", type: "select", options: ["Under Rs.3,000 / $36", "Rs.3,000 - Rs.10,000 / $36-$120", "Rs.10,000 - Rs.30,000 / $120-$360", "Above Rs.30,000 / $360+"] },
    { text: "How many concepts do you want?", type: "select", options: ["1 concept", "2-3 concepts", "3-5 concepts"] },
    { text: "Upload any inspiration images", type: "image" },
  ],
  "App Development": [
    { text: "What is your name or business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What type of app do you need?", type: "select", options: ["iOS app", "Android app", "Cross-platform (Flutter/React Native)", "Progressive Web App", "SaaS platform"] },
    { text: "Describe the core functionality", type: "long" },
    { text: "Do you have wireframes or designs?", type: "select", options: ["Yes, designs are ready", "I have rough wireframes", "No, I need design too", "I need full UX/UI + dev"] },
    { text: "Upload your designs or wireframes", type: "image" },
    { text: "Share similar apps or references", type: "link" },
    { text: "Upload technical specs or API docs", type: "file" },
    { text: "Do you need backend development too?", type: "select", options: ["Yes, full-stack needed", "Frontend only", "Backend only", "API integration only"] },
    { text: "What is your budget range?", type: "select", options: ["Under Rs.1,00,000 / $1,200", "Rs.1,00,000 - Rs.5,00,000 / $1,200-$6,000", "Rs.5,00,000 - Rs.20,00,000 / $6,000-$24,000", "Above Rs.20,00,000 / $24,000+"] },
    { text: "What is your launch timeline?", type: "text" },
  ],
  "Photography": [
    { text: "What is your name or brand name?", type: "text" },
    { text: "What is your email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What type of photography do you need?", type: "select", options: ["Product photography", "Portrait/headshots", "Event coverage", "Real estate", "Food photography", "Fashion/lifestyle"] },
    { text: "Describe the shoot requirements", type: "long" },
    { text: "How many final images do you need?", type: "text" },
    { text: "Upload reference photos or mood board", type: "image" },
    { text: "Share reference photography styles", type: "link" },
    { text: "Do you need editing/retouching included?", type: "select", options: ["Yes, full editing included", "Basic color correction only", "Raw files only, no editing"] },
    { text: "What is your budget?", type: "select", options: ["Under Rs.5,000 / $60", "Rs.5,000 - Rs.20,000 / $60-$240", "Rs.20,000 - Rs.75,000 / $240-$900", "Above Rs.75,000 / $900+"] },
    { text: "What is the shoot location and date?", type: "text" },
  ],
  "Illustration": [
    { text: "What is your name or brand name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What type of illustration do you need?", type: "select", options: ["Digital illustration", "Vector art", "Character design", "Book illustration", "Infographic", "Custom icon set"] },
    { text: "Describe the illustration concept", type: "long" },
    { text: "What art style do you prefer?", type: "select", options: ["Flat/minimalist", "Detailed/realistic", "Cartoon/playful", "Watercolor/artistic", "3D/rendered", "Line art"] },
    { text: "Upload reference images or sketches", type: "image" },
    { text: "Share art style references", type: "link" },
    { text: "What is the intended use?", type: "select", options: ["Website", "Print/marketing", "Social media", "Book/publication", "Merchandise", "App/UI"] },
    { text: "What is your budget?", type: "select", options: ["Under Rs.3,000 / $36", "Rs.3,000 - Rs.10,000 / $36-$120", "Rs.10,000 - Rs.30,000 / $120-$360", "Above Rs.30,000 / $360+"] },
    { text: "How many illustrations do you need?", type: "text" },
  ],
  "Branding": [
    { text: "What is your business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What are your social media handles?", type: "long" },
    { text: "What industry are you in?", type: "text" },
    { text: "Describe your brand vision and values", type: "long" },
    { text: "Do you have an existing brand?", type: "select", options: ["Complete rebrand needed", "Refresh existing brand", "New brand from scratch"] },
    { text: "Upload your current logo and assets", type: "image" },
    { text: "Share brand references you admire", type: "link" },
    { text: "What deliverables do you need?", type: "select", options: ["Logo only", "Logo + color palette + fonts", "Full brand identity kit", "Brand identity + brand guidelines book"] },
    { text: "What is your budget?", type: "select", options: ["Under Rs.15,000 / $180", "Rs.15,000 - Rs.50,000 / $180-$600", "Rs.50,000 - Rs.1,50,000 / $600-$1,800", "Above Rs.1,50,000 / $1,800+"] },
    { text: "What is your timeline?", type: "text" },
  ],
  "Marketing Strategy": [
    { text: "What is your business name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What is your website URL?", type: "link" },
    { text: "What are your social media handles?", type: "long" },
    { text: "What industry/market are you in?", type: "text" },
    { text: "Describe your current marketing efforts", type: "long" },
    { text: "What are your marketing goals?", type: "select", options: ["Increase brand awareness", "Generate leads", "Drive sales", "Launch a new product", "Enter a new market"] },
    { text: "What channels do you currently use?", type: "select", options: ["Social media only", "Email + social", "SEO + content", "Paid ads only", "Multi-channel"] },
    { text: "What is your monthly marketing budget?", type: "select", options: ["Under Rs.25,000 / $300", "Rs.25,000 - Rs.75,000 / $300-$900", "Rs.75,000 - Rs.2,00,000 / $900-$2,400", "Above Rs.2,00,000 / $2,400+"] },
    { text: "Do you need content creation too?", type: "select", options: ["Yes, strategy + content", "Strategy only", "Content only", "I have a content team"] },
    { text: "Upload any analytics or performance reports", type: "file" },
  ],
  "E-commerce": [
    { text: "What is your store name?", type: "text" },
    { text: "What is your business email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What is your store website URL (if existing)?", type: "link" },
    { text: "What are your social media handles?", type: "long" },
    { text: "What products do you sell?", type: "long" },
    { text: "What platform do you use?", type: "select", options: ["Shopify", "WooCommerce", "Magento", "Custom build", "Not set up yet"] },
    { text: "Upload your product photos", type: "image" },
    { text: "Share competitor stores you like", type: "link" },
    { text: "What services do you need?", type: "select", options: ["Store setup only", "Store + product listing optimization", "Full store + marketing", "Dropshipping setup"] },
    { text: "How many products do you have?", type: "select", options: ["1-10 products", "10-50 products", "50-200 products", "200+ products"] },
    { text: "Do you need payment gateway setup?", type: "select", options: ["Yes, Razorpay/Stripe", "Yes, PayPal", "Already configured", "Need recommendations"] },
    { text: "What is your budget?", type: "select", options: ["Under Rs.25,000 / $300", "Rs.25,000 - Rs.75,000 / $300-$900", "Rs.75,000 - Rs.2,00,000 / $900-$2,400", "Above Rs.2,00,000 / $2,400+"] },
    { text: "What is your target launch date?", type: "text" },
  ],
  "Custom": [
    { text: "What is your name or business name?", type: "text" },
    { text: "What is your email address?", type: "text" },
    { text: "What is your contact number?", type: "text" },
    { text: "What are your social media handles?", type: "long" },
    { text: "What is your project name?", type: "text" },
    { text: "Describe your project in detail", type: "long" },
    { text: "What type of deliverables do you need?", type: "text" },
    { text: "Upload any reference materials", type: "file" },
    { text: "Share reference links", type: "link" },
    { text: "Upload images or screenshots", type: "image" },
    { text: "What is your budget range?", type: "text" },
    { text: "What is your timeline?", type: "text" },
  ],
};

export default function BriefEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { toast } = useToast();

  const editing = id && id !== "new";

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [status, setStatus] = useState("draft");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefData, setBriefData] = useState(null);
  const [fillMode, setFillMode] = useState("freelancer");

  useEffect(() => {
    if (user?.id) {
      const key = `gigvorx_templates_${user.id}`;
      try {
        const stored = localStorage.getItem(key);
        if (stored) setSavedTemplates(JSON.parse(stored));
      } catch {}
    }
  }, [user]);

  useEffect(() => {
    if (editing && user?.id) loadBrief();
  }, [id, user]);

  const loadBrief = async () => {
    setLoadingBrief(true);
    try {
      const { data, error } = await supabase
        .from("briefs")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        toast({ title: "Brief not found", variant: "destructive" });
        navigate("/briefs");
        return;
      }
      setClientName(data.clientName || "");
      setClientEmail(data.clientEmail || "");
      setClientPhone(data.clientPhone || "");
      setProjectTitle(data.projectTitle || "");
      setDescription(data.description || "");
      setBudget(data.budget || "");
      setTimeline(data.timeline || "");
      setStatus(data.status || "draft");
      setQuestions(data.questions || []);
      setAnswers(data.answers || {});
      setConfirmed(data.confirmed || false);
      setBriefData(data);
    } catch (err) {
      toast({ title: "Error loading brief", variant: "destructive" });
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleSave = async () => {
    if (!projectTitle.trim()) {
      toast({ title: "Project title is required", variant: "destructive" });
      return;
    }
    if (!clientName.trim()) {
      toast({ title: "Client name is required", variant: "destructive" });
      return;
    }
    if (!confirmed) {
      toast({ title: "Please confirm the information is accurate", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim(),
      projectTitle: projectTitle.trim(),
      description: description.trim(),
      budget: budget.trim(),
      timeline: timeline.trim(),
      status,
      questions: questions.map(q => ({ ...q, id: q.id || crypto.randomUUID() })),
      answers,
      confirmed,
      currency,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (editing) {
        const { error } = await supabase
          .from("briefs")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        toast({ title: "Brief updated successfully" });
        await loadBrief();
      } else {
        const { data: newBrief, error } = await supabase
          .from("briefs")
          .insert({
            ...payload,
            createdAt: new Date().toISOString(),
            share_token: crypto.randomUUID(),
            share_enabled: true,
          })
          .select()
          .single();
        if (error) throw error;
        toast({ title: "Brief created successfully" });
        navigate(`/briefs/${newBrief.id}`);
      }
    } catch (err) {
      toast({ title: "Error saving brief", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleAddQuestion = (type) => {
    const newQuestion = {
      id: crypto.randomUUID(),
      text: "",
      type,
      options: type === "select" ? ["Option 1", "Option 2"] : undefined,
      required: false,
    };
    setQuestions([...questions, newQuestion]);
    setAddQuestionDialogOpen(false);
  };

  const handleUpdateQuestion = (index, updates) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleMoveQuestion = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === questions.length - 1)) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[index + direction];
    updated[index + direction] = temp;
    setQuestions(updated);
  };

  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options = [...(updated[qIndex].options || []), `Option ${(updated[qIndex].options || []).length + 1}`];
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleDeleteOption = (qIndex, oIndex) => {
    const updated = [...questions];
    updated[qIndex].options.splice(oIndex, 1);
    setQuestions(updated);
  };

  const handleSaveTemplate = () => {
    if (!user?.id) return;
    const key = `gigvorx_templates_${user.id}`;
    const template = {
      id: crypto.randomUUID(),
      name: `${projectTitle || "Untitled"} Template`,
      questions: [...questions],
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedTemplates, template];
    localStorage.setItem(key, JSON.stringify(updated));
    setSavedTemplates(updated);
    toast({ title: "Template saved" });
  };

  const handleLoadTemplate = (template) => {
    setQuestions([...template.questions.map(q => ({ ...q, id: crypto.randomUUID() }))]);
    toast({ title: `Loaded ${template.name}` });
  };

  const handleDeleteTemplate = (templateId) => {
    const updated = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updated);
    if (user?.id) localStorage.setItem(`gigvorx_templates_${user.id}`, JSON.stringify(updated));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(projectTitle || "Project Brief", 20, 20);
    doc.setFontSize(12);
    doc.text(`Client: ${clientName}`, 20, 35);
    doc.text(`Email: ${clientEmail}`, 20, 42);
    doc.text(`Phone: ${clientPhone}`, 20, 49);
    doc.text(`Status: ${status.toUpperCase()}`, 20, 56);
    doc.text(`Budget: ${budget}`, 20, 63);
    doc.text(`Timeline: ${timeline}`, 20, 70);
    doc.setFontSize(14);
    doc.text("Description:", 20, 82);
    doc.setFontSize(11);
    const descLines = doc.splitTextToSize(description || "No description provided.", 170);
    doc.text(descLines, 20, 89);
    let y = 89 + descLines.length * 5 + 10;
    doc.setFontSize(14);
    doc.text("Questions & Answers:", 20, y);
    y += 8;
    doc.setFontSize(11);
    questions.forEach((q, i) => {
      const qText = `${i + 1}. [${questionTypeLabels[q.type] || q.type}] ${q.text}`;
      const qLines = doc.splitTextToSize(qText, 170);
      if (y + qLines.length * 5 > 280) { doc.addPage(); y = 20; }
      doc.text(qLines, 20, y);
      y += qLines.length * 5 + 2;
      if (answers[q.id]) {
        const aLines = doc.splitTextToSize(`Answer: ${answers[q.id]}`, 165);
        doc.setTextColor(100, 100, 100);
        doc.text(aLines, 25, y);
        doc.setTextColor(0, 0, 0);
        y += aLines.length * 5 + 2;
      }
      if (q.options) {
        q.options.forEach((opt, j) => {
          const optLines = doc.splitTextToSize(`   ${String.fromCharCode(97 + j)}) ${opt}`, 160);
          if (y + optLines.length * 5 > 280) { doc.addPage(); y = 20; }
          doc.text(optLines, 20, y);
          y += optLines.length * 5 + 2;
        });
      }
      y += 3;
    });
    doc.save(`${projectTitle || "brief"}_gigvorx.pdf`);
    toast({ title: "PDF downloaded" });
  };

  const handleShareWhatsApp = () => {
    if (!editing) {
      toast({ title: "Please save the brief first before sharing", variant: "destructive" });
      return;
    }
    const intakeLink = briefData?.share_token
      ? `${window.location.origin}/#/intake/${briefData.share_token}`
      : "";
    if (!intakeLink) {
      toast({ title: "Please enable sharing from the Share button first", variant: "destructive" });
      return;
    }
    const text = `Hi ${clientName},\n\nI have prepared a project brief for *${projectTitle}* on GigVorx.\n\nPlease fill in your details using this link:\n${intakeLink}\n\nIt will only take a few minutes. Let me know if you have any questions!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleNicheSelect = (niche) => {
    const template = nicheTemplates[niche];
    if (template) {
      setQuestions(template.map(q => ({ ...q, id: crypto.randomUUID() })));
      toast({ title: `Loaded ${niche} template with ${template.length} questions` });
    }
  };

  if (loadingBrief) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <div className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/briefs")} className="text-white/60 hover:text-white hover:bg-white/5">Back</Button>
            <h1 className="text-xl font-bold text-white">{editing ? "Edit Brief" : "New Brief"}</h1>
            <Badge variant="outline" className={status === "approved" ? "border-green-500 text-green-400" : status === "sent" ? "border-blue-500 text-blue-400" : "border-yellow-500 text-yellow-400"}>
              {status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {editing && (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="border-white/10 text-white hover:bg-white/5">
                <Link2 className="w-4 h-4 mr-1.5" />Share
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="border-white/10 text-white hover:bg-white/5">
              <Download className="w-4 h-4 mr-1.5" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="border-white/10 text-white hover:bg-white/5">
              <MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-1.5" />{editing ? "Update" : "Save"}</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="details" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">Details</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">Questions ({questions.length})</TabsTrigger>
            <TabsTrigger value="fill" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">Fill Answers</TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">Templates</TabsTrigger>
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="space-y-6">
            <Card className="bg-[#111] border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#FF6B00]" />Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Project Title *</Label>
                    <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="e.g., E-commerce Website Redesign" className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="bg-[#1a1a1a] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="draft" className="text-white">Draft</SelectItem>
                        <SelectItem value="sent" className="text-white">Sent</SelectItem>
                        <SelectItem value="approved" className="text-white">Approved</SelectItem>
                        <SelectItem value="completed" className="text-white">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border border-white/10 rounded-xl p-4 space-y-4">
                  <h3 className="text-white/80 text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-[#FF6B00]" />Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/80">Client Name *</Label>
                      <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g., Rahul Sharma" className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80 flex items-center gap-1"><Mail className="w-3 h-3" />Client Email</Label>
                      <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80 flex items-center gap-1"><Phone className="w-3 h-3" />Client Phone</Label>
                      <Input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+91 98765 43210" className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Project Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the project scope, goals, and any specific requirements..." rows={4} className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Budget ({currency})</Label>
                    <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={`e.g., 50,000 ${currency === "INR" ? "Rs." : "$"}`} className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Timeline</Label>
                    <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g., 2 weeks, by Dec 31" className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#111] border-white/10">
              <CardContent className="pt-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${confirmed ? "bg-[#FF6B00] border-[#FF6B00]" : "border-white/30 group-hover:border-white/50"}`} onClick={() => setConfirmed(!confirmed)}>
                    {confirmed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-sm text-white/70">I confirm all the information provided is accurate and complete.</span>
                </label>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QUESTIONS TAB */}
          <TabsContent value="questions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Client Questions</h2>
                <p className="text-sm text-white/50">Add questions to collect specific information from your client</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={addQuestionDialogOpen} onOpenChange={setAddQuestionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
                      <Plus className="w-4 h-4 mr-1.5" />Add Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">Choose Question Type</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {Object.entries(questionTypeLabels).map(([type, label]) => {
                        const Icon = questionTypeIcons[type];
                        return (
                          <button key={type} type="button" onClick={() => handleAddQuestion(type)} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B00]/50 transition-all text-left">
                            <div className={`p-2 rounded-lg ${questionTypeColors[type]}`}><Icon className="w-4 h-4" /></div>
                            <div>
                              <div className="text-white font-medium text-sm">{label}</div>
                              <div className="text-white/40 text-xs">
                                {type === "text" && "Single line text answer"}
                                {type === "long" && "Multi-line detailed answer"}
                                {type === "select" && "Client picks one option"}
                                {type === "file" && "Upload PDF, DOC, ZIP files"}
                                {type === "image" && "Upload PNG, JPG, GIF images"}
                                {type === "link" && "Share a URL or web link"}
                                {type === "video" && "Share a video URL"}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                      <Save className="w-4 h-4 mr-1.5" />Templates
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#111] border-white/10 text-white max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-white">Question Templates</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Button onClick={handleSaveTemplate} className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
                        <Save className="w-4 h-4 mr-1.5" />Save Current Questions as Template
                      </Button>
                      {savedTemplates.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-white/70">Saved Templates</h4>
                          {savedTemplates.map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                              <div>
                                <div className="text-white text-sm font-medium">{t.name}</div>
                                <div className="text-white/40 text-xs">{t.questions.length} questions</div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => handleLoadTemplate(t)} className="text-[#FF6B00] hover:bg-[#FF6B00]/10">Load</Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(t.id)} className="text-red-400 hover:bg-red-500/10"><X className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/40 text-sm text-center py-4">No saved templates yet</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-3">
              {questions.length === 0 && (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                  <p className="text-white/40 text-sm">No questions yet. Click "Add Question" to get started.</p>
                  <p className="text-white/20 text-xs mt-1">Or use a niche template from the Templates tab</p>
                </div>
              )}
              {questions.map((q, index) => {
                const Icon = questionTypeIcons[q.type] || Type;
                return (
                  <div key={q.id} className="bg-[#111] border border-white/10 rounded-xl p-4 space-y-3 hover:border-white/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-white/30 text-sm font-mono">{String(index + 1).padStart(2, "0")}</div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`${questionTypeColors[q.type] || questionTypeColors.text} text-xs font-medium`}>
                            <Icon className="w-3 h-3 mr-1" />{questionTypeLabels[q.type] || q.type}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="text-xs text-white/40 hover:text-[#FF6B00] flex items-center gap-1">
                                Change Type <ChevronDown className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#1a1a1a] border-white/10">
                              {Object.entries(questionTypeLabels).map(([type, label]) => {
                                const TypeIcon = questionTypeIcons[type];
                                return (
                                  <DropdownMenuItem key={type} onClick={() => handleUpdateQuestion(index, { type, options: type === "select" ? (q.options || ["Option 1", "Option 2"]) : undefined })} className="text-white hover:bg-white/10 cursor-pointer">
                                    <TypeIcon className="w-3.5 h-3.5 mr-2" />{label}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Input
                          value={q.text}
                          onChange={(e) => handleUpdateQuestion(index, { text: e.target.value })}
                          placeholder={`Enter your question here...`}
                          className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                        />
                        {q.type === "select" && (
                          <div className="space-y-2">
                            <Label className="text-white/60 text-xs">Options</Label>
                            <div className="space-y-2">
                              {(q.options || []).map((opt, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />
                                  <Input value={opt} onChange={(e) => handleUpdateOption(index, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 text-sm focus:border-[#FF6B00]" />
                                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteOption(index, oIndex)} className="text-red-400 hover:bg-red-500/10 px-2"><X className="w-3.5 h-3.5" /></Button>
                                </div>
                              ))}
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleAddOption(index)} className="text-[#FF6B00] hover:bg-[#FF6B00]/10 text-xs">
                                <Plus className="w-3.5 h-3.5 mr-1" />Add Option
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleMoveQuestion(index, -1)} disabled={index === 0} className="text-white/30 hover:text-white hover:bg-white/5 h-7 px-2">Up</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleMoveQuestion(index, 1)} disabled={index === questions.length - 1} className="text-white/30 hover:text-white hover:bg-white/5 h-7 px-2">Down</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteQuestion(index)} className="text-red-400 hover:bg-red-500/10 h-7 px-2"><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* FILL ANSWERS TAB - Freelancer fills during call */}
          <TabsContent value="fill" className="space-y-6">
            <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-xl p-4">
              <p className="text-[#FF6B00] text-sm font-medium">📞 Freelancer Fill Mode</p>
              <p className="text-white/60 text-xs mt-1">Fill in client answers here during a call. These answers are saved with the brief and included in the PDF.</p>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <p className="text-white/40 text-sm">No questions yet. Add questions in the Questions tab first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, index) => {
                  const answer = answers[q.id] || "";
                  return (
                    <Card key={q.id} className="bg-[#111] border-white/10">
                      <CardContent className="pt-5 pb-5 space-y-3">
                        <div className="flex items-start gap-2">
                          <span className="text-[#FF6B00] font-bold text-sm mt-0.5">{index + 1}.</span>
                          <p className="text-white font-medium">{q.text || "Untitled Question"}</p>
                        </div>
                        <div className="pl-5">
                          {(q.type === "text" || q.type === "link" || q.type === "video") && (
                            <Input
                              value={answer}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              placeholder={q.type === "link" ? "https://..." : q.type === "video" ? "https://youtube.com/..." : "Type answer here..."}
                              className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                            />
                          )}
                          {q.type === "long" && (
                            <Textarea
                              value={answer}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              placeholder="Type detailed answer here..."
                              rows={3}
                              className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00] resize-none"
                            />
                          )}
                          {q.type === "select" && (
                            <div className="space-y-2">
                              {(q.options || []).map((opt, oIndex) => (
                                <label key={oIndex} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${answer === opt ? "border-[#FF6B00] bg-[#FF6B00]/10" : "border-white/10 bg-[#1a1a1a] hover:border-white/20"}`}>
                                  <input type="radio" name={`answer-${q.id}`} value={opt} checked={answer === opt} onChange={(e) => handleAnswerChange(q.id, e.target.value)} className="w-4 h-4 accent-[#FF6B00]" />
                                  <span className="text-white text-sm">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {(q.type === "file" || q.type === "image") && (
                            <div className="space-y-2">
                              <Input
                                value={answer}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                placeholder="Paste file URL or note the file name here..."
                                className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus:border-[#FF6B00]"
                              />
                              <p className="text-white/30 text-xs">For file uploads, share the intake form link with your client so they can upload directly.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <Button onClick={handleSave} disabled={saving} className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white h-12">
                  {saving ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving...</> : <><Save className="w-5 h-5 mr-2" />Save All Answers</>}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(nicheTemplates).map(([niche, template]) => (
                <button key={niche} type="button" onClick={() => handleNicheSelect(niche)} className="p-4 rounded-xl bg-[#111] border border-white/10 hover:border-[#FF6B00]/50 hover:bg-[#161616] transition-all text-left group">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium group-hover:text-[#FF6B00] transition-colors">{niche}</h3>
                    <Badge variant="outline" className="border-white/10 text-white/50 text-xs">{template.length} Qs</Badge>
                  </div>
                  <p className="text-white/40 text-xs">{template.slice(0, 3).map(q => q.text).join(" • ").substring(0, 80)}...</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {Array.from(new Set(template.map(q => q.type))).slice(0, 4).map(type => (
                      <span key={type} className={`text-[10px] px-1.5 py-0.5 rounded ${questionTypeColors[type]}`}>{questionTypeLabels[type]}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ShareBriefDialog
        brief={{ ...briefData, clientName, clientEmail, projectTitle }}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
// frontend/src/pages/Demo.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, Receipt, ArrowRight, CheckCircle2,
  Clock, RefreshCw, Play, X, ChevronRight, ChevronLeft,
  Target, Upload, Image, Video, Sparkles, Crown,
  MessageCircle, Link2, BarChart3, Check,
} from "lucide-react";

// ─── FAKE DEMO DATA ───────────────────────────────────────────
const DEMO_CLIENTS = [
  {
    id: "c1", name: "Priya Sharma", company: "Designify Co",
    email: "priya@designify.com", phone: "+91 98765 43210",
    status: "active", project: "Brand Website",
  },
  {
    id: "c2", name: "Rahul Mehta", company: "TechStart India",
    email: "rahul@techstart.io", phone: "+91 87654 32109",
    status: "active", project: "Logo Design",
  },
];

const DEMO_LEADS = [
  { id: "l1", name: "Sneha Patel", company: "Bloom Cafe", status: "call_booked", value: "₹18,000", source: "Instagram" },
  { id: "l2", name: "Arjun Singh", company: "FitLife Studio", status: "interested", value: "₹32,000", source: "Referral" },
  { id: "l3", name: "Meera Nair", company: "CloudOps Ltd", status: "new_lead", value: "₹55,000", source: "LinkedIn" },
];

const DEMO_BRIEFS = [
  {
    id: "b1", title: "Brand Website Redesign", client: "Priya Sharma",
    status: "sent", niche: "Web Design", budget: "₹45,000",
    timeline: "3 weeks", revisions: "2/2 used",
    questions: ["What is your brand story?", "Share 3 competitor sites you like", "What colors represent your brand?"],
  },
  {
    id: "b2", title: "Logo & Brand Identity", client: "Rahul Mehta",
    status: "draft", niche: "Graphic Design", budget: "₹18,000",
    timeline: "10 days", revisions: "0/2 used",
    questions: ["What feeling should the logo give?", "Any existing brand assets?", "Preferred color palette?"],
  },
];

const DEMO_INVOICES = [
  {
    id: "i1", number: "INV-001", client: "Priya Sharma",
    amount: 45000, advance: 22500, status: "paid",
    due: "2025-02-01", desc: "Website Redesign — Full Payment",
  },
  {
    id: "i2", number: "INV-002", client: "Rahul Mehta",
    amount: 18000, advance: 9000, status: "pending",
    due: "2025-02-28", desc: "Brand Identity — 50% Advance",
  },
];

// ─── GUIDE STEPS ──────────────────────────────────────────────
const GUIDE_STEPS = [
  {
    step: 1,
    title: "Add a Lead",
    icon: Target,
    color: "bg-blue-500",
    desc: "When someone shows interest — from Instagram, WhatsApp, LinkedIn — add them as a Lead. Track their status from New Lead → Interested → Call Booked.",
    tip: "GigVorx keeps all your leads in a visual pipeline board. Drag and drop to move them forward.",
  },
  {
    step: 2,
    title: "Create a Brief",
    icon: FileText,
    color: "bg-violet-500",
    desc: "After a call, create a Client Brief. Choose from 26 niche templates like Web Design, SEO, Social Media. Add your questions for the client to answer.",
    tip: "Briefs replace messy WhatsApp conversations. Everything is in one clean form.",
  },
  {
    step: 3,
    title: "Share Intake Link",
    icon: Link2,
    color: "bg-sky-500",
    desc: "GigVorx gives you a public link for each brief. Send it to your client. They fill it without needing an account. Their answers come back to your dashboard.",
    tip: "Share via WhatsApp, email, or copy-paste the link. Works on mobile too.",
  },
  {
    step: 4,
    title: "Convert to Client",
    icon: Users,
    color: "bg-emerald-500",
    desc: "Once the brief is filled and you agree on scope, convert the Lead to a Client. All their information moves over automatically.",
    tip: "No data entry twice. GigVorx remembers everything from the lead stage.",
  },
  {
    step: 5,
    title: "Send Invoice",
    icon: Receipt,
    color: "bg-amber-500",
    desc: "Create a professional invoice with your logo, GST number, UPI ID, and itemized work. Send it via WhatsApp or email. Track payment status.",
    tip: "Invoices show Pending, Paid, or Overdue automatically based on due date.",
  },
  {
    step: 6,
    title: "Track Everything",
    icon: BarChart3,
    color: "bg-rose-500",
    desc: "The Analytics page shows your total revenue, paid vs pending invoices, top clients, and conversion rate. Know your business numbers at a glance.",
    tip: "All data is private to your account and backed up securely.",
  },
];

// ─── HELPER COMPONENTS ────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    paid: "bg-green-100 text-green-700 border-green-200",
    active: "bg-green-100 text-green-700 border-green-200",
    sent: "bg-blue-100 text-blue-700 border-blue-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    interested: "bg-blue-100 text-blue-700 border-blue-200",
    call_booked: "bg-violet-100 text-violet-700 border-violet-200",
    new_lead: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const icons = {
    paid: CheckCircle2, active: CheckCircle2, sent: CheckCircle2,
    pending: Clock, draft: Clock, interested: Clock,
    call_booked: CheckCircle2, new_lead: Clock,
  };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || "bg-gray-100 text-gray-600"}`}>
      <Icon className="w-3 h-3" />
      {status?.replace("_", " ")}
    </span>
  );
}

// Image placeholder box — shows upload icon and label
function ImagePlaceholder({ label, height = "h-48" }) {
  return (
    <div className={`${height} rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground`}>
      <Image className="w-8 h-8 opacity-30" />
      <p className="text-xs font-medium opacity-50">{label}</p>
      <p className="text-[10px] opacity-40">Upload a screenshot here</p>
    </div>
  );
}

// ─── GUIDE MODAL ──────────────────────────────────────────────
function GuideModal({ onClose }) {
  const [step, setStep] = useState(0);
  const current = GUIDE_STEPS[step];
  const Icon = current.icon;
  const isLast = step === GUIDE_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-sm">How GigVorx Works</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex gap-1.5 px-6 pt-4">
          {GUIDE_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-blue-500" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl ${current.color} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Step {current.step} of {GUIDE_STEPS.length}
              </p>
              <h3 className="font-bold text-lg">{current.title}</h3>
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed mb-4">
            {current.desc}
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700 font-medium flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {current.tip}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Skip guide
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(s => s - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />Back
              </Button>
            )}
            {isLast ? (
              <Button
                size="sm"
                onClick={onClose}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Check className="w-4 h-4 mr-1" />Got it!
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DEMO PAGE ───────────────────────────────────────────
export default function Demo() {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState("leads");

  const totalRevenue = DEMO_INVOICES.reduce((s, i) => s + i.amount, 0);
  const collected = DEMO_INVOICES
    .filter(i => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* ── DEMO BANNER ── */}
      <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className="bg-amber-500 text-white shrink-0">DEMO MODE</Badge>
          <span className="text-sm text-amber-800 font-medium">
            Sample data only. Nothing is saved to any account.
          </span>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowGuide(true)}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Watch Guide
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/")}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Exit Demo
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/signup")}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            Create Free Account
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* ── HEADER ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">GigVorx — Live Demo</h1>
        <p className="text-muted-foreground text-lg">
          See how GigVorx helps freelancers manage clients, briefs, and invoices
          professionally. No signup needed.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-50"
          onClick={() => setShowGuide(true)}
        >
          <Play className="w-4 h-4 mr-2" />
          View step-by-step guide (6 steps, skippable)
        </Button>
      </div>

      {/* ── VIDEO SECTION ── */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-500" />
          Product Walkthrough Video
        </h2>
        <div className="rounded-xl overflow-hidden border bg-muted/30 aspect-video flex items-center justify-center relative">
          {/* Replace the src below with your actual YouTube embed URL */}
          {/* Example: src="https://www.youtube.com/embed/YOUR_VIDEO_ID" */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Play className="w-8 h-8 text-blue-500 ml-1" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Demo Video Coming Soon</p>
              <p className="text-sm mt-1">
                Upload your video to YouTube and paste the embed link here
              </p>
              <p className="text-xs mt-2 font-mono bg-muted px-3 py-1 rounded">
                Replace this section with: &lt;iframe src="https://www.youtube.com/embed/YOUR_ID" /&gt;
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          To add your video: record a screen walkthrough → upload to YouTube → replace the placeholder above with the YouTube embed iframe.
        </p>
      </div>

      {/* ── APP SCREENSHOTS SECTION ── */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Image className="w-5 h-5 text-violet-500" />
          App Screenshots
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Take screenshots of your live app and upload them here to replace the placeholders below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Dashboard</p>
            <ImagePlaceholder label="Dashboard screenshot" height="h-48" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Lead Pipeline</p>
            <ImagePlaceholder label="Lead pipeline board" height="h-48" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Brief Editor</p>
            <ImagePlaceholder label="Brief editor with questions" height="h-48" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Invoice</p>
            <ImagePlaceholder label="Invoice preview" height="h-48" />
          </div>
        </div>
        <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-700 font-medium flex items-start gap-2">
            <Upload className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            To add real screenshots: take a screenshot of each page in GigVorx → save as PNG → upload to your GitHub repo in a folder called /public/screenshots/ → replace the ImagePlaceholder components with &lt;img src="/screenshots/dashboard.png" /&gt;
          </p>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{DEMO_CLIENTS.length}</p>
            <p className="text-xs text-muted-foreground mt-1">2 projects in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-500" />Client Briefs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{DEMO_BRIEFS.length}</p>
            <p className="text-xs text-muted-foreground mt-1">1 sent, 1 in draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-green-500" />Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{collected.toLocaleString("en-IN")} collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── TABS ── */}
      <div className="mb-6">
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {[
            { id: "leads", label: "Leads", icon: Target },
            { id: "clients", label: "Clients", icon: Users },
            { id: "briefs", label: "Briefs", icon: FileText },
            { id: "invoices", label: "Invoices", icon: Receipt },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LEADS TAB ── */}
      {activeTab === "leads" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Leads are potential clients you are talking to. Track them from first contact to Won.
          </p>
          <div className="space-y-3">
            {DEMO_LEADS.map(l => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-sm text-muted-foreground">{l.company}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-muted-foreground">{l.source}</span>
                    <span className="font-semibold text-blue-600">{l.value}</span>
                    <StatusBadge status={l.status} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── CLIENTS TAB ── */}
      {activeTab === "clients" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Active clients with ongoing projects.
          </p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_CLIENTS.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.company}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.email}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BRIEFS TAB ── */}
      {activeTab === "briefs" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Client briefs collect project requirements. Share the link with clients to fill without an account.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {DEMO_BRIEFS.map(b => (
              <Card key={b.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold">{b.title}</h3>
                      <p className="text-sm text-muted-foreground">{b.client}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Budget: </span>
                      <span className="font-medium">{b.budget}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeline: </span>
                      <span className="font-medium">{b.timeline}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revisions: </span>
                      <span className="font-medium">{b.revisions}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Niche: </span>
                      <span className="font-medium">{b.niche}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Sample Questions:
                    </p>
                    {b.questions.map((q, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 mb-1">
                        <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {q}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── INVOICES TAB ── */}
      {activeTab === "invoices" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Invoices with payment tracking. Pending invoices show overdue warnings automatically.
          </p>
          <div className="space-y-4">
            {DEMO_INVOICES.map(inv => (
              <Card key={inv.id} className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">{inv.number}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{inv.client}</p>
                    <p className="text-xs text-muted-foreground mt-1">{inv.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      ₹{inv.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Advance: ₹{inv.advance.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {inv.due}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs" disabled>
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Share on WhatsApp
                  </Button>
                  {inv.status === "pending" && (
                    <Button size="sm" variant="outline" className="text-xs text-green-600 border-green-200" disabled>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div className="mt-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white p-8 text-center">
        <Crown className="w-10 h-10 mx-auto mb-4 text-yellow-300" />
        <h2 className="text-2xl font-bold mb-3">
          Ready to manage your own clients like this?
        </h2>
        <p className="text-blue-100 mb-6 max-w-lg mx-auto">
          GigVorx is free to start. Set up your first client workflow in under 5 minutes.
          No credit card needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/signup")}
            className="bg-white text-blue-700 hover:bg-white/90 font-semibold"
          >
            Start Free — No Credit Card
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/pricing")}
            className="border-white/30 text-white hover:bg-white/10"
          >
            See Pricing
          </Button>
        </div>
      </div>

      {/* Guide modal */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
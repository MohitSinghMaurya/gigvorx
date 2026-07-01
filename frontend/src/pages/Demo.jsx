import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  FileText,
  Link2,
  MessageCircle,
  Play,
  Receipt,
  RefreshCw,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_CLIENTS = [
  {
    id: "c1",
    name: "Priya Sharma",
    company: "Designify Co",
    email: "priya@designify.com",
    phone: "+91 98765 43210",
    status: "active",
    project: "Brand Website",
  },
  {
    id: "c2",
    name: "Rahul Mehta",
    company: "TechStart India",
    email: "rahul@techstart.io",
    phone: "+91 87654 32109",
    status: "active",
    project: "Logo Design",
  },
];

const DEMO_LEADS = [
  {
    id: "l1",
    name: "Sneha Patel",
    company: "Bloom Cafe",
    status: "call_booked",
    value: "₹18,000",
    source: "Instagram",
  },
  {
    id: "l2",
    name: "Arjun Singh",
    company: "FitLife Studio",
    status: "interested",
    value: "₹32,000",
    source: "Referral",
  },
  {
    id: "l3",
    name: "Meera Nair",
    company: "CloudOps Ltd",
    status: "new_lead",
    value: "₹55,000",
    source: "LinkedIn",
  },
];

const DEMO_BRIEFS = [
  {
    id: "b1",
    title: "Brand Website Redesign",
    client: "Priya Sharma",
    status: "sent",
    niche: "Web Design",
    budget: "₹45,000",
    timeline: "3 weeks",
    revisions: "2 included",
    questions: [
      "What is your brand story?",
      "Share 3 competitor websites you like.",
      "What colors or style should represent your brand?",
    ],
  },
  {
    id: "b2",
    title: "Logo and Brand Identity",
    client: "Rahul Mehta",
    status: "draft",
    niche: "Graphic Design",
    budget: "₹18,000",
    timeline: "10 days",
    revisions: "2 included",
    questions: [
      "What feeling should the logo create?",
      "Do you have existing brand assets?",
      "What color palette do you prefer?",
    ],
  },
];

const DEMO_INVOICES = [
  {
    id: "i1",
    number: "INV-001",
    client: "Priya Sharma",
    amount: 45000,
    advance: 22500,
    status: "paid",
    due: "2026-08-01",
    desc: "Website Redesign — Full Payment",
  },
  {
    id: "i2",
    number: "INV-002",
    client: "Rahul Mehta",
    amount: 18000,
    advance: 9000,
    status: "pending",
    due: "2026-08-28",
    desc: "Brand Identity — 50% Advance",
  },
];

const GUIDE_STEPS = [
  {
    step: 1,
    title: "Add a Lead",
    icon: Target,
    color: "bg-blue-500",
    desc: "When someone shows interest from Instagram, WhatsApp, LinkedIn, referrals, or email, add them as a lead and track where the opportunity stands.",
    tip: "GigVorx keeps early client conversations organized before they become paid projects.",
  },
  {
    step: 2,
    title: "Create a Brief",
    icon: FileText,
    color: "bg-violet-500",
    desc: "Create a client brief using service-specific questions. Capture requirements, budget, timeline, deliverables, and revision expectations clearly.",
    tip: "Briefs reduce messy back-and-forth messages and make scope easier to approve.",
  },
  {
    step: 3,
    title: "Share Intake Link",
    icon: Link2,
    color: "bg-sky-500",
    desc: "Share a public intake link with your client. They can fill the brief without creating a GigVorx account.",
    tip: "Send the link by WhatsApp, email, or copy-paste. It works on mobile too.",
  },
  {
    step: 4,
    title: "Convert to Client",
    icon: Users,
    color: "bg-emerald-500",
    desc: "Once the client is serious, keep their details, brief, and project information together in your workspace.",
    tip: "Client records help you avoid losing important details across chats and files.",
  },
  {
    step: 5,
    title: "Send Invoice",
    icon: Receipt,
    color: "bg-amber-500",
    desc: "Create a professional invoice with line items, advance amount, due date, and payment status.",
    tip: "Invoices can be tracked as pending, paid, or overdue.",
  },
  {
    step: 6,
    title: "Track Everything",
    icon: BarChart3,
    color: "bg-rose-500",
    desc: "Use analytics to understand clients, briefs, invoices, revenue, and pending payments at a glance.",
    tip: "Your workspace data stays connected to your account.",
  },
];

function StatusBadge({ status }) {
  const styleMap = {
    paid: "bg-green-100 text-green-700 border-green-200",
    active: "bg-green-100 text-green-700 border-green-200",
    sent: "bg-blue-100 text-blue-700 border-blue-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    interested: "bg-blue-100 text-blue-700 border-blue-200",
    call_booked: "bg-violet-100 text-violet-700 border-violet-200",
    new_lead: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const iconMap = {
    paid: CheckCircle2,
    active: CheckCircle2,
    sent: CheckCircle2,
    pending: Clock,
    draft: Clock,
    interested: Clock,
    call_booked: CheckCircle2,
    new_lead: Clock,
  };

  const Icon = iconMap[status] || Clock;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
        styleMap[status] || "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      <Icon className="h-3 w-3" />
      {status?.replace("_", " ")}
    </span>
  );
}

function GuideModal({ onClose }) {
  const [step, setStep] = useState(0);

  const current = GUIDE_STEPS[step];
  const Icon = current.icon;
  const isLast = step === GUIDE_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 pb-4 pt-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold">How GigVorx Works</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1.5 px-6 pt-4">
          {GUIDE_STEPS.map((item, index) => (
            <div
              key={item.step}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                index <= step ? "bg-blue-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-6">
          <div className="mb-4 flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${current.color}`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Step {current.step} of {GUIDE_STEPS.length}
              </p>
              <h3 className="text-lg font-bold">{current.title}</h3>
            </div>
          </div>

          <p className="mb-4 leading-relaxed text-muted-foreground">
            {current.desc}
          </p>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="flex items-start gap-2 text-xs font-medium text-blue-700">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {current.tip}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Skip guide
          </Button>

          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((value) => value - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : null}

            {isLast ? (
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                <Check className="mr-1 h-4 w-4" />
                Got it
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((value) => value + 1)}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Demo() {
  const navigate = useNavigate();

  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState("leads");

  const totalRevenue = DEMO_INVOICES.reduce(
    (sum, invoice) => sum + invoice.amount,
    0
  );

  const collected = DEMO_INVOICES.filter(
    (invoice) => invoice.status === "paid"
  ).reduce((sum, invoice) => sum + invoice.amount, 0);

  const tabs = [
    { id: "leads", label: "Leads", icon: Target },
    { id: "clients", label: "Clients", icon: Users },
    { id: "briefs", label: "Briefs", icon: FileText },
    { id: "invoices", label: "Invoices", icon: Receipt },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="shrink-0 bg-amber-500 text-white">DEMO MODE</Badge>
          <span className="text-sm font-medium text-amber-800">
            Sample data only. Nothing is saved to any account.
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowGuide(true)}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Watch Guide
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate("/")}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Exit Demo
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => navigate("/signup")}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            Start 7-Day Trial
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">GigVorx — Live Demo</h1>
        <p className="text-lg text-muted-foreground">
          See how GigVorx helps freelancers and agencies manage leads, clients,
          briefs, invoices, and follow-ups professionally.
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-50"
          onClick={() => setShowGuide(true)}
        >
          <Play className="mr-2 h-4 w-4" />
          View step-by-step guide
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-blue-500" />
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{DEMO_CLIENTS.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              2 projects in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4 text-violet-500" />
              Client Briefs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{DEMO_BRIEFS.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              1 sent, 1 in draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Receipt className="h-4 w-4 text-green-500" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ₹{collected.toLocaleString("en-IN")} collected
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "leads" ? (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Leads are potential clients you are talking to. Track them from first
            contact to booked call or project.
          </p>

          <div className="space-y-3">
            {DEMO_LEADS.map((lead) => (
              <Card key={lead.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.company}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {lead.source}
                    </span>
                    <span className="font-semibold text-blue-600">
                      {lead.value}
                    </span>
                    <StatusBadge status={lead.status} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "clients" ? (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Active clients with ongoing projects.
          </p>

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                    Company
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {DEMO_CLIENTS.map((client, index) => (
                  <tr
                    key={client.id}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-4 py-3 font-medium">{client.name}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {client.company}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {client.email}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={client.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "briefs" ? (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Client briefs collect project requirements. Share the link with
            clients so scope is clear before work begins.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {DEMO_BRIEFS.map((brief) => (
              <Card key={brief.id}>
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{brief.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {brief.client}
                      </p>
                    </div>

                    <StatusBadge status={brief.status} />
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Budget: </span>
                      <span className="font-medium">{brief.budget}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeline: </span>
                      <span className="font-medium">{brief.timeline}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revisions: </span>
                      <span className="font-medium">{brief.revisions}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Niche: </span>
                      <span className="font-medium">{brief.niche}</span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Sample Questions:
                    </p>

                    {brief.questions.map((question, index) => (
                      <p
                        key={`${brief.id}-${question}`}
                        className="mb-1 flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px]">
                          {index + 1}
                        </span>
                        {question}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "invoices" ? (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Invoices include payment tracking, advance amounts, and due dates.
          </p>

          <div className="space-y-4">
            {DEMO_INVOICES.map((invoice) => (
              <Card key={invoice.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-bold">{invoice.number}</p>
                      <StatusBadge status={invoice.status} />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {invoice.client}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invoice.desc}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      ₹{invoice.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Advance: ₹{invoice.advance.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Due: {invoice.due}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled
                  >
                    <MessageCircle className="mr-1 h-3 w-3" />
                    Share on WhatsApp
                  </Button>

                  {invoice.status === "pending" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-green-200 text-xs text-green-600"
                      disabled
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Mark as Paid
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-8 text-center text-white">
        <Crown className="mx-auto mb-4 h-10 w-10 text-yellow-300" />

        <h2 className="mb-3 text-2xl font-bold">
          Ready to manage your own clients like this?
        </h2>

        <p className="mx-auto mb-6 max-w-lg text-blue-100">
          Start your 7-day GigVorx trial and set up your first client workflow in
          minutes. No credit card needed.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            size="lg"
            onClick={() => navigate("/signup")}
            className="bg-white font-semibold text-blue-700 hover:bg-white/90"
          >
            Start 7-Day Trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => navigate("/pricing")}
            className="border-white/30 text-white hover:bg-white/10"
          >
            See Pricing
          </Button>
        </div>
      </div>

      {showGuide ? <GuideModal onClose={() => setShowGuide(false)} /> : null}
    </div>
  );
}
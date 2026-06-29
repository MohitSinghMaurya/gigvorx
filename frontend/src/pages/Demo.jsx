// frontend/src/pages/Demo.jsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, Receipt, RefreshCw, ArrowRight,
  CheckCircle2, Clock, AlertCircle, Play
} from "lucide-react";

// Fake demo data — stays local, never sent to Supabase
const DEMO_CLIENTS = [
  {
    id: "demo-c1",
    name: "Priya Sharma",
    company: "Designify Co",
    email: "priya@designify.com",
    phone: "+91 98765 43210",
    status: "active",
  },
  {
    id: "demo-c2",
    name: "Rahul Mehta",
    company: "TechStart India",
    email: "rahul@techstart.io",
    phone: "+91 87654 32109",
    status: "active",
  },
];

const DEMO_BRIEFS = [
  {
    id: "demo-b1",
    projectTitle: "Brand Website Redesign",
    clientName: "Priya Sharma",
    status: "sent",
    niche: "web-design",
    budget: "₹45,000",
    timeline: "3 weeks",
    revisionsAllowed: 2,
    revisionsUsed: 1,
  },
  {
    id: "demo-b2",
    projectTitle: "Logo & Brand Identity Pack",
    clientName: "Rahul Mehta",
    status: "draft",
    niche: "graphic-design",
    budget: "₹18,000",
    timeline: "10 days",
    revisionsAllowed: 2,
    revisionsUsed: 0,
  },
];

const DEMO_INVOICES = [
  {
    id: "demo-i1",
    invoiceNumber: "INV-001",
    clientName: "Priya Sharma",
    amount: 45000,
    advancePaid: 22500,
    currency: "INR",
    status: "paid",
    dueDate: "2025-02-01",
    description: "Website Redesign — Full Payment",
  },
  {
    id: "demo-i2",
    invoiceNumber: "INV-002",
    clientName: "Rahul Mehta",
    amount: 18000,
    advancePaid: 9000,
    currency: "INR",
    status: "pending",
    dueDate: "2025-02-28",
    description: "Brand Identity Pack — 50% Advance Due",
  },
];

function StatusBadge({ status }) {
  if (status === "paid" || status === "sent" || status === "active") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        <Clock className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      {status}
    </Badge>
  );
}

export default function Demo() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Demo Mode Banner */}
      <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-500 text-white shrink-0">DEMO MODE</Badge>
          <span className="text-sm text-amber-800 font-medium">
            You are viewing sample data. Nothing here is real or saved anywhere.
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
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

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">GigVorx — Live Demo</h1>
        <p className="text-muted-foreground text-lg">
          See how GigVorx helps freelancers manage clients, briefs, and invoices professionally.
          No signup needed to explore.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Active Clients
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
              <FileText className="w-4 h-4 text-violet-500" />
              Client Briefs
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
              <Receipt className="w-4 h-4 text-green-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₹{(DEMO_INVOICES.reduce((sum, i) => sum + i.amount, 0)).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{DEMO_INVOICES.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0).toLocaleString("en-IN")} collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          Clients
        </h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_CLIENTS.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Briefs Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-500" />
          Client Briefs
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {DEMO_BRIEFS.map(b => (
            <Card key={b.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold">{b.projectTitle}</h3>
                    <p className="text-sm text-muted-foreground">{b.clientName}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
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
                    <span className="font-medium">{b.revisionsUsed}/{b.revisionsAllowed} used</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Niche: </span>
                    <span className="font-medium capitalize">{b.niche.replace("-", " ")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Invoices Section */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-green-500" />
          Invoices
        </h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Advance</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_INVOICES.map((inv, i) => (
                <tr key={inv.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{inv.clientName}</td>
                  <td className="px-4 py-3 font-medium">₹{inv.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-muted-foreground">₹{inv.advancePaid.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.dueDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call to Action */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white p-8 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to manage your own clients like this?</h2>
        <p className="text-blue-100 mb-6 max-w-lg mx-auto">
          GigVorx is free to start. Create your account and set up your first client workflow in under 5 minutes.
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

    </div>
  );
}
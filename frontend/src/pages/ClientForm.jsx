import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCollection } from "@/lib/useCollection";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ClientForm() {
  const { id } = useParams();
  const { create, update, get } = useCollection("clients");
  const navigate = useNavigate();
  const editing = !!id;
  const { canAddClient, limits, usage, isPro } = usePlanLimits();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "",
    service: "", budget: "", deadline: "", notes: ""
  });

  useEffect(() => {
    if (editing) {
      const c = get(id);
      if (c) setForm(f => ({ ...f, ...c }));
    }
    // eslint-disable-next-line
  }, [id]);

  // Block new client if limit reached
  if (!editing && !canAddClient) {
    return (
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/clients")} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <Card className="p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Client limit reached</h2>
          <p className="text-muted-foreground mb-2">
            You've used <span className="font-semibold text-foreground">{usage.clients}</span> of your <span className="font-semibold text-foreground">{limits.clients}</span> client slots.
          </p>
          <p className="text-muted-foreground mb-6">
            Upgrade to Pro for unlimited clients.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/clients")}>Go back</Button>
            <Button onClick={() => navigate("/pricing-app")} className="bg-brand-gradient text-white hover:opacity-90">
              Upgrade to Pro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Name is required"); return; }
    if (editing) {
      update(id, form);
      toast.success("Client updated");
    } else {
      create(form);
      toast.success("Client added");
    }
    navigate("/clients");
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/clients")} className="mb-4 -ml-2" data-testid="back-clients">
        <ArrowLeft className="w-4 h-4 mr-1" />Back
      </Button>
      <h1 className="text-3xl font-bold tracking-tight mb-1">{editing ? "Edit client" : "Add new client"}</h1>
      <p className="text-muted-foreground mb-2">{editing ? "Update client details below." : "Capture key info to power briefs & invoices."}</p>

      {/* Usage indicator for non-pro users */}
      {!editing && !isPro && (
        <div className="mb-6 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center justify-between">
          <span>Client slots used: <span className="font-semibold">{usage.clients} / {limits.clients}</span></span>
          {usage.clients >= limits.clients - 2 && (
            <Button size="sm" variant="outline" onClick={() => navigate("/pricing-app")} className="border-amber-300 text-amber-700 hover:bg-amber-100 h-7 text-xs">
              Upgrade
            </Button>
          )}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input data-testid="client-name" value={form.name} onChange={(e) => setField("name", e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label>Company</Label>
              <Input data-testid="client-company" value={form.company} onChange={(e) => setField("company", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Email</Label>
              <Input data-testid="client-email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input data-testid="client-phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Service / Niche</Label>
              <Input data-testid="client-service" value={form.service} onChange={(e) => setField("service", e.target.value)} placeholder="e.g. SEO, Shopify" className="mt-1.5" />
            </div>
            <div>
              <Label>Budget</Label>
              <Input data-testid="client-budget" type="number" value={form.budget} onChange={(e) => setField("budget", e.target.value)} className="mt-1.5" />
            </div>
            <div className="md:col-span-2">
              <Label>Deadline</Label>
              <Input data-testid="client-deadline" type="date" value={form.deadline} onChange={(e) => setField("deadline", e.target.value)} className="mt-1.5" />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea data-testid="client-notes" rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="mt-1.5" placeholder="Anything important about this client…" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" data-testid="client-save" className="bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20">
              <Save className="w-4 h-4 mr-1.5" />{editing ? "Save changes" : "Add client"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/clients")}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

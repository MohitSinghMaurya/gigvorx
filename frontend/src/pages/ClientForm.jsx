import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readGlobal, writeGlobal, uid } from "@/lib/storage";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  service: "",
  budget: "",
  deadline: "",
  notes: "",
};

function cleanClientPayload(form) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    company: form.company.trim(),
    service: form.service.trim(),
    budget: form.budget,
    deadline: form.deadline || null,
    notes: form.notes.trim(),
  };
}

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editing = Boolean(id);

  const { canAddClient, limits, usage, isPro } = usePlanLimits();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [loadingClient, setLoadingClient] = useState(editing);

  const loadClient = useCallback(async () => {
    if (!editing || !user?.id) return;

    setLoadingClient(true);

    try {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setForm({
            ...EMPTY_FORM,
            ...data,
            budget: data.budget || "",
            deadline: data.deadline || "",
          });
        }
      } else {
        const client = readGlobal("clients", []).find(
          (item) =>
            item.id === id && (item.user_id === user.id || item.userId === user.id)
        );

        if (!client) {
          toast.error("Client not found");
          navigate("/clients");
          return;
        }

        setForm({
          ...EMPTY_FORM,
          ...client,
          budget: client.budget || "",
          deadline: client.deadline || "",
        });
      }
    } catch (err) {
      console.error("Failed to load client:", err);
      toast.error("Failed to load client");
      navigate("/clients");
    } finally {
      setLoadingClient(false);
    }
  }, [editing, id, navigate, user?.id]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("Please sign in again.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!editing && !canAddClient) {
      toast.error("Client limit reached. Upgrade to add more clients.");
      navigate("/pricing-app");
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();
      const payload = cleanClientPayload(form);

      if (editing) {
        if (isSupabaseEnabled) {
          const { error } = await supabase
            .from("clients")
            .update({
              ...payload,
              updated_at: now,
            })
            .eq("id", id)
            .eq("user_id", user.id);

          if (error) throw error;
        } else {
          const clients = readGlobal("clients", []);

          writeGlobal(
            "clients",
            clients.map((client) =>
              client.id === id && (client.user_id === user.id || client.userId === user.id)
                ? {
                    ...client,
                    ...payload,
                    updatedAt: now,
                  }
                : client
            )
          );
        }

        toast.success("Client updated");
      } else {
        if (isSupabaseEnabled) {
          const { error } = await supabase.from("clients").insert([
            {
              ...payload,
              user_id: user.id,
              is_lead: false,
              created_at: now,
              updated_at: now,
            },
          ]);

          if (error) throw error;
        } else {
          const clients = readGlobal("clients", []);

          writeGlobal("clients", [
            {
              id: uid(),
              ...payload,
              user_id: user.id,
              userId: user.id,
              isLead: false,
              createdAt: now,
              updatedAt: now,
            },
            ...clients,
          ]);
        }

        toast.success("Client added");
      }

      navigate("/clients");
    } catch (err) {
      console.error("Client save failed:", err);
      toast.error(editing ? "Failed to update client" : "Failed to add client");
    } finally {
      setLoading(false);
    }
  };

  if (!editing && !canAddClient) {
    return (
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/clients")}
          className="-ml-2 mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>

          <h2 className="mb-2 text-2xl font-bold">Client limit reached</h2>

          <p className="mb-2 text-muted-foreground">
            You have used{" "}
            <span className="font-semibold text-foreground">
              {usage.clients}
            </span>{" "}
            of your{" "}
            <span className="font-semibold text-foreground">
              {limits.clients}
            </span>{" "}
            client slots.
          </p>

          <p className="mb-6 text-muted-foreground">
            Upgrade to add more clients and keep your workflow growing.
          </p>

          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/clients")}>
              Go back
            </Button>
            <Button
              onClick={() => navigate("/pricing-app")}
              className="bg-brand-gradient text-white hover:opacity-90"
            >
              Upgrade
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/clients")}
        className="-ml-2 mb-4"
        data-testid="back-clients"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <h1 className="mb-1 text-3xl font-bold tracking-tight">
        {editing ? "Edit client" : "Add new client"}
      </h1>

      <p className="mb-2 text-muted-foreground">
        {editing
          ? "Update this client record."
          : "Capture key client details for briefs, invoices, and follow-ups."}
      </p>

      {!editing && !isPro && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <span>
            Client slots used:{" "}
            <span className="font-semibold">
              {usage.clients} / {limits.clients}
            </span>
          </span>

          {usage.clients >= limits.clients - 2 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/pricing-app")}
              className="h-7 border-amber-300 text-xs text-amber-700 hover:bg-amber-100"
            >
              Upgrade
            </Button>
          )}
        </div>
      )}

      <Card className="p-6">
        {loadingClient ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Name *</Label>
                <Input
                  data-testid="client-name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                  className="mt-1.5"
                  placeholder="Client name"
                />
              </div>

              <div>
                <Label>Company</Label>
                <Input
                  data-testid="client-company"
                  value={form.company}
                  onChange={(e) => setField("company", e.target.value)}
                  className="mt-1.5"
                  placeholder="Company name"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  data-testid="client-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className="mt-1.5"
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  data-testid="client-phone"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="mt-1.5"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <Label>Service / Niche</Label>
                <Input
                  data-testid="client-service"
                  value={form.service}
                  onChange={(e) => setField("service", e.target.value)}
                  placeholder="e.g. SEO, Shopify, Branding"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Budget</Label>
                <Input
                  data-testid="client-budget"
                  type="number"
                  value={form.budget}
                  onChange={(e) => setField("budget", e.target.value)}
                  className="mt-1.5"
                  placeholder="50000"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Deadline</Label>
                <Input
                  data-testid="client-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setField("deadline", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  data-testid="client-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className="mt-1.5"
                  placeholder="Anything important about this client..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={loading}
                data-testid="client-save"
                className="bg-brand-gradient text-white shadow-sm shadow-blue-500/20 hover:opacity-90"
              >
                {loading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                {editing ? "Save changes" : "Add client"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/clients")}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
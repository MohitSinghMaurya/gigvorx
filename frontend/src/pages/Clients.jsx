import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { readGlobal, writeGlobal } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { usePlanLimits } from "@/lib/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Loader2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

function isActiveClient(client) {
  return client?.isLead !== true && client?.is_lead !== true;
}

function getClientCreatedAt(client) {
  return client?.created_at || client?.createdAt;
}

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canAddClient, clientsLeft, isTrial, isStarter } = usePlanLimits();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(null);

  const fetchClients = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setClients((data || []).filter(isActiveClient));
      } else {
        const localClients = readGlobal("clients", [])
          .filter((client) => client?.user_id === user.id || client?.userId === user.id)
          .filter(isActiveClient)
          .sort(
            (a, b) =>
              new Date(getClientCreatedAt(b)) - new Date(getClientCreatedAt(a))
          );

        setClients(localClients);
      }
    } catch (err) {
      console.error("Failed to load clients:", err);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleAddClient = () => {
    if (!canAddClient) {
      toast.error("Client limit reached. Upgrade to add more clients.");
      navigate("/pricing-app");
      return;
    }

    navigate("/clients/new");
  };

  const handleDelete = async (clientId, clientName) => {
    if (!user?.id) return;

    setDeleting(clientId);

    try {
      if (isSupabaseEnabled) {
        const { error } = await supabase
          .from("clients")
          .delete()
          .eq("id", clientId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const allClients = readGlobal("clients", []);
        writeGlobal(
          "clients",
          allClients.filter((client) => client.id !== clientId)
        );
      }

      setClients((prev) => prev.filter((client) => client.id !== clientId));
      toast.success(`${clientName || "Client"} deleted`);
    } catch (err) {
      console.error("Failed to delete client:", err);
      toast.error("Failed to delete client");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return clients;

    return clients.filter((client) => {
      return (
        client.name?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.phone?.toLowerCase().includes(search) ||
        client.service?.toLowerCase().includes(search) ||
        client.source?.toLowerCase().includes(search)
      );
    });
  }, [clients, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="mt-1 text-muted-foreground">
            Keep every client record, contact detail, and service history in one
            place.
          </p>
        </div>

        <Button
          onClick={handleAddClient}
          className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {(isTrial || isStarter) && (
        <Card className="flex flex-col justify-between gap-3 border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Client limit: {clientsLeft === Infinity ? "Unlimited" : `${clientsLeft} left`}
            </p>
            <p className="text-xs text-amber-700">
              Upgrade when you need more client records for your workflow.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/pricing-app")}
            className="border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
          >
            <Crown className="mr-1.5 h-4 w-4" />
            View plans
          </Button>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="mb-1 font-semibold">
            {clients.length === 0 ? "No clients yet" : "No matches"}
          </p>
          <p className="mb-5 text-sm text-muted-foreground">
            {clients.length === 0
              ? "Add your first client to start managing briefs, invoices, and follow-ups."
              : "Try a different search term."}
          </p>

          {clients.length === 0 && (
            <Button
              onClick={handleAddClient}
              className="bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Client
            </Button>
          )}
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="p-4 text-left font-semibold">Name</th>
                  <th className="p-4 text-left font-semibold">Contact</th>
                  <th className="p-4 text-left font-semibold">Service</th>
                  <th className="p-4 text-left font-semibold">Source</th>
                  <th className="p-4 text-left font-semibold">Added</th>
                  <th className="w-20" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="cursor-pointer transition-colors hover:bg-muted/20"
                    onClick={() => navigate(`/clients/${client.id}/edit`)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-[#FF6B00] text-xs font-bold text-white">
                          {(client.name || "?").slice(0, 2).toUpperCase()}
                        </div>

                        <div>
                          <p className="font-semibold">
                            {client.name || "Unnamed Client"}
                          </p>
                          {client.status && (
                            <p className="text-xs capitalize text-muted-foreground">
                              {client.status}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {client.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        )}

                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                        )}

                        {!client.email && !client.phone && "—"}
                      </div>
                    </td>

                    <td className="p-4 text-muted-foreground">
                      {client.service || "—"}
                    </td>

                    <td className="p-4 capitalize text-muted-foreground">
                      {client.source || "—"}
                    </td>

                    <td className="p-4 text-muted-foreground">
                      {formatDate(getClientCreatedAt(client))}
                    </td>

                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/clients/${client.id}/edit`)}
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              {deleting === client.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this client?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove{" "}
                                {client.name || "this client"}. This cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDelete(client.id, client.name)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {filtered.length} client{filtered.length !== 1 ? "s" : ""}
          </div>
        </Card>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Users, Edit2, Trash2, Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (user?.id) fetchClients();
  }, [user]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (clientId, clientName) => {
    setDeleting(clientId);
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId)
        .eq("user_id", user.id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== clientId));
      toast.success(`${clientName} deleted`);
    } catch (err) {
      toast.error("Failed to delete client");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(query.toLowerCase()) ||
    c.email?.toLowerCase().includes(query.toLowerCase()) ||
    c.service?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">All your clients in one place.</p>
        </div>
        <Button
          onClick={() => navigate("/clients/new")}
          className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />Add Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">
            {clients.length === 0 ? "No clients yet" : "No matches"}
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            {clients.length === 0
              ? "Add your first client to get started."
              : "Try a different search term."}
          </p>
          {clients.length === 0 && (
            <Button
              onClick={() => navigate("/clients/new")}
              className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />Add Client
            </Button>
          )}
        </Card>
      )}

      {/* Clients table */}
      {!loading && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Contact</th>
                  <th className="text-left p-4 font-semibold">Service</th>
                  <th className="text-left p-4 font-semibold">Source</th>
                  <th className="text-left p-4 font-semibold">Added</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/clients/${c.id}/edit`)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-[#FF6B00] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {(c.name || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          {c.status && (
                            <p className="text-xs text-muted-foreground capitalize">{c.status}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {c.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />{c.email}
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />{c.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{c.service || "—"}</td>
                    <td className="p-4 text-muted-foreground capitalize">{c.source || "—"}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(c.created_at)}</td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/clients/${c.id}/edit`)}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              {deleting === c.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this client?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {c.name}. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(c.id, c.name)}
                                className="bg-destructive text-destructive-foreground"
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
          <div className="border-t px-4 py-3 bg-muted/20 text-sm text-muted-foreground">
            {filtered.length} client{filtered.length !== 1 ? "s" : ""}
          </div>
        </Card>
      )}
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollection } from "@/lib/useCollection";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Users, Edit2, Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export default function Clients() {
  const { items: clients, remove } = useCollection("clients");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

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
        <Button onClick={() => navigate("/clients/new")} data-testid="add-client-btn" className="bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-4 h-4 mr-1.5" />Add client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input data-testid="client-search" placeholder="Search clients…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">{clients.length === 0 ? "No clients yet" : "No matches"}</p>
          <p className="text-sm text-muted-foreground mb-5">{clients.length === 0 ? "Start by adding your first client." : "Try a different search."}</p>
          {clients.length === 0 && <Button onClick={() => navigate("/clients/new")} data-testid="empty-add-client" className="bg-foreground text-background"><Plus className="w-4 h-4 mr-1.5" />Add your first client</Button>}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Service</th>
                  <th className="text-left p-4 font-semibold">Contact</th>
                  <th className="text-left p-4 font-semibold">Budget</th>
                  <th className="text-left p-4 font-semibold">Added</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors" data-testid={`client-row-${c.id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">{(c.name || "?").slice(0, 2).toUpperCase()}</div>
                        <p className="font-semibold">{c.name}</p>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{c.service || "—"}</td>
                    <td className="p-4">
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</div>}
                      </div>
                    </td>
                    <td className="p-4 font-medium">{c.budget ? formatCurrency(c.budget) : "—"}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/clients/${c.id}/edit`)} data-testid={`edit-client-${c.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`delete-client-${c.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this client?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently remove {c.name}. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => { remove(c.id); toast.success("Client deleted"); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
        </Card>
      )}
    </div>
  );
}

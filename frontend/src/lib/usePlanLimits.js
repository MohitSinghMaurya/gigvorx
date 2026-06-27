import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCollection } from "@/lib/useCollection";

const LIMITS = {
  trial:   { clients: 10, briefs: 10, invoices: 10, niches: 17 },
  starter: { clients: 10, briefs: 10, invoices: 10, niches: 5  },
  pro:     { clients: Infinity, briefs: Infinity, invoices: Infinity, niches: 17 },
  premium: { clients: Infinity, briefs: Infinity, invoices: Infinity, niches: 17 },
  agency:  { clients: Infinity, briefs: Infinity, invoices: Infinity, niches: 17 },
};

export function usePlanLimits() {
  const { user } = useAuth();
  const { items: clients } = useCollection("clients");
  const { items: briefs } = useCollection("briefs");
  const { items: invoices } = useCollection("invoices");

  const plan = user?.plan || "trial";
  const limits = LIMITS[plan] || LIMITS.trial;

  // Count this month's briefs and invoices
  const thisMonth = new Date();
  const monthlyBriefs = briefs.filter(b => {
    const d = new Date(b.createdAt);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  }).length;

  const monthlyInvoices = invoices.filter(i => {
    const d = new Date(i.createdAt);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  }).length;

  const activeClients = clients.filter(c => c.isLead !== true).length;

  return {
    plan,
    limits,
    usage: {
      clients: activeClients,
      briefs: monthlyBriefs,
      invoices: monthlyInvoices,
    },
    canAddClient: activeClients < limits.clients,
    canAddBrief: monthlyBriefs < limits.briefs,
    canAddInvoice: monthlyInvoices < limits.invoices,
    clientsLeft: Math.max(0, limits.clients - activeClients),
    briefsLeft: Math.max(0, limits.briefs - monthlyBriefs),
    invoicesLeft: Math.max(0, limits.invoices - monthlyInvoices),
    isStarter: plan === "starter",
    isTrial: plan === "trial",
    isPro: ["pro", "premium", "agency"].includes(plan),
  };
}
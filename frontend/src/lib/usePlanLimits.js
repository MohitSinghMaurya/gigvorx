import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCollection } from "@/lib/useCollection";
import { NICHES } from "@/lib/niches";

const STARTER_NICHES = [
  "Web Design",
  "Social Media",
  "Graphic Design",
  "Video Editing",
  "SEO",
];

const ALL_NICHES = NICHES.map((niche) => niche.name);
const ALL_NICHES_COUNT = NICHES.length;

const LIMITS = {
  trial: {
    clients: 10,
    briefs: 10,
    invoices: 10,
    niches: ALL_NICHES_COUNT,
    allowedNiches: ALL_NICHES,
  },
  starter: {
    clients: 10,
    briefs: 10,
    invoices: 10,
    niches: STARTER_NICHES.length,
    allowedNiches: STARTER_NICHES,
  },
  pro: {
    clients: Infinity,
    briefs: Infinity,
    invoices: Infinity,
    niches: ALL_NICHES_COUNT,
    allowedNiches: ALL_NICHES,
  },
  premium: {
    clients: Infinity,
    briefs: Infinity,
    invoices: Infinity,
    niches: ALL_NICHES_COUNT,
    allowedNiches: ALL_NICHES,
  },
  agency: {
    clients: Infinity,
    briefs: Infinity,
    invoices: Infinity,
    niches: ALL_NICHES_COUNT,
    allowedNiches: ALL_NICHES,
  },
};

function isCreatedThisMonth(value) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function usePlanLimits() {
  const { user, profile } = useAuth();
  const { items: clients = [] } = useCollection("clients");
  const { items: briefs = [] } = useCollection("briefs");
  const { items: invoices = [] } = useCollection("invoices");

  const plan = profile?.plan || user?.plan || "trial";

  const limits = useMemo(() => {
    return LIMITS[plan] || LIMITS.trial;
  }, [plan]);

  const usage = useMemo(() => {
    const activeClients = clients.filter((client) => client?.isLead !== true).length;
    const monthlyBriefs = briefs.filter((brief) =>
      isCreatedThisMonth(brief?.createdAt || brief?.created_at)
    ).length;
    const monthlyInvoices = invoices.filter((invoice) =>
      isCreatedThisMonth(invoice?.createdAt || invoice?.created_at)
    ).length;

    return {
      clients: activeClients,
      briefs: monthlyBriefs,
      invoices: monthlyInvoices,
    };
  }, [clients, briefs, invoices]);

  const isNicheAllowed = useMemo(() => {
    return (nicheName) => limits.allowedNiches.includes(nicheName);
  }, [limits.allowedNiches]);

  return {
    plan,
    limits,
    usage,
    canAddClient: usage.clients < limits.clients,
    canAddBrief: usage.briefs < limits.briefs,
    canAddInvoice: usage.invoices < limits.invoices,
    clientsLeft:
      limits.clients === Infinity
        ? Infinity
        : Math.max(0, limits.clients - usage.clients),
    briefsLeft:
      limits.briefs === Infinity
        ? Infinity
        : Math.max(0, limits.briefs - usage.briefs),
    invoicesLeft:
      limits.invoices === Infinity
        ? Infinity
        : Math.max(0, limits.invoices - usage.invoices),
    isStarter: plan === "starter",
    isTrial: plan === "trial",
    isPro: ["pro", "premium", "agency"].includes(plan),
    allowedNiches: limits.allowedNiches,
    isNicheAllowed,
  };
}
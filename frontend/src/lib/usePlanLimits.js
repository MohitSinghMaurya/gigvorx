import { useMemo } from "react";

import { useAuth } from "@/lib/AuthContext";
import { NICHES } from "@/lib/niches";
import { useCollection } from "@/lib/useCollection";

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

function normalizePlan(plan) {
  const value = String(plan || "trial").toLowerCase();
  return LIMITS[value] ? value : "trial";
}

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

function isLead(client) {
  return client?.isLead === true || client?.is_lead === true;
}

function isTrialExpired(user) {
  if (!user || normalizePlan(user.plan) !== "trial") return false;

  const trialEnd = user.trialEndsAt || user.trial_ends_at;
  if (!trialEnd) return false;

  const endDate = new Date(trialEnd);
  if (Number.isNaN(endDate.getTime())) return false;

  return endDate.getTime() <= Date.now();
}

function getLeft(limit, used) {
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - used);
}

export function usePlanLimits() {
  const { user, profile } = useAuth();

  const currentUser = profile || user;
  const plan = normalizePlan(currentUser?.plan);
  const trialExpired = isTrialExpired(currentUser);

  const { items: clients = [] } = useCollection("clients");
  const { items: briefs = [] } = useCollection("briefs");
  const { items: invoices = [] } = useCollection("invoices");

  const limits = useMemo(() => {
    return LIMITS[plan] || LIMITS.trial;
  }, [plan]);

  const usage = useMemo(() => {
    const activeClients = clients.filter((client) => !isLead(client)).length;

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

  const clientsLeft = getLeft(limits.clients, usage.clients);
  const briefsLeft = getLeft(limits.briefs, usage.briefs);
  const invoicesLeft = getLeft(limits.invoices, usage.invoices);

  const canUseTrialFeatures = !(plan === "trial" && trialExpired);

  const isNicheAllowed = useMemo(() => {
    return (nicheName) => limits.allowedNiches.includes(nicheName);
  }, [limits.allowedNiches]);

  return {
    plan,
    limits,
    usage,

    canAddClient: canUseTrialFeatures && usage.clients < limits.clients,
    canAddBrief: canUseTrialFeatures && usage.briefs < limits.briefs,
    canAddInvoice: canUseTrialFeatures && usage.invoices < limits.invoices,

    clientsLeft,
    briefsLeft,
    invoicesLeft,

    isStarter: plan === "starter",
    isTrial: plan === "trial",
    isTrialExpired: trialExpired,
    isPro: ["pro", "premium", "agency"].includes(plan),

    allowedNiches: limits.allowedNiches,
    isNicheAllowed,
  };
}

export default usePlanLimits;
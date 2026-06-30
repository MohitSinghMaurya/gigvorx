// frontend/src/lib/usePlanLimits.js
import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCollection } from "@/lib/useCollection";

// These 5 niches are free on Starter — most commonly needed by freelancers
const STARTER_NICHES = [
  "Web Design",
  "Social Media",
  "Graphic Design",
  "Content Writing",
  "Logo Design",
];

// All 14 niches — available on Pro, Premium, Agency
const ALL_NICHES = [
  "Web Design",
  "Social Media",
  "Graphic Design",
  "Video Editing",
  "SEO",
  "Content Writing",
  "UI/UX Design",
  "Logo Design",
  "App Development",
  "Photography",
  "Illustration",
  "Branding",
  "Marketing Strategy",
  "E-commerce",
  "Custom",
];

const LIMITS = {
  trial:   { clients: 10, briefs: 10, invoices: 10, niches: 14, allowedNiches: ALL_NICHES },
  starter: { clients: 10, briefs: 10, invoices: 10, niches: 5,  allowedNiches: STARTER_NICHES },
  pro:     { clients: Infinity, briefs: Infinity, invoices: Infinity, niches: 14, allowedNiches: ALL_NICHES },
  premium: { clients: Infinity, briefs: Infinity, invoices: Infinity, niches: 14, allowedNiches: ALL_NICHES },
  agency:  { clients: Infinity, briefs: Infinity, invoices: Infinity, niches: 14, allowedNiches: ALL_NICHES },
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

  // Checks if a specific niche name is allowed on the current plan
  const isNicheAllowed = (nicheName) => {
    return limits.allowedNiches.includes(nicheName);
  };

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
    allowedNiches: limits.allowedNiches,
    isNicheAllowed,
  };
}
// Lead pipeline stages, sources, and AI message templates
export const LEAD_STATUSES = [
  { id: "new_lead",       label: "New Lead",       color: "bg-slate-100 text-slate-700 border-slate-200",     dot: "bg-slate-400" },
  { id: "contacted",      label: "Contacted",      color: "bg-sky-100 text-sky-700 border-sky-200",            dot: "bg-sky-500" },
  { id: "interested",     label: "Interested",     color: "bg-blue-100 text-blue-700 border-blue-200",         dot: "bg-blue-500" },
  { id: "call_booked",    label: "Call Booked",    color: "bg-indigo-100 text-indigo-700 border-indigo-200",   dot: "bg-indigo-500" },
  { id: "brief_created",  label: "Brief Created",  color: "bg-violet-100 text-violet-700 border-violet-200",   dot: "bg-violet-500" },
  { id: "proposal_sent",  label: "Proposal Sent",  color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",dot: "bg-fuchsia-500" },
  { id: "invoice_sent",   label: "Invoice Sent",   color: "bg-amber-100 text-amber-700 border-amber-200",      dot: "bg-amber-500" },
  { id: "won",            label: "Won",            color: "bg-emerald-100 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  { id: "lost",           label: "Lost",           color: "bg-rose-100 text-rose-700 border-rose-200",         dot: "bg-rose-500" },
];

export const LEAD_SOURCES = [
  { id: "instagram",      label: "Instagram" },
  { id: "linkedin",       label: "LinkedIn" },
  { id: "facebook",       label: "Facebook" },
  { id: "twitter",        label: "X / Twitter" },
  { id: "referral",       label: "Referral" },
  { id: "website",        label: "Website" },
  { id: "whatsapp",       label: "WhatsApp" },
  { id: "cold_outreach",  label: "Cold Outreach" },
  { id: "other",          label: "Other" },
];

export const findStatus = (id) => LEAD_STATUSES.find(s => s.id === id) || LEAD_STATUSES[0];
export const findSource = (id) => LEAD_SOURCES.find(s => s.id === id);

// AI-style message templates. {placeholders} get replaced with lead data.
export const MESSAGE_TEMPLATES = [
  {
    id: "first_outreach",
    name: "First outreach",
    description: "Open the conversation. Friendly, specific, low-pressure.",
    icon: "Send",
    body: `Hey {name} 👋\n\nI came across your work at {company} and was genuinely impressed. I help founders like you with {service} — would love to share two quick ideas that might move the needle for you.\n\nMind if I send them over?`,
  },
  {
    id: "follow_up",
    name: "Follow-up",
    description: "Gentle nudge if they've gone quiet.",
    icon: "Repeat2",
    body: `Hi {name}, hope your week is going well!\n\nJust circling back on my last note about {service} for {company}. Happy to keep this short — would Tue or Thu at 11:00 work for a 15-min chat?`,
  },
  {
    id: "call_booking",
    name: "Discovery call booking",
    description: "Lock in a discovery call.",
    icon: "Calendar",
    body: `Awesome, {name}! Let's set up a quick discovery call so I can understand your goals better.\n\nHere are two slots that work on my side:\n• Option A — Wed 10:30 AM\n• Option B — Thu 4:00 PM\n\nLet me know which suits you, or share a time that works.`,
  },
  {
    id: "proposal_follow",
    name: "Proposal follow-up",
    description: "Check in after sending a proposal.",
    icon: "FileText",
    body: `Hey {name}, just checking in on the proposal I shared.\n\nHappy to walk you through any section, tweak the scope, or jump on a quick call if it helps you decide.\n\nLooking forward to hearing your thoughts!`,
  },
  {
    id: "payment_reminder",
    name: "Payment reminder",
    description: "Polite reminder for an unpaid invoice.",
    icon: "Receipt",
    body: `Hi {name},\n\nFriendly reminder that invoice for {service} is due. You can pay via the UPI ID / payment link I shared earlier.\n\nLet me know once it's done so I can send a confirmation 🙏`,
  },
  {
    id: "won_thank_you",
    name: "Thank-you (Won)",
    description: "Welcome a client after they say yes.",
    icon: "PartyPopper",
    body: `🎉 Welcome aboard, {name}!\n\nThanks for trusting me with {service} for {company}. I'm already excited to get started.\n\nNext step: I'll share a kickoff doc within 24 hours. Talk soon!`,
  },
];

export function fillTemplate(body, lead) {
  return body
    .replaceAll("{name}", lead?.name?.split(" ")[0] || "there")
    .replaceAll("{company}", lead?.company || "your company")
    .replaceAll("{service}", lead?.service || "the project");
}

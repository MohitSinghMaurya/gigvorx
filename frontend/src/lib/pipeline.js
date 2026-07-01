export const LEAD_STATUSES = [
  {
    id: "new_lead",
    label: "New Lead",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  {
    id: "contacted",
    label: "Contacted",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  {
    id: "interested",
    label: "Interested",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  {
    id: "call_booked",
    label: "Call Booked",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  {
    id: "brief_created",
    label: "Brief Created",
    color: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  {
    id: "invoice_sent",
    label: "Invoice Sent",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  {
    id: "won",
    label: "Won",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    id: "lost",
    label: "Lost",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
];

export const LEAD_SOURCES = [
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "X / Twitter" },
  { id: "referral", label: "Referral" },
  { id: "website", label: "Website" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "cold_outreach", label: "Cold Outreach" },
  { id: "other", label: "Other" },
];

export const findStatus = (id) =>
  LEAD_STATUSES.find((status) => status.id === id) || LEAD_STATUSES[0];

export const findSource = (id) =>
  LEAD_SOURCES.find((source) => source.id === id) || LEAD_SOURCES.at(-1);

export const MESSAGE_TEMPLATES = [
  {
    id: "first_outreach",
    name: "First outreach",
    description: "Open the conversation with a friendly, low-pressure message.",
    icon: "Send",
    body: `Hey {name} 👋

I came across {company} and wanted to reach out. I help businesses with {service}, and I had a couple of ideas that may be useful for you.

Would you like me to send them over?`,
  },
  {
    id: "follow_up",
    name: "Follow-up",
    description: "Gentle nudge if the lead has gone quiet.",
    icon: "Repeat2",
    body: `Hi {name}, hope your week is going well.

Just following up on my last note about {service} for {company}. Happy to keep this short.

Would you be open to a quick 15-minute chat this week?`,
  },
  {
    id: "call_booking",
    name: "Discovery call booking",
    description: "Suggest a simple next step for a discovery call.",
    icon: "Calendar",
    body: `Awesome, {name}.

Let's set up a quick discovery call so I can understand your goals and scope better.

Please share a time that works for you, or I can send over a couple of available slots.`,
  },
  {
    id: "brief_request",
    name: "Brief request",
    description: "Ask the client to complete the project brief.",
    icon: "FileText",
    body: `Hi {name},

To avoid confusion and keep the scope clear, I have prepared a short project brief for {service}.

Please fill it when you get a few minutes. Once I have your answers, I can confirm the next steps clearly.`,
  },
  {
    id: "payment_reminder",
    name: "Payment reminder",
    description: "Polite reminder for a pending invoice.",
    icon: "Receipt",
    body: `Hi {name},

Friendly reminder that the invoice for {service} is still pending.

Please let me know once the payment is done, or tell me if you need the invoice shared again.`,
  },
  {
    id: "won_thank_you",
    name: "Thank-you after approval",
    description: "Welcome a client after they approve the work.",
    icon: "PartyPopper",
    body: `Thank you, {name}.

I am excited to work on {service} for {company}. I will keep the scope, timeline, and next steps clear so everything stays organized from here.`,
  },
];

export function fillTemplate(body, lead) {
  return String(body || "")
    .replaceAll("{name}", lead?.name?.split(" ")[0] || "there")
    .replaceAll("{company}", lead?.company || "your company")
    .replaceAll("{service}", lead?.service || lead?.project || "the project");
}
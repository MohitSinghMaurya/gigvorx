// Lead pipeline stages, sources, and message templates

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
    id: "proposal_sent",
    label: "Proposal Sent",
    color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    dot: "bg-fuchsia-500",
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

export const INVOICE_STATUSES = [
  {
    id: "draft",
    label: "Draft",
    color: "bg-muted text-muted-foreground border-border",
  },
  {
    id: "pending",
    label: "Pending",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    id: "paid",
    label: "Paid",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    id: "overdue",
    label: "Overdue",
    color: "bg-rose-100 text-rose-700 border-rose-200",
  },
];

export const SCOPE_APPROVAL_STATUSES = [
  {
    id: "draft",
    label: "Draft",
    color: "bg-muted text-muted-foreground border-border",
  },
  {
    id: "sent",
    label: "Sent to client",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "approved",
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    id: "changes_requested",
    label: "Changes requested",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
];

export const findStatus = (id) =>
  LEAD_STATUSES.find((status) => status.id === id) || LEAD_STATUSES[0];

export const findSource = (id) =>
  LEAD_SOURCES.find((source) => source.id === id);

export const findInvoiceStatus = (id) =>
  INVOICE_STATUSES.find((status) => status.id === id) || INVOICE_STATUSES[0];

export const findScopeApprovalStatus = (id) =>
  SCOPE_APPROVAL_STATUSES.find((status) => status.id === id) ||
  SCOPE_APPROVAL_STATUSES[0];

export const MESSAGE_TEMPLATES = [
  {
    id: "first_outreach",
    name: "First outreach",
    description: "Open the conversation. Friendly, specific, low-pressure.",
    icon: "Send",
    body: `Hey {name} 👋

I came across your work at {company} and was genuinely impressed. I help founders like you with {service}.

Would you like me to share two quick ideas that could help improve your project or business?`,
  },
  {
    id: "follow_up",
    name: "Follow-up",
    description: "Gentle nudge if the lead has gone quiet.",
    icon: "Repeat2",
    body: `Hi {name}, hope your week is going well.

Just following up on my last message about {service} for {company}. Happy to keep this short.

Would you like to discuss this over a quick call?`,
  },
  {
    id: "brief_request",
    name: "Brief request",
    description: "Ask client to fill intake details clearly.",
    icon: "FileText",
    body: `Hi {name},

To understand your project properly, I will share a short client intake form for {service}.

Please add your goals, references, files, timeline, budget, and any important details. This helps me confirm scope, deliverables, revision limit, payment steps, and next actions clearly.

Thank you.`,
  },
  {
    id: "scope_approval",
    name: "Scope approval",
    description: "Ask client to approve included work, excluded work, and revisions.",
    icon: "CheckCircle2",
    body: `Hi {name},

I have prepared the scope for {service}. Please review the included work, excluded work, revision limit, timeline, and payment terms.

Once you approve the scope and advance payment is completed, I can start the work.

Thank you.`,
  },
  {
    id: "revision_limit",
    name: "Revision limit reminder",
    description: "Politely remind client about agreed revisions.",
    icon: "RefreshCcw",
    body: `Hi {name},

Just a quick reminder that this project includes the agreed revision limit mentioned in the scope.

Please share all feedback clearly in one message/document so I can complete the revision properly and avoid confusion.

Thank you.`,
  },
  {
    id: "advance_payment",
    name: "Advance payment request",
    description: "Ask for advance payment before starting work.",
    icon: "Receipt",
    body: `Hi {name},

The project scope for {service} is ready. As discussed, work will start after the advance payment is completed.

Please let me know once the payment is done, and I will begin the next step.

Thank you.`,
  },
  {
    id: "payment_reminder",
    name: "Payment reminder",
    description: "Polite reminder for an unpaid invoice.",
    icon: "Receipt",
    body: `Hi {name},

Friendly reminder that the invoice for {service} is still pending.

Please complete the payment when possible, or let me know if you need the invoice/payment details shared again.

Thank you.`,
  },
  {
    id: "overdue_payment_reminder",
    name: "Overdue payment reminder",
    description: "Clear reminder for overdue invoice payment.",
    icon: "AlertCircle",
    body: `Hi {name},

This is a polite reminder that the invoice for {service} appears to be overdue.

Please complete the payment as soon as possible, or tell me if there is any issue with the invoice/payment details.

Thank you.`,
  },
  {
    id: "handover_after_payment",
    name: "Final handover after payment",
    description: "Message for final delivery after payment.",
    icon: "PackageCheck",
    body: `Hi {name},

Thank you for completing the payment.

I will now share the final files, links, documents, or handover details for {service}. Please keep them safely and let me know if you need anything else.

Thank you for working with me.`,
  },
  {
    id: "won_thank_you",
    name: "Thank-you after client says yes",
    description: "Welcome a client after they confirm the project.",
    icon: "PartyPopper",
    body: `Welcome aboard, {name}!

Thanks for trusting me with {service} for {company}. I am excited to get started.

Next step: I will confirm the scope, collect required details/files, and share the payment/start process.`,
  },
];

export function fillTemplate(body, lead = {}) {
  return String(body || "")
    .replaceAll("{name}", lead?.name?.split(" ")?.[0] || "there")
    .replaceAll("{company}", lead?.company || "your business")
    .replaceAll("{service}", lead?.service || "the project")
    .replaceAll("{email}", lead?.email || "")
    .replaceAll("{phone}", lead?.phone || "");
}

export function getMessageTemplate(id) {
  return MESSAGE_TEMPLATES.find((template) => template.id === id);
}

export function generateMessage(templateId, lead = {}) {
  const template = getMessageTemplate(templateId);
  if (!template) return "";

  return fillTemplate(template.body, lead);
}

export function cleanClientMessage(message = "") {
  return String(message)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

export function createBriefFromClientMessage(message = "") {
  const cleaned = cleanClientMessage(message);

  if (!cleaned) {
    return {
      title: "New Client Brief",
      summary: "",
      goals: [],
      requirements: [],
      questions: [],
    };
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    title: sentences[0]?.slice(0, 80) || "New Client Brief",
    summary: cleaned,
    goals: sentences.slice(0, 3),
    requirements: sentences.slice(3, 8),
    questions: [
      "What is the main goal of this project?",
      "What files, references, or documents can you provide?",
      "What is your preferred timeline?",
      "What is your budget range?",
      "Who will approve the final work?",
    ],
  };
}

export function buildPaymentReminderMessage(invoice = {}) {
  const clientName =
    invoice.clientName || invoice.client_name || invoice.name || "there";
  const invoiceNumber =
    invoice.invoiceNumber || invoice.invoice_number || "your invoice";
  const amount = invoice.amountText || invoice.totalText || "the pending amount";
  const dueDate = invoice.dueDate || invoice.due_date || "the due date";
  const status = String(invoice.status || "pending").toLowerCase();

  if (status === "overdue") {
    return `Hi ${clientName},

This is a polite reminder that invoice ${invoiceNumber} for ${amount} is overdue. The due date was ${dueDate}.

Please complete the payment as soon as possible, or let me know if you need the invoice/payment details shared again.

Thank you.`;
  }

  return `Hi ${clientName},

This is a friendly reminder for invoice ${invoiceNumber} for ${amount}. The invoice is currently pending and due on ${dueDate}.

Please let me know once the payment is completed, or tell me if you need the invoice shared again.

Thank you.`;
}

export function buildScopeApprovalMessage(brief = {}) {
  const title = brief.title || brief.projectTitle || "your project";
  const clientName = brief.client_name || brief.clientName || "there";
  const meta = brief.answers?.__v1 || {};

  const included = Array.isArray(meta.includedWork)
    ? meta.includedWork.join(", ")
    : meta.includedWork || "included work";
  const excluded = Array.isArray(meta.excludedWork)
    ? meta.excludedWork.join(", ")
    : meta.excludedWork || "excluded work";

  return `Hi ${clientName},

Please review and approve the scope for ${title}.

Included work:
${included}

Not included:
${excluded}

Revision limit: ${meta.revisionLimit || "Not mentioned"}

Once the scope is approved and advance payment is completed, I can start the work.

Thank you.`;
}
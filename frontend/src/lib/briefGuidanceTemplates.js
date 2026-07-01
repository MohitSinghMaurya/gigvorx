export const PROJECT_PROCESS_STEPS = [
  {
    title: "Share project details",
    description:
      "Tell the freelancer what you need, your goals, preferred style, timeline, and budget.",
  },
  {
    title: "Upload useful files",
    description:
      "Attach logos, brand files, PDFs, images, videos, reference links, content, or any existing work.",
  },
  {
    title: "Review the scope",
    description:
      "The freelancer will turn your answers into clear included work, excluded work, timeline, and revision limits.",
  },
  {
    title: "Approve scope and advance",
    description:
      "Work should begin after scope approval and advance payment, if required by the freelancer.",
  },
  {
    title: "Work and revisions",
    description:
      "The freelancer completes the work and uses the agreed revision limit to keep feedback controlled.",
  },
  {
    title: "Final payment and handover",
    description:
      "After final payment, the freelancer hands over final files, links, documents, or deliverables.",
  },
];

export const DEFAULT_CLIENT_CHECKLIST = [
  "Clear project goal",
  "Brand name and business details",
  "Reference links or examples",
  "Logo, images, videos, PDFs, or documents",
  "Content or copy, if available",
  "Preferred timeline",
  "Budget range",
  "Decision-maker contact details",
];

export const BRIEF_GUIDANCE_TEMPLATES = {
  "Web Design": {
    title: "How to prepare for a website project",
    intro:
      "To build the right website, your freelancer needs clear goals, brand assets, content, examples, and technical details.",
    checklist: [
      "Business name and website goal",
      "Pages needed, such as Home, About, Services, Contact",
      "Logo, brand colors, fonts, and images",
      "Website references you like and dislike",
      "Written content for each page, if available",
      "Domain, hosting, or login details, if needed",
      "Timeline and launch deadline",
      "Budget range",
    ],
    tips: [
      "Share examples of websites you like and explain what you like about them.",
      "If content is not ready, tell the freelancer whether you need copywriting help.",
      "Mention must-have features early, such as forms, booking, payments, or blog.",
    ],
  },

  "Social Media": {
    title: "How to prepare for social media work",
    intro:
      "To create useful social media content, your freelancer needs your brand voice, target audience, offers, and examples.",
    checklist: [
      "Social platforms to manage",
      "Brand voice and tone",
      "Target audience details",
      "Products, services, or offers to promote",
      "Existing posts or best-performing content",
      "Brand colors, logo, and design references",
      "Content calendar or campaign dates",
      "Competitor or inspiration accounts",
    ],
    tips: [
      "Share what type of posts you want: educational, promotional, storytelling, or reels.",
      "Mention your main goal: leads, sales, followers, engagement, or awareness.",
      "Give access or screenshots only when necessary and safe.",
    ],
  },

  "Graphic Design": {
    title: "How to prepare for a design project",
    intro:
      "For better design results, your freelancer needs brand details, usage requirements, references, and delivery expectations.",
    checklist: [
      "Design type, such as logo, flyer, packaging, or social posts",
      "Brand name and business details",
      "Logo, colors, fonts, and existing assets",
      "Design references or moodboard",
      "Text/content to include in the design",
      "Required file formats",
      "Where the design will be used",
      "Deadline and revision expectations",
    ],
    tips: [
      "Explain the feeling you want the design to create: premium, friendly, bold, minimal, etc.",
      "Share examples you do not like too, so the freelancer avoids the wrong direction.",
      "Confirm final file needs early, such as PNG, PDF, SVG, AI, PSD, or print-ready files.",
    ],
  },

  "Video Editing": {
    title: "How to prepare for video editing",
    intro:
      "To edit faster and better, your freelancer needs raw footage, references, platform details, and final output requirements.",
    checklist: [
      "Raw footage or download links",
      "Reference video style",
      "Target platform, such as YouTube, Reels, TikTok, or LinkedIn",
      "Logo, intro, outro, music, or brand assets",
      "Script, captions, or talking points",
      "Video length requirement",
      "Thumbnail or short clips needed",
      "Deadline and revision limit",
    ],
    tips: [
      "Upload footage in one organized folder if possible.",
      "Mention the exact style you want: cinematic, fast cuts, clean talking head, or motion graphics.",
      "Tell the freelancer if subtitles, music, sound effects, or color grading are required.",
    ],
  },

  SEO: {
    title: "How to prepare for SEO work",
    intro:
      "For SEO work, your freelancer needs website access, target keywords, current performance, and business goals.",
    checklist: [
      "Website URL",
      "Target services or products",
      "Target keywords, if known",
      "Target locations",
      "Competitor websites",
      "Google Analytics or Search Console access/screenshots",
      "Previous SEO reports, if available",
      "Main goal: traffic, leads, local ranking, or sales",
    ],
    tips: [
      "SEO takes time, so share realistic goals and important pages first.",
      "If you have old SEO reports, upload them so the freelancer understands past work.",
      "Mention your target location clearly if local SEO matters.",
    ],
  },

  Default: {
    title: "How to prepare your project details",
    intro:
      "Clear details help your freelancer understand the work, avoid confusion, and deliver faster.",
    checklist: DEFAULT_CLIENT_CHECKLIST,
    tips: [
      "Explain what you want in simple words.",
      "Attach examples, documents, images, videos, or links wherever possible.",
      "Mention what is included, what is not included, your timeline, and your budget.",
    ],
  },
};

export function getBriefGuidanceTemplate(nicheName) {
  return BRIEF_GUIDANCE_TEMPLATES[nicheName] || BRIEF_GUIDANCE_TEMPLATES.Default;
}

export function createDefaultClientEducation(nicheName) {
  const template = getBriefGuidanceTemplate(nicheName);

  return {
    enabled: true,
    title: template.title,
    intro: template.intro,
    videoUrl: "",
    audioUrl: "",
    imageUrls: [],
    documentUrls: [],
    checklist: template.checklist,
    tips: template.tips,
    processSteps: PROJECT_PROCESS_STEPS,
  };
}
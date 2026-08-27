/**
 * Keys align with client docs: Technology Readiness, Digital Skill Program,
 * Home Page, Skill Builder Labs, Tech Career Pathways, Technical lab manuals.
 */
const SECTION_KEYS = [
  "technology_readiness_assessment",
  "digital_skill_program",
  "home_page_highlights",
  "skill_builder_labs",
  "tech_career_pathways",
  "expert_led_training",
  "technical_lab_manual_azure_storage_java",
];

const DEFAULTS = {
  technology_readiness_assessment: {
    title: "Technology Readiness Assessment",
    subtitle: "Evaluate your skills and get a tailored learning plan.",
    body: {
      html: "<p>Configure this page in <strong>Admin → Digital Programs → Technology Readiness</strong>.</p>",
      bullets: [],
      links: [],
    },
  },
  digital_skill_program: {
    title: "Digital Skill Program",
    subtitle: "Structured programs toward certification and job readiness.",
    body: { html: "<p>Describe your digital skill program offering here.</p>", bullets: [], links: [] },
  },
  home_page_highlights: {
    title: "Home Page Highlights",
    subtitle: "Banner copy and featured messaging for the public home page.",
    body: { html: "<p>Short headline and CTA text for the homepage.</p>", bullets: [], links: [] },
  },
  skill_builder_labs: {
    title: "Skill Builder Labs",
    subtitle: "Hands-on labs with interactive skill builder tasks.",
    body: { html: "<p>Explain how Skill Builder labs work and how learners progress.</p>", bullets: [], links: [] },
  },
  tech_career_pathways: {
    title: "Tech Career Pathways",
    subtitle: "Role-based pathways (Cloud, DevOps, Security, etc.).",
    body: { html: "<p>Outline pathways and how learners choose a track.</p>", bullets: [], links: [] },
  },
  expert_led_training: {
    title: "Expert-Led Technology Training",
    subtitle: "Live sessions with expert instructors.",
    body: { html: "<p>Describe expert-led offerings and scheduling.</p>", bullets: [], links: [] },
  },
  technical_lab_manual_azure_storage_java: {
    title: "Technical Lab: Azure Storage (Java)",
    subtitle: "LAB-204 — Develop Storage Solution with Azure Storage",
    body: {
      html: "<p>Upload or paste the lab manual summary. Link to full lab steps in your course or lab catalog.</p>",
      bullets: ["Manual reference: Develop Storage Solution with Azure Storage [Java]"],
      links: [{ label: "Browse skill labs", href: "/labs" }],
    },
  },
};

function isAllowedKey(key) {
  return SECTION_KEYS.includes(key);
}

module.exports = { SECTION_KEYS, DEFAULTS, isAllowedKey };

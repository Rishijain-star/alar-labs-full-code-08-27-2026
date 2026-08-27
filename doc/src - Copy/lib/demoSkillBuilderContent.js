
import { mapApiLabToRunner } from "@/lib/mapApiLabToRunner";

export const DEMO_SKILL_BUILDER_META = {
  title: "Azure Storage Solutions – Skill Validation",
  code: "SBL-AZ-204-02",
  platform: "Azure",
  level: "Intermediate",
  duration: "45 minutes",
  credits: "5 Credits",
  timerSec: 2700,
  rating: 4.7,
  passingScore: 70,
  maxAttempts: 3,
  shuffleOptions: true,
  showCorrectAnswers: true,
  showExplanations: true,
  certificateOnPass: true,
  passMessage: "🎉 Excellent! You've validated your Azure Storage skills.",
  failMessage: "Don't give up! Review the concepts and try again. 💪",
  skillsTested: [
    "Azure Blob Storage",
    "Storage Account configuration",
    "Access control",
    "SAS tokens",
  ],
};

export const DEMO_SKILL_BUILDER_TASKS = [
  {
    id: "t1",
    type: "mcq",
    section: "Storage Fundamentals",
    question:
      "Which Azure Storage service is best suited for storing unstructured binary data like images and videos?",
    points: 10,
    options: [
      { id: "a", text: "Azure Table Storage" },
      { id: "b", text: "Azure Blob Storage" },
      { id: "c", text: "Azure Queue Storage" },
      { id: "d", text: "Azure File Storage" },
    ],
    correctOptions: ["b"],
    explanation:
      "Azure Blob Storage is optimized for storing massive amounts of unstructured data such as text or binary data — perfect for images, videos, documents, and backups.",
    hint: "Think about which service stores Binary Large Objects.",
  },
  {
    id: "t2",
    type: "multi_select",
    section: "Storage Fundamentals",
    question: "Which of the following are valid Azure Blob Storage access tiers? (Select all that apply)",
    points: 15,
    options: [
      { id: "a", text: "Hot" },
      { id: "b", text: "Cool" },
      { id: "c", text: "Warm" },
      { id: "d", text: "Archive" },
      { id: "e", text: "Frozen" },
    ],
    correctOptions: ["a", "b", "d"],
    explanation:
      "Azure Blob Storage offers three access tiers: Hot (frequently accessed data), Cool (infrequently accessed data stored for at least 30 days), and Archive (rarely accessed data stored for at least 180 days).",
    hint: "There are exactly 3 valid tiers.",
  },
  {
    id: "t3",
    type: "true_false",
    section: "Storage Fundamentals",
    question: "A Shared Access Signature (SAS) token grants permanent access to Azure Storage resources.",
    points: 10,
    correctAnswer: "false",
    explanation:
      "SAS tokens are time-limited. They grant temporary, delegated access to storage resources for a specified period. You define the start time, expiry time, and permissions when creating the SAS.",
  },
  {
    id: "t4",
    type: "fill_blank",
    section: "Configuration",
    question:
      "To allow anonymous public read access to blobs in a container, the container access level must be set to _____ or _____.",
    points: 15,
    blanks: [
      { id: "b1", answer: "Blob", caseSensitive: false },
      { id: "b2", answer: "Container", caseSensitive: false },
    ],
    explanation:
      "Setting access level to 'Blob' allows public read access to blobs only. 'Container' allows public read access to the container and its blobs including listing all blobs.",
  },
  {
    id: "t5",
    type: "drag_drop",
    section: "Configuration",
    question: "Match each Azure Storage redundancy type with its correct description.",
    points: 20,
    pairs: [
      { id: "p1", left: "LRS", right: "3 copies in a single data center" },
      { id: "p2", left: "GRS", right: "6 copies across two geographic regions" },
      { id: "p3", left: "ZRS", right: "3 copies across availability zones" },
      { id: "p4", left: "GZRS", right: "Combines ZRS with GRS protection" },
    ],
    explanation:
      "Understanding redundancy options is critical: LRS (Locally Redundant Storage), ZRS (Zone-Redundant Storage), GRS (Geo-Redundant Storage), and GZRS (Geo-Zone-Redundant Storage) each offer different durability levels.",
  },
  {
    id: "t6",
    type: "code_challenge",
    section: "Hands-on Code",
    question:
      "Complete the Azure CLI command to upload a file named `app.log` to a container called `logs` in storage account `myaccount`.",
    points: 20,
    language: "bash",
    starterCode:
      "az storage blob upload \\\n  --account-name ______ \\\n  --container-name ______ \\\n  --name app.log \\\n  --file ./app.log \\\n  --auth-mode login",
    solutionCode:
      "az storage blob upload \\\n  --account-name myaccount \\\n  --container-name logs \\\n  --name app.log \\\n  --file ./app.log \\\n  --auth-mode login",
    explanation:
      "The `az storage blob upload` command requires `--account-name` (your storage account name) and `--container-name` (target container). The `--auth-mode login` flag uses your Azure AD credentials.",
  },
  {
    id: "t7",
    type: "short_answer",
    section: "Hands-on Code",
    question:
      "Explain in 2–3 sentences how you would secure access to an Azure Storage container so that only authenticated users from your organization can read blobs, without using SAS tokens.",
    points: 10,
    modelAnswer:
      "Use Azure Role-Based Access Control (RBAC) by assigning the 'Storage Blob Data Reader' role to the users or groups in Azure Active Directory. Configure the storage account to require Azure AD authentication (disable shared key authorization). Access is then controlled through AAD identities without needing SAS tokens.",
    keywords: ["RBAC", "Azure AD", "role", "Storage Blob Data Reader"],
    wordLimit: 80,
  },
];

const DEMO_TOTAL_POINTS = DEMO_SKILL_BUILDER_TASKS.reduce((s, t) => s + (Number(t.points) || 0), 0);

/** API-shaped lab (no DB row) — mapApiLabToRunner → LabDetail runner */
export function getDemoSkillBuilderRawLab() {
  return {
    id: "00000000-0000-4000-8000-00000000d3e0",
    slug: "demo",
    title: DEMO_SKILL_BUILDER_META.title,
    description:
      "Hands-on Skill Builder demo — same experience as starting a lab from the catalog. Sign in to track progress.",
    thumbnail: null,
    course_id: null,
    is_free: true,
    price: 0,
    time_limit_minutes: 45,
    difficulty: "intermediate",
    status: "published",
    metadata: { lab_kind: "skill_builder" },
    instructions: {
      code: DEMO_SKILL_BUILDER_META.code,
      platform: DEMO_SKILL_BUILDER_META.platform,
      credits: DEMO_SKILL_BUILDER_META.credits,
      skillBuilder: {
        meta: {
          title: DEMO_SKILL_BUILDER_META.title,
          platform: DEMO_SKILL_BUILDER_META.platform,
          level: DEMO_SKILL_BUILDER_META.level,
          duration: DEMO_SKILL_BUILDER_META.duration,
          credits: DEMO_SKILL_BUILDER_META.credits,
          timerSec: DEMO_SKILL_BUILDER_META.timerSec,
          rating: DEMO_SKILL_BUILDER_META.rating,
          isFree: true,
        },
        overview: {
          skillsTested: DEMO_SKILL_BUILDER_META.skillsTested,
        },
        settings: {
          passingScore: DEMO_SKILL_BUILDER_META.passingScore,
          maxAttempts: DEMO_SKILL_BUILDER_META.maxAttempts,
          shuffleOptions: DEMO_SKILL_BUILDER_META.shuffleOptions,
          showCorrectAnswers: DEMO_SKILL_BUILDER_META.showCorrectAnswers,
          showExplanations: DEMO_SKILL_BUILDER_META.showExplanations,
          certificateOnPass: DEMO_SKILL_BUILDER_META.certificateOnPass,
          passMessage: DEMO_SKILL_BUILDER_META.passMessage,
          failMessage: DEMO_SKILL_BUILDER_META.failMessage,
        },
        tasks: DEMO_SKILL_BUILDER_TASKS,
        _meta: { totalPoints: DEMO_TOTAL_POINTS, taskCount: DEMO_SKILL_BUILDER_TASKS.length },
      },
    },
  };
}

export function getDemoSkillBuilderRunner() {
  return mapApiLabToRunner(getDemoSkillBuilderRawLab());
}

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "@/lib/toast";
import { useCreateSkillBuilderLabFullMutation } from "@/store/api/labApi";
import { setLastCreated } from "@/store/slices/labSlice";
import { buildSkillBuilderPayload } from "@/lib/skillBuilderPayload";
import {
  ArrowLeft, ArrowRight, Save, Upload, X, Plus, GripVertical,
  Image as ImageIcon, Code2, AlertCircle,
  ChevronDown, ChevronUp, FlaskConical, BookOpen, Settings,
  CheckCircle, Layers, Link, Bold, Italic, Underline,
  AlignLeft, AlignCenter, Hash, ToggleLeft, Eye,
  Target, Brain, PenLine, List, LayoutGrid, Zap, Trophy,
  Clock, Star, Users, DollarSign, Tag, FileText, Move, Award,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import SectionHeader from "../../components/ui/section-header";
import FieldLabel from "../../components/ui/fieldlabel";
import MediaUploader from "../../components/ui/media-uploader";
import TaskEditor from "../../components/ui/taskeditor";

// ─── Constants ────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basic Info", icon: FlaskConical, desc: "Lab metadata & settings" },
  { id: 2, label: "Media & Skills", icon: BookOpen, desc: "Thumbnail & learning outcomes" },
  { id: 3, label: "Tasks & Quiz", icon: Target, desc: "Questions, exercises & scoring" },
  { id: 4, label: "Settings", icon: Settings, desc: "Scoring, attempts & publish" },
  { id: 5, label: "Review", icon: CheckCircle, desc: "Preview & publish" },
];

const PLATFORMS = ["AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Linux", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const CATEGORIES = ["Cloud Computing", "DevOps", "Cybersecurity", "Data Science", "Networking", "Programming", "Database", "AI / ML"];

// Task types with icons and descriptions
const TASK_TYPES = [
  { value: "mcq", label: "Multiple Choice", icon: "🔘", desc: "Single correct answer from options" },
  { value: "multi_select", label: "Multi Select", icon: "☑️", desc: "Multiple correct answers" },
  { value: "fill_blank", label: "Fill in the Blank", icon: "✏️", desc: "Type the missing word/phrase" },
  { value: "code_challenge", label: "Code Challenge", icon: "⚡", desc: "Write or fix code to pass tests" },
  { value: "drag_drop", label: "Drag & Drop", icon: "↕️", desc: "Match or order items correctly" },
  { value: "true_false", label: "True / False", icon: "✅", desc: "Is the statement correct?" },
  { value: "short_answer", label: "Short Answer", icon: "📝", desc: "Free text answer (manual grading)" },
];

const CODE_LANGS = ["bash", "python", "javascript", "typescript", "yaml", "json", "sql", "dockerfile", "go", "java", "rust", "hcl"];
const DIFF_COLORS = { Beginner: "bg-green-100 text-green-700", Intermediate: "bg-blue-100 text-blue-700", Advanced: "bg-orange-100 text-orange-700", Expert: "bg-red-100 text-red-700" };

/** Persist wizard state locally until successful publish (files are not stored). */
const SKILL_BUILDER_DRAFT_KEY = "pm_skill_builder_lab_draft_v1";

function loadSkillBuilderDraft() {
  try {
    const raw = localStorage.getItem(SKILL_BUILDER_DRAFT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    return o;
  } catch {
    return null;
  }
}

function clearSkillBuilderDraft() {
  try {
    localStorage.removeItem(SKILL_BUILDER_DRAFT_KEY);
  } catch { /* ignore */ }
}

let _uid = 0;
const uid = () => `id_${++_uid}_${Math.random().toString(36).slice(2, 6)}`;


// ─── Task Type Badge ──────────────────────────────────────────────────────
const TaskTypeBadge = ({ type }) => {
  const t = TASK_TYPES.find(t => t.value === type) || TASK_TYPES[0];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
      {t.icon} {t.label}
    </span>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// STEP 1 – Basic Info
// ═══════════════════════════════════════════════════════════════════════════
function Step1({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-5">
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={FlaskConical} title="Skill Builder Lab Details" subtitle="Core information shown on the lab listing and overview pages" />
          <div className="space-y-4">
            <div>
              <FieldLabel required>Lab Title</FieldLabel>
              <Input placeholder="e.g. Kubernetes Fundamentals Skill Check"
                value={data.title} onChange={e => set("title", e.target.value)} className="bg-muted/30" />
              <p className="text-xs text-muted-foreground mt-2">
                When you connect this flow to <span className="font-mono">POST /owner/labs/create-full</span>, the URL slug and lab code are generated from the title (same as standard labs).
              </p>
            </div>
            <div>
              <FieldLabel required hint="~150–200 chars shown in lab listing card">Short Description</FieldLabel>
              <Textarea placeholder="Test and validate your hands-on skills with real-world scenario-based tasks..."
                value={data.description} onChange={e => set("description", e.target.value)}
                className="bg-muted/30 min-h-[80px]" />
              <p className="text-xs text-muted-foreground mt-1 text-right">{data.description?.length || 0} chars</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel required>Platform</FieldLabel>
                <Select value={data.platform} onValueChange={v => set("platform", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel required>Difficulty Level</FieldLabel>
                <Select value={data.level} onValueChange={v => set("level", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel required>Category</FieldLabel>
                <Select value={data.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={Settings} title="Lab Settings" subtitle="Duration, credits, timer and scoring" />
          <div className="grid grid-cols-4 gap-4">
            <div>
              <FieldLabel hint="e.g. 45 minutes">Duration</FieldLabel>
              <Input value={data.duration} onChange={e => set("duration", e.target.value)} placeholder="45 minutes" className="bg-muted/30" />
            </div>
            <div>
              <FieldLabel hint="e.g. 5 Credits">Credits</FieldLabel>
              <Input value={data.credits} onChange={e => set("credits", e.target.value)} placeholder="5 Credits" className="bg-muted/30" />
            </div>
            <div>
              <FieldLabel hint="Countdown timer in seconds">Timer (seconds)</FieldLabel>
              <Input type="number" value={data.timerSec} onChange={e => set("timerSec", e.target.value)} className="bg-muted/30" />
            </div>
            <div>
              <FieldLabel hint="0.0–5.0 star rating">Rating</FieldLabel>
              <Input type="number" step="0.1" min="0" max="5"
                value={data.rating} onChange={e => set("rating", e.target.value)} className="bg-muted/30" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={ToggleLeft} title="Pricing & Enrollment" subtitle="Free/Paid badge and enrollment count" />
          <div className="grid grid-cols-3 gap-4 items-start">
            <div>
              <FieldLabel>Pricing</FieldLabel>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{data.isFree ? "Free Lab" : "Paid Lab"}</p>
                  <p className="text-xs text-muted-foreground">{data.isFree ? "No cost" : "Requires purchase"}</p>
                </div>
                <Switch checked={!data.isFree} onCheckedChange={v => set("isFree", !v)} />
              </div>
            </div>
            {!data.isFree && (
              <div>
                <FieldLabel hint="USD price">Price ($)</FieldLabel>
                <Input type="number" step="0.01" value={data.price} onChange={e => set("price", e.target.value)}
                  placeholder="19.99" className="bg-muted/30" />
              </div>
            )}
            <div>
              <FieldLabel hint="Starting enrolled count">Enrolled Count</FieldLabel>
              <Input type="number" value={data.enrolledCount} onChange={e => set("enrolledCount", e.target.value)} className="bg-muted/30" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2 – Media & Skills
// ═══════════════════════════════════════════════════════════════════════════
function Step2({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const updateList = (key, i, val) => { const a = [...(data[key] || [])]; a[i] = val; set(key, a); };
  const addListItem = (key) => set(key, [...(data[key] || []), ""]);
  const removeListItem = (key, i) => set(key, (data[key] || []).filter((_, j) => j !== i));
  const thumbPreview = data._thumbnailFile ? URL.createObjectURL(data._thumbnailFile) : data.thumbnail || "";

  return (
    <div className="space-y-5">
      {/* Thumbnail */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={ImageIcon} title="Lab Thumbnail" subtitle="Shown on the lab listing card. Recommended: 900×500px" />
          <div className="grid grid-cols-2 gap-6">
            <MediaUploader
              accept="image"
              value={data._thumbnailFile || null}
              previewUrl={typeof data.thumbnail === "string" && !data._thumbnailFile ? data.thumbnail : ""}
              onChange={(f) => { set("_thumbnailFile", f); if (!f) set("thumbnail", ""); }}
              maxMB={5}
              label="Thumbnail"
              hint="JPG / PNG / WebP, max 5MB"
            />
            <div>
              <FieldLabel>Preview</FieldLabel>
              <div className="aspect-video rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
                {thumbPreview ? (
                  <img src={thumbPreview} alt="preview" className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = "none"; }} />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No image selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills tested */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={Target} title="Skills Tested" subtitle="Tags shown on the lab card — what skills this lab validates" />
          <div className="space-y-2">
            {(data.skillsTested || [""]).map((skill, i) => (
              <div key={i} className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                <Input value={skill} onChange={e => updateList("skillsTested", i, e.target.value)}
                  placeholder={`e.g. kubectl commands, Pod management`}
                  className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                  onClick={() => removeListItem("skillsTested", i)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-1 text-primary border-primary/30"
              onClick={() => addListItem("skillsTested")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Skill
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What you'll learn */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={CheckCircle} title="What You'll Validate" subtitle="Learning outcomes — shown in overview page (2-column grid)" />
          <div className="space-y-2">
            {(data.whatYouLearn || [""]).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-green-500 text-sm flex-shrink-0">✓</span>
                <Input value={item} onChange={e => updateList("whatYouLearn", i, e.target.value)}
                  placeholder={`Validation outcome ${i + 1}`} className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                  onClick={() => removeListItem("whatYouLearn", i)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-1 text-primary border-primary/30"
              onClick={() => addListItem("whatYouLearn")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Outcome
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={FileText} title="Prerequisites" subtitle="What the learner should know before attempting this skill builder" />
          <div className="space-y-2">
            {(data.requirements || [""]).map((req, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <Input value={req} onChange={e => updateList("requirements", i, e.target.value)}
                  placeholder={`Prerequisite ${i + 1}`} className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                  onClick={() => removeListItem("requirements", i)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-1 text-primary border-primary/30"
              onClick={() => addListItem("requirements")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Prerequisite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Section */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={Award} title="Completion Certificate" subtitle="Issue a certificate on lab completion" />
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border mt-4 mb-5">
            <div>
              <p className="text-sm font-semibold">{data.certificateEnabled ? "Certificate Enabled ✅" : "Certificate Disabled"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{data.certificateEnabled ? "Students will receive a certificate upon completion" : "No certificate will be issued"}</p>
            </div>
            <Switch checked={!!data.certificateEnabled} onCheckedChange={v => set("certificateEnabled", v)} />
          </div>
          {data.certificateEnabled && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Certificate Title</FieldLabel>
                <Input
                  value={data.certificateTitle || ""}
                  onChange={(e) => set("certificateTitle", e.target.value)}
                  placeholder="e.g. AWS Cloud Fundamentals Completion Certificate"
                  className="bg-muted/30"
                />
              </div>
              <div>
                <FieldLabel>Certificate Type</FieldLabel>
                <Select value={data.certificateType || "completion"} onValueChange={(v) => set("certificateType", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select certificate type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completion">Completion Certificate</SelectItem>
                    <SelectItem value="excellence">Excellence Certificate</SelectItem>
                    <SelectItem value="participation">Participation Certificate</SelectItem>
                    <SelectItem value="skill">Skill Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Minimum Progress Required (%)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={data.certificateMinProgress || 80}
                  onChange={(e) => set("certificateMinProgress", e.target.value)}
                  className="bg-muted/30"
                />
              </div>
              <div>
                <FieldLabel>Certificate Thumbnail / Badge URL</FieldLabel>
                <Input
                  value={data.certificateThumbnail || ""}
                  onChange={(e) => set("certificateThumbnail", e.target.value)}
                  placeholder="https://..."
                  className="bg-muted/30"
                />
              </div>
              <div>
                <FieldLabel>Certificate Description</FieldLabel>
                <Textarea
                  value={data.certificateDescription || ""}
                  onChange={(e) => set("certificateDescription", e.target.value)}
                  placeholder="Students will receive an industry-recognized completion certificate after successfully finishing the course."
                  rows={3}
                  className="bg-muted/30"
                />
              </div>
              <div>
                <FieldLabel>Verification Text</FieldLabel>
                <Textarea
                  value={data.certificateVerificationText || ""}
                  onChange={(e) => set("certificateVerificationText", e.target.value)}
                  placeholder="Issued and verified by ALAR Labs Learning & Innovation."
                  rows={2}
                  className="bg-muted/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">Require Quiz Passing</p>
                  </div>
                  <Switch checked={!!data.certificateRequireQuiz} onCheckedChange={v => set("certificateRequireQuiz", v)} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">Require All Tasks Completion</p>
                  </div>
                  <Switch checked={!!data.certificateRequireTasks} onCheckedChange={v => set("certificateRequireTasks", v)} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3 – Tasks & Quiz
// ═══════════════════════════════════════════════════════════════════════════
function Step3({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const tasks = data.tasks || [];

  const addTask = (type = "mcq") => {
    const newTask = {
      id: uid(), type,
      question: "", context: "", contextLang: "none",
      points: "10", timeLimit: "", hasHint: false, required: true,
      section: "",
      // MCQ / Multi
      options: [
        { id: uid(), text: "" },
        { id: uid(), text: "" },
        { id: uid(), text: "" },
        { id: uid(), text: "" },
      ],
      correctOptions: [],
      // True/False
      correctAnswer: "",
      // Fill blank
      blanks: [{ id: uid(), answer: "", caseSensitive: false }],
      variations: "",
      // Code
      language: "bash", codeMode: "write", starterCode: "", solutionCode: "", testCases: "",
      // Drag drop
      pairs: [{ id: uid(), left: "", right: "" }, { id: uid(), left: "", right: "" }],
      // Short answer
      modelAnswer: "", keywords: "", wordLimit: "",
      // Common
      hint: "", explanation: "",
    };
    set("tasks", [...tasks, newTask]);
  };

  const updateTask = (id, updated) => set("tasks", tasks.map(t => t.id === id ? { ...updated, id } : t));
  const removeTask = (id) => set("tasks", tasks.filter(t => t.id !== id));
  const moveTask = (idx, dir) => {
    const arr = [...tasks];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    set("tasks", arr);
  };

  // Total points
  const totalPoints = tasks.reduce((s, t) => s + (Number(t.points) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
        <Brain className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Skill Builder Tasks:</strong> Each task is an interactive challenge the learner must complete.
          Mix question types to create a comprehensive skill assessment.
          {totalPoints > 0 && <span className="ml-2 font-semibold">Total: {totalPoints} points</span>}
        </div>
      </div>

      {/* Task type quick-add buttons */}
      <div className="flex flex-wrap gap-2">
        {TASK_TYPES.map(t => (
          <Button key={t.value} type="button" variant="outline"
            className="border-dashed text-muted-foreground hover:text-primary hover:border-primary h-8 text-xs gap-1"
            onClick={() => addTask(t.value)}>
            <Plus className="w-3 h-3" /> {t.icon} {t.label}
          </Button>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="text-xs mt-1">Click any task type above to add your first question</p>
        </div>
      )}

      {tasks.map((task, i) => (
        <TaskEditor key={task.id} task={task} index={i} total={tasks.length}
          onUpdate={updated => updateTask(task.id, updated)}
          onRemove={() => removeTask(task.id)}
          onMove={dir => moveTask(i, dir)} />
      ))}

      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {TASK_TYPES.map(t => (
            <Button key={t.value} type="button" variant="outline"
              className="border-dashed text-muted-foreground hover:text-primary hover:border-primary h-8 text-xs gap-1"
              onClick={() => addTask(t.value)}>
              <Plus className="w-3 h-3" /> {t.icon} {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4 – Settings
// ═══════════════════════════════════════════════════════════════════════════
function Step4({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-5">
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={Trophy} title="Scoring & Passing" subtitle="How the lab is graded and when learner passes" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel required hint="Minimum % to pass (e.g. 70)">Passing Score (%)</FieldLabel>
              <Input type="number" min="0" max="100" value={data.passingScore || "70"}
                onChange={e => set("passingScore", e.target.value)} className="bg-muted/30" />
            </div>
            <div>
              <FieldLabel hint="How many times can learner attempt">Max Attempts</FieldLabel>
              <Input type="number" min="1" value={data.maxAttempts || "3"}
                onChange={e => set("maxAttempts", e.target.value)} className="bg-muted/30" />
            </div>
            <div>
              <FieldLabel hint="Minutes between retry attempts">Retry Cooldown (min)</FieldLabel>
              <Input type="number" min="0" value={data.retryCooldown || "0"}
                onChange={e => set("retryCooldown", e.target.value)} className="bg-muted/30" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={Settings} title="Lab Behavior" subtitle="Control how learners interact with this lab" />
          <div className="space-y-3">
            {[
              { key: "isPublished", label: "Published", desc: "Make this lab visible to learners immediately" },
              { key: "shuffleQuestions", label: "Shuffle Questions", desc: "Randomize task order for each attempt" },
              { key: "shuffleOptions", label: "Shuffle Options", desc: "Randomize MCQ option order" },
              { key: "showCorrectAnswers", label: "Show Correct Answers", desc: "Reveal answers after submission" },
              { key: "showExplanations", label: "Show Explanations", desc: "Show explanation text after each task" },
              { key: "allowSkip", label: "Allow Skip", desc: "Let learners skip a task and return later" },
              { key: "requireSequential", label: "Sequential Tasks", desc: "Learner must complete tasks in order" },
              { key: "certificateOnPass", label: "Certificate on Pass", desc: "Issue completion certificate when learner passes" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3.5 hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={!!data[key]} onCheckedChange={v => set(key, v)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={FileText} title="Completion Message" subtitle="Shown to learner after submitting the lab" />
          <div className="space-y-3">
            <div>
              <FieldLabel>Pass Message</FieldLabel>
              <Textarea value={data.passMessage || ""} onChange={e => set("passMessage", e.target.value)}
                placeholder="🎉 Congratulations! You have successfully validated your skills in this lab."
                rows={2} className="bg-muted/30" />
            </div>
            <div>
              <FieldLabel>Fail / Retry Message</FieldLabel>
              <Textarea value={data.failMessage || ""} onChange={e => set("failMessage", e.target.value)}
                placeholder="Don't give up! Review the concepts and try again. You can do it! 💪"
                rows={2} className="bg-muted/30" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5 – Review & Publish
// ═══════════════════════════════════════════════════════════════════════════
function Step5({ all }) {
  const { basic = {}, media = {}, tasks: rawTasks = [], settings = {} } = all;
  const tasks = rawTasks;
  const [showJSON, setShowJSON] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalPoints = tasks.reduce((s, t) => s + (Number(t.points) || 0), 0);
  const tasksByType = TASK_TYPES.map(t => ({ ...t, count: tasks.filter(task => task.type === t.value).length })).filter(t => t.count > 0);

  const output = buildSkillBuilderPayload({ basic, media, tasks, settings });

  const jsonStr = JSON.stringify(output, null, 2);
  const copy = async () => {
    try { await navigator.clipboard.writeText(jsonStr); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { }
  };

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: tasks.length, icon: Target, bg: "bg-blue-50", fg: "text-blue-600" },
          { label: "Total Points", value: totalPoints, icon: Trophy, bg: "bg-amber-50", fg: "text-amber-600" },
          { label: "Skills Tested", value: (media.skillsTested || []).filter(Boolean).length, icon: Zap, bg: "bg-green-50", fg: "text-green-600" },
          { label: "Passing Score", value: `${settings.passingScore || 70}%`, icon: CheckCircle, bg: "bg-purple-50", fg: "text-purple-600" },
        ].map(({ label, value, icon: Icon, bg, fg }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", bg)}><Icon className={cn("w-4 h-4", fg)} /></div>
              <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task type breakdown */}
      {tasksByType.length > 0 && (
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <SectionHeader icon={Brain} title="Task Breakdown" subtitle="Distribution of question types" />
            <div className="flex flex-wrap gap-2">
              {tasksByType.map(t => (
                <div key={t.value} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20">
                  <span>{t.icon}</span>
                  <span className="text-sm font-medium">{t.label}</span>
                  <Badge variant="secondary" className="text-xs">{t.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic summary */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={CheckCircle} title="Lab Summary" subtitle="Review all details before publishing" />
          <div className="grid grid-cols-2 gap-0">
            {[
              ["Title", basic.title || "Not set"],
              ["URL / code", "Generated on publish"],
              ["Platform", basic.platform || "Not set"],
              ["Level", basic.level || "Not set"],
              ["Category", basic.category || "Not set"],
              ["Duration", basic.duration || "—"],
              ["Credits", basic.credits || "—"],
              ["Timer", `${basic.timerSec || 2700}s`],
              ["Rating", `${basic.rating || 4.8} ⭐`],
              ["Enrolled", String(basic.enrolledCount || 0)],
              ["Pricing", null],
              ["Status", null],
            ].map(([label, val]) => (
              <div key={label} className="flex items-start justify-between py-2.5 border-b border-border gap-4">
                <span className="text-sm text-muted-foreground flex-shrink-0 w-28">{label}</span>
                {label === "Pricing" ? (
                  <span className="text-sm font-medium">
                    {basic.isFree
                      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Free</Badge>
                      : <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">${basic.price}</Badge>}
                  </span>
                ) : label === "Status" ? (
                  <Badge className={settings.isPublished ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                    {settings.isPublished ? "Published" : "Draft"}
                  </Badge>
                ) : (
                  <span className="text-sm font-medium text-right break-all">{val}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Thumbnail preview */}
      {media.thumbnail && (
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <SectionHeader icon={ImageIcon} title="Thumbnail" subtitle="Preview" />
            <img src={media.thumbnail} alt="thumbnail" className="h-40 rounded-xl object-cover border border-border"
              onError={e => e.target.style.display = "none"} />
          </CardContent>
        </Card>
      )}

      {/* Tasks list */}
      {tasks.length > 0 && (
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <SectionHeader icon={Target} title={`Tasks (${tasks.length})`} subtitle={`${totalPoints} total points`} />
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <div key={task.id || i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <TaskTypeBadge type={task.type} />
                  <span className="text-sm flex-1 truncate">{task.question?.replace(/<[^>]+>/g, "") || "—"}</span>
                  {task.section && <Badge variant="outline" className="text-xs flex-shrink-0">{task.section}</Badge>}
                  <Badge variant="secondary" className="text-xs flex-shrink-0">{task.points || 0} pts</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation warnings */}
      {(!basic.title || !basic.platform || !basic.level) && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Please complete required fields: Title, Platform, and Level (Step 1)
        </div>
      )}
      {tasks.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          No tasks added yet — go to Step 3 to add questions and exercises
        </div>
      )}

      {/* JSON output */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">Generated JSON</p>
                <p className="text-xs text-muted-foreground">Matches POST /owner/labs/create-full (field skillBuilder)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant={showJSON ? "default" : "outline"} size="sm"
                onClick={() => setShowJSON(s => !s)} className="gap-1.5">
                {showJSON ? <><X className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Show JSON</>}
              </Button>
              {showJSON && (
                <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-1.5">
                  {copied ? "✓ Copied!" : "Copy JSON"}
                </Button>
              )}
            </div>
          </div>
          {showJSON && (
            <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-xl p-4 text-xs overflow-auto max-h-[500px] font-mono leading-relaxed">
              {jsonStr}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const defaultBasic = {
  title: "", code: "", description: "",
  platform: "", level: "", category: "",
  duration: "45 minutes", credits: "5 Credits",
  timerSec: 2700, rating: 4.8,
  isFree: true, price: "", enrolledCount: 0,
};

const defaultMedia = {
  thumbnail: "",
  _thumbnailFile: null,
  skillsTested: [""],
  whatYouLearn: [""],
  requirements: [""],
  certificateEnabled: false,
  certificateTitle: "",
  certificateType: "completion",
  certificateMinProgress: 80,
  certificateThumbnail: "",
  certificateDescription: "",
  certificateVerificationText: "",
  certificateRequireQuiz: false,
  certificateRequireTasks: false,
};

const defaultSettings = {
  passingScore: "70", maxAttempts: "3", retryCooldown: "0",
  isPublished: false, shuffleQuestions: false, shuffleOptions: false,
  showCorrectAnswers: true, showExplanations: true,
  allowSkip: false, requireSequential: false, certificateOnPass: false,
  passMessage: "", failMessage: "",
};

export default function SkillBuilderLab() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [createSkillBuilderLab, { isLoading: isPublishing }] = useCreateSkillBuilderLabFullMutation();
  const [step, setStep] = useState(() => {
    const d = loadSkillBuilderDraft();
    return d?.step >= 1 && d?.step <= 5 ? d.step : 1;
  });

  const [basic, setBasic] = useState(() => {
    const d = loadSkillBuilderDraft();
    return d?.basic && typeof d.basic === "object" ? { ...defaultBasic, ...d.basic } : { ...defaultBasic };
  });
  const [media, setMedia] = useState(() => {
    const d = loadSkillBuilderDraft();
    return d?.media && typeof d.media === "object"
      ? { ...defaultMedia, ...d.media, _thumbnailFile: null }
      : { ...defaultMedia };
  });
  const [tasksData, setTasksData] = useState(() => {
    const d = loadSkillBuilderDraft();
    return d?.tasksData && Array.isArray(d.tasksData.tasks) ? { tasks: d.tasksData.tasks } : { tasks: [] };
  });
  const [settings, setSettings] = useState(() => {
    const d = loadSkillBuilderDraft();
    return d?.settings && typeof d.settings === "object"
      ? { ...defaultSettings, ...d.settings }
      : { ...defaultSettings };
  });

  useEffect(() => {
    const d = loadSkillBuilderDraft();
    const meaningful =
      d &&
      ((d.basic?.title && String(d.basic.title).trim()) ||
        (Array.isArray(d.tasksData?.tasks) && d.tasksData.tasks.length > 0));
    if (meaningful) {
      toast.info("Restored your saved draft", {
        description: "Progress is stored in this browser until you publish.",
      });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const payload = {
          step,
          basic,
          media: { ...media, _thumbnailFile: null },
          tasksData,
          settings,
          savedAt: Date.now(),
        };
        localStorage.setItem(SKILL_BUILDER_DRAFT_KEY, JSON.stringify(payload));
      } catch { /* quota */ }
    }, 500);
    return () => clearTimeout(t);
  }, [step, basic, media, tasksData, settings]);

  const all = { basic, media, tasks: tasksData.tasks, settings };

  const handlePublish = useCallback(async () => {
    if (!basic.title?.trim()) {
      toast.error("Add a lab title (Step 1)");
      setStep(1);
      return;
    }
    if (!basic.platform || !basic.level) {
      toast.error("Select platform and level (Step 1)");
      setStep(1);
      return;
    }
    if (!tasksData.tasks?.length) {
      toast.error("Add at least one task (Step 3)");
      setStep(3);
      return;
    }
    try {
      const res = await createSkillBuilderLab({
        basic,
        media,
        tasks: tasksData.tasks,
        settings,
      }).unwrap();
      const lab = res?.data?.lab ?? res?.lab ?? res?.data;
      const labId = lab?.id ?? lab?._id;
      const slug = lab?.slug ?? "";
      if (labId) {
        dispatch(setLastCreated({ id: labId, title: basic.title, code: slug }));
      }
      toast.success("Skill Builder lab published");
      clearSkillBuilderDraft();
      navigate("/app/labs");
    } catch (e) {
      const msg =
        e?.data?.message ||
        (typeof e?.data === "string" ? e.data : null) ||
        e?.message ||
        "Could not publish lab";
      toast.error(msg);
    }
  }, [basic, media, tasksData.tasks, settings, createSkillBuilderLab, dispatch, navigate]);

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1 data={basic} onChange={setBasic} />;
      case 2: return <Step2 data={media} onChange={setMedia} />;
      case 3: return <Step3 data={tasksData} onChange={setTasksData} />;
      case 4: return <Step4 data={settings} onChange={setSettings} />;
      case 5: return <Step5 all={all} />;
    }
  };

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 text-muted-foreground -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Labs
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Create Skill Builder Lab</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Build an interactive skill validation lab with questions, exercises and auto-grading
            </p>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold">Skill Builder</Badge>
        </div>
      </div>

      {/* Step tab bar — same pattern as AdminLabCreate */}
      <div className="mb-8">
        <div className="flex items-stretch gap-0 mb-3 overflow-hidden rounded-xl border border-border bg-muted/30">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id, active = step === s.id;
            return (
              <button key={s.id} type="button" onClick={() => setStep(s.id)}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-3 transition-all border-r last:border-r-0 border-border text-left",
                  active ? "bg-white shadow-sm" : "hover:bg-muted/50",
                )}>
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                  done ? "bg-green-100 text-green-700" : active ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                  {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className={cn("text-xs font-semibold truncate",
                    active ? "text-primary" : done ? "text-green-700" : "text-muted-foreground")}>{s.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs font-medium text-primary">Step {step}: {STEPS[step - 1]?.label}</span>
          <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</span>
        </div>
      </div>

      {/* Step content */}
      {renderStep()}

      {/* Bottom navigation */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
        <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />{step === 1 ? "Cancel" : "Back"}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={isPublishing}
            onClick={() => (step < STEPS.length ? setStep(step + 1) : handlePublish())}
          >
            {step < STEPS.length ? (
              <><span>Continue</span><ArrowRight className="w-4 h-4 ml-2" /></>
            ) : isPublishing ? (
              <span>Publishing…</span>
            ) : (
              <span>🚀 Publish Lab</span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
// src/pages/admin/AdminLabCreate.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  ArrowLeft, ArrowRight, Save, X, Plus, GripVertical,
  Image as ImageIcon, Code2, AlertCircle,
  FlaskConical, BookOpen, Settings, CheckCircle,
  Layers, Hash, ToggleLeft, Eye, Loader2, Award,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import SectionHeader from "../../components/ui/section-header";
import FieldLabel from "../../components/ui/fieldlabel";
import StepTabBar from "../../components/ui/steptabbar";
import MediaUploader from "../../components/ui/media-uploader";
import RichEditor from "../../components/ui/richeditor";
import LabContentBuilder from "../../components/admin/lab-builder/LabContentBuilder";
import LabHierarchyBuilder from "../../components/admin/lab-builder/LabHierarchyBuilder";
import { defaultLabOutline } from "@/lib/labOutlineUtils";

import { setLastCreated } from "@/store/slices/labSlice";
import { createLabFull } from "../../lib/uploadWithProgress";

// ─── Draft persistence ───────────────────────────────────────────────────────
const DRAFT_KEY = "adminLabCreate_draft_v1";

function stripPendingFromOutlineBlocks(blocks) {
  return (blocks || []).map((b) => {
    if (b.type === "media" && b._pendingFile) {
      const { _pendingFile, ...rest } = b;
      return rest;
    }
    return b;
  });
}

function stripPendingFilesFromContent(content) {
  let next = { ...content };
  if (content?.labOutline?.sections && content.labOutline.sections.length > 0) {
    const sections = content.labOutline.sections.map((sec) => ({
      ...sec,
      blocks: stripPendingFromOutlineBlocks(sec.blocks),
      tasks: (sec.tasks || []).map((task) => ({
        ...task,
        blocks: stripPendingFromOutlineBlocks(task.blocks),
        steps: (task.steps || []).map((step) => ({
          ...step,
          blocks: stripPendingFromOutlineBlocks(step.blocks),
          subSteps: (step.subSteps || []).map((ss) => ({
            ...ss,
            blocks: stripPendingFromOutlineBlocks(ss.blocks),
          })),
        })),
      })),
    }));
    next = { ...next, labOutline: { ...content.labOutline, sections } };
  }
  if (!content?.labSections?.length) return next;
  const labSections = content.labSections.map((s) => {
    if (s.type === "media") {
      const { _pendingFile, ...rest } = s;
      return rest;
    }
    if (s.type === "step" && s.blocks) {
      return {
        ...s,
        blocks: s.blocks.map((b) => {
          if (b.type === "media") {
            const { _pendingFile, ...br } = b;
            return br;
          }
          return b;
        }),
      };
    }
    if (s.type === "content" && s.blocks) {
      return {
        ...s,
        blocks: s.blocks.map((b) => {
          if (b.type === "media") {
            const { _pendingFile, ...br } = b;
            return br;
          }
          return b;
        }),
      };
    }
    return s;
  });
  return { ...next, labSections };
}

function saveDraft({ basic, media, content, tocData }) {
  try {
    const { _thumbnailFile, ...mediaSafe } = media;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      basic,
      media: mediaSafe,
      content: stripPendingFilesFromContent(content),
      tocData,
      _savedAt: Date.now(),
    }));
  } catch { }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basic details", icon: FlaskConical, desc: "Title, duration, platform, pricing" },
  { id: 2, label: "Overview page", icon: BookOpen, desc: "Thumbnail, outcomes, curriculum" },
  { id: 3, label: "Content building", icon: Layers, desc: "Drag-and-drop lab page (like your PDF)" },
  { id: 4, label: "TOC & Setup", icon: Settings, desc: "Sidebar nav & setup notes" },
  { id: 5, label: "Review", icon: CheckCircle, desc: "Check & publish" },
];

const PLATFORMS = ["AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Linux", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const LAB_TYPES = ["Self-paced", "Video-guided", "Instructor-led"];
const LESSON_TYPES = [
  { value: "video", label: "Video", icon: "▶" },
  { value: "pdf", label: "PDF", icon: "📄" },
  { value: "code", label: "Exercise", icon: "⚡" },
  { value: "quiz", label: "Quiz", icon: "🏆" },
];

let _uid = 0;
const uid = () => `id_${++_uid}_${Math.random().toString(36).slice(2, 6)}`;

// ─── Default state factories ─────────────────────────────────────────────────
const defaultBasic = () => ({
  title: "", code: "", description: "", platform: "", level: "", labType: "",
  duration: "2 hours", credits: "7 Credits", timerSec: 7200, rating: 4.8,
  isFree: true, price: "", enrolledCount: 0,
});

const defaultMedia = () => ({
  thumbnail: "", _thumbnailFile: null,
  sections: [{ id: uid(), title: "Introduction & Setup", lessons: [] }],
  whatYouLearn: [""], requirements: [""],
  certificateEnabled: false,
  certificateTitle: "",
  certificateType: "completion",
  certificateMinProgress: 80,
  certificateThumbnail: "",
  certificateDescription: "",
  certificateVerificationText: "",
  certificateRequireQuiz: false,
  certificateRequireTasks: false,
});

const defaultContent = () => ({ labSections: [], labOutline: defaultLabOutline() });

const defaultTocData = () => ({
  toc: [{ id: uid(), slug: "lab-overview", label: "Lab Overview", indent: false, isTask: false }],
  setupNotes: [""],
});

// ─── Validation ───────────────────────────────────────────────────────────────
function validateAll({ basic, media }) {
  const errors = [];
  if (!basic.title?.trim()) errors.push({ step: 1, msg: "Lab title is required" });
  if (!basic.description?.trim()) errors.push({ step: 1, msg: "Short description is required" });
  if (!basic.platform) errors.push({ step: 1, msg: "Platform is required" });
  if (!basic.level) errors.push({ step: 1, msg: "Level is required" });
  if (!basic.isFree && !basic.price) errors.push({ step: 1, msg: "Price is required for paid labs" });
  return errors;
}

// ─── PublishStatus overlay ────────────────────────────────────────────────────
function PublishStatus({ phase }) {
  if (!phase) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] bg-background border border-border rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 text-sm font-semibold max-w-[90vw]">
      {phase !== "done"
        ? <><span className="animate-spin inline-block">⏳</span><span>Creating lab & uploading files…</span></>
        : <><span>✅</span><span>Lab created successfully!</span></>
      }
    </div>
  );
}

// ─── ValidationBanner ────────────────────────────────────────────────────────
function ValidationBanner({ errors, onGoToStep, onDismiss }) {
  if (!errors?.length) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9997] w-[min(520px,92vw)] bg-red-50 border border-red-300 rounded-xl shadow-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-800">Fix these before publishing:</p>
        </div>
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
      </div>
      <ul className="space-y-1">
        {errors.map((e, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-xs text-red-700">
            <span>• {e.msg}</span>
            <button onClick={() => { onGoToStep(e.step); onDismiss(); }}
              className="text-[10px] font-bold text-red-600 border border-red-300 rounded px-1.5 py-0.5 hover:bg-red-100 whitespace-nowrap flex-shrink-0">
              Go to Step {e.step}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ═══ STEP 1 ═══════════════════════════════════════════════════════════════════
function Step1({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={FlaskConical} title="Lab Details" subtitle="Core information shown across all pages" />
          <div className="space-y-4 mt-4">
            <div>
              <FieldLabel required>Lab Title</FieldLabel>
              <Input placeholder="e.g. Deploy a Kubernetes Cluster on AWS EKS"
                value={data.title} onChange={e => set("title", e.target.value)} className="bg-muted/30" />
              <p className="text-xs text-muted-foreground mt-2">
                Public URL and lab code are generated from this title when you publish (e.g. <span className="font-mono">/labs/your-lab-slug</span>).
              </p>
            </div>
            <div>
              <FieldLabel required hint="~150–200 chars shown in overview hero">Short Description</FieldLabel>
              <RichEditor
                placeholder="Hands-on lab: practice real-world skills in a live cloud environment..."
                value={data.description}
                onChange={(html) => set("description", html)}
                minHeight="80px"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{(data.description || "").length} chars</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel required>Platform</FieldLabel>
                <Select value={data.platform} onValueChange={v => set("platform", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel required>Level</FieldLabel>
                <Select value={data.level} onValueChange={v => set("level", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Lab Type</FieldLabel>
                <Select value={data.labType} onValueChange={v => set("labType", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{LAB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={Settings} title="Settings" subtitle="Duration, credits, timer and rating" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {[
              { key: "duration", label: "Duration", hint: "e.g. 2 hours", placeholder: "2 hours" },
              { key: "credits", label: "Credits", hint: "e.g. 7 Credits", placeholder: "7 Credits" },
              { key: "timerSec", label: "Timer (seconds)", hint: "2hrs = 7200", type: "number" },
              { key: "rating", label: "Rating", hint: "0.0–5.0", type: "number", step: "0.1", min: "0", max: "5" },
            ].map(({ key, label, hint, placeholder, ...rest }) => (
              <div key={key}>
                <FieldLabel hint={hint}>{label}</FieldLabel>
                <Input {...rest} value={data[key]} onChange={e => set(key, e.target.value)}
                  placeholder={placeholder} className="bg-muted/30" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={ToggleLeft} title="Pricing & Enrollment" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start mt-4">
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
                <FieldLabel hint="USD price on overview badge">Price ($)</FieldLabel>
                <Input type="number" step="0.01" value={data.price}
                  onChange={e => set("price", e.target.value)} placeholder="29.99" className="bg-muted/30" />
              </div>
            )}
            <div>
              <FieldLabel hint="Shown as enrolled count">Enrolled Count</FieldLabel>
              <Input type="number" value={data.enrolledCount}
                onChange={e => set("enrolledCount", e.target.value)} className="bg-muted/30" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ STEP 2 ═══════════════════════════════════════════════════════════════════
function Step2({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const [dragIdx, setDragIdx] = useState(null);

  const updateList = (key, i, val) => { const a = [...(data[key] || [])]; a[i] = val; set(key, a); };
  const addListItem = (key) => set(key, [...(data[key] || []), ""]);
  const removeListItem = (key, i) => set(key, (data[key] || []).filter((_, j) => j !== i));

  const addSection = () => set("sections", [...(data.sections || []), { id: uid(), title: "", lessons: [] }]);
  const removeSection = (id) => set("sections", (data.sections || []).filter(s => s.id !== id));
  const updateSectionTitle = (id, title) => set("sections", (data.sections || []).map(s => s.id === id ? { ...s, title } : s));
  const addLesson = (sid) => set("sections", (data.sections || []).map(s => s.id === sid ? { ...s, lessons: [...(s.lessons || []), { id: uid(), title: "", type: "video", duration: "15 Min", free: false }] } : s));
  const removeLesson = (sid, lid) => set("sections", (data.sections || []).map(s => s.id === sid ? { ...s, lessons: (s.lessons || []).filter(l => l.id !== lid) } : s));
  const updateLesson = (sid, lid, field, val) => set("sections", (data.sections || []).map(s => s.id === sid ? { ...s, lessons: (s.lessons || []).map(l => l.id === lid ? { ...l, [field]: val } : l) } : s));

  const dropSection = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    const arr = [...(data.sections || [])];
    const [m] = arr.splice(dragIdx, 1);
    arr.splice(idx, 0, m);
    set("sections", arr);
    setDragIdx(null);
  };

  const thumbPreview = data._thumbnailFile ? URL.createObjectURL(data._thumbnailFile) : data.thumbnail || "";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Overview page</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              This matches the lab card and overview: hero image, what learners see before they start, and the curriculum
              accordion on the lab overview screen.
            </p>
          </div>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={ImageIcon} title="Lab Thumbnail" subtitle="Shown in overview card. Upload or paste a URL." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            <div className="space-y-3">
              <MediaUploader
                accept="image" value={data._thumbnailFile || null} previewUrl={data.thumbnail || ""}
                onChange={f => { set("_thumbnailFile", f); if (!f) set("thumbnail", ""); }}
                maxMB={5} hint="Recommended: 900×500px, JPG/PNG/WebP" showPreview={false}
              />
              <div>
                <FieldLabel hint="Or paste a URL">Image URL</FieldLabel>
                <Input placeholder="https://..." value={data.thumbnail || ""}
                  onChange={e => { set("thumbnail", e.target.value); set("_thumbnailFile", null); }}
                  className="bg-muted/30" />
              </div>
            </div>
            <div className="aspect-video rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
              {thumbPreview
                ? <img src={thumbPreview} alt="preview" className="w-full h-full object-cover" onError={e => e.target.style.display = "none"} />
                : <div className="text-center text-muted-foreground"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No image selected</p></div>
              }
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={CheckCircle} title="What You'll Learn" />
          <div className="space-y-2 mt-4">
            {(data.whatYouLearn || [""]).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-green-500 text-sm flex-shrink-0">✓</span>
                <Input value={item} onChange={e => updateList("whatYouLearn", i, e.target.value)}
                  placeholder={`Learning outcome ${i + 1}`} className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeListItem("whatYouLearn", i)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-1 text-primary border-primary/30" onClick={() => addListItem("whatYouLearn")}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Outcome
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={BookOpen} title="Requirements" />
          <div className="space-y-2 mt-4">
            {(data.requirements || [""]).map((req, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <Input value={req} onChange={e => updateList("requirements", i, e.target.value)}
                  placeholder={`Requirement ${i + 1}`} className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeListItem("requirements", i)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-1 text-primary border-primary/30" onClick={() => addListItem("requirements")}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Requirement
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

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={BookOpen} title="Lab Curriculum Sections" subtitle="Accordion in 'Lab Content'. Drag to reorder." />
          <div className="space-y-3 mt-4">
            {(data.sections || []).map((section, si) => (
              <div key={section.id} draggable
                onDragStart={() => setDragIdx(si)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => dropSection(si)}
                className="border border-border rounded-xl overflow-hidden bg-white">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
                  <div className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{si + 1}</div>
                  <input value={section.title} onChange={e => updateSectionTitle(section.id, e.target.value)}
                    placeholder="Section title" className="flex-1 bg-transparent border-none outline-none text-sm font-semibold placeholder:text-muted-foreground" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeSection(section.id)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 mb-1">
                    {["LESSON TITLE", "TYPE", "DURATION", "PREVIEW?", ""].map((h, i) => (
                      <div key={i} className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                        i === 0 ? "col-span-5" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-1 text-center" : "col-span-1")}>{h}</div>
                    ))}
                  </div>
                  {(section.lessons || []).map(lesson => (
                    <div key={lesson.id} className="grid grid-cols-12 gap-2 items-center">
                      <Input value={lesson.title} onChange={e => updateLesson(section.id, lesson.id, "title", e.target.value)}
                        placeholder="Lesson name" className="col-span-5 bg-muted/30 h-8 text-sm" />
                      <Select value={lesson.type} onValueChange={v => updateLesson(section.id, lesson.id, "type", v)}>
                        <SelectTrigger className="col-span-3 bg-muted/30 h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{LESSON_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={lesson.duration} onChange={e => updateLesson(section.id, lesson.id, "duration", e.target.value)}
                        placeholder="15 Min" className="col-span-2 bg-muted/30 h-8 text-sm" />
                      <div className="col-span-1 flex justify-center">
                        <Switch checked={lesson.free} onCheckedChange={v => updateLesson(section.id, lesson.id, "free", v)} className="scale-75" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="col-span-1 h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => removeLesson(section.id, lesson.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="mt-1 h-7 text-xs text-primary border-dashed border-primary/40" onClick={() => addLesson(section.id)}>
                    <Plus className="w-3 h-3 mr-1" />Add Lesson
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" className="w-full mt-4 border-dashed text-primary border-primary/30" onClick={addSection}>
            <Plus className="w-4 h-4 mr-2" />Add Section
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ STEP 3 ═══════════════════════════════════════════════════════════════════
function Step3({ data, onChange }) {
  const labSections = data.labSections || [];
  const hasFlatOnly = labSections.length > 0 && data.labOutline == null;
  if (hasFlatOnly) {
    return (
      <LabContentBuilder
        labSections={labSections}
        onChange={(next) => onChange({ ...data, labSections: next })}
      />
    );
  }

  return (
    <LabHierarchyBuilder
      labOutline={data.labOutline || defaultLabOutline()}
      onChange={(next) => onChange({ ...data, labOutline: next, labSections: [] })}
    />
  );
}

// ═══ STEP 4 ═══════════════════════════════════════════════════════════════════
function Step4({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  const addToc = () => set("toc", [...(data.toc || []), { id: uid(), slug: "", label: "", indent: false, isTask: false }]);
  const removeToc = (id) => set("toc", (data.toc || []).filter(t => t.id !== id));
  const updToc = (id, f, v) => set("toc", (data.toc || []).map(t => t.id === id ? { ...t, [f]: v } : t));
  const addNote = () => set("setupNotes", [...(data.setupNotes || []), ""]);
  const removeNote = (i) => set("setupNotes", (data.setupNotes || []).filter((_, j) => j !== i));
  const updNote = (i, v) => set("setupNotes", (data.setupNotes || []).map((n, j) => j === i ? v : n));

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={Hash} title="Table of Contents (TOC)" subtitle="Right sidebar navigation in LabDetailPage. Anchor ID must match Step 3." />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-4">
            ⚠️ <strong>Anchor ID / Slug</strong> must exactly match the <code className="bg-amber-100 px-1 rounded text-xs">anchorId</code> on a Step in Step 3.
          </div>
          <div className="grid grid-cols-12 gap-2 mb-2">
            {["ANCHOR SLUG", "LABEL TEXT", "INDENTED?", "IS TASK?", ""].map((h, i) => (
              <div key={i} className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                i === 0 ? "col-span-3" : i === 1 ? "col-span-5" : i === 2 ? "col-span-1 text-center" : i === 3 ? "col-span-2 text-center" : "col-span-1")}>{h}</div>
            ))}
          </div>
          <div className="space-y-2">
            {(data.toc || []).map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <Input value={item.slug} onChange={e => updToc(item.id, "slug", e.target.value)}
                  placeholder="lab-overview" className="col-span-3 bg-muted/30 h-8 text-xs font-mono" />
                <Input value={item.label} onChange={e => updToc(item.id, "label", e.target.value)}
                  placeholder="Lab Overview" className="col-span-5 bg-muted/30 h-8 text-sm" />
                <div className="col-span-1 flex justify-center">
                  <Switch checked={item.indent} onCheckedChange={v => updToc(item.id, "indent", v)} className="scale-75" />
                </div>
                <div className="col-span-2 flex justify-center">
                  <Switch checked={item.isTask} onCheckedChange={v => updToc(item.id, "isTask", v)} className="scale-75" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="col-span-1 h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeToc(item.id)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3 text-primary border-primary/30" onClick={addToc}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add TOC Item
          </Button>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={Settings} title="Lab Setup Notes" subtitle="Expandable panel in left sidebar of LabDetailPage." />
          <div className="space-y-2 mt-4">
            {(data.setupNotes || []).map((note, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <Input value={note} onChange={e => updNote(i, e.target.value)}
                  placeholder={`Setup instruction ${i + 1}`} className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeNote(i)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3 text-primary border-primary/30" onClick={addNote}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add Setup Note
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ STEP 5 ═══════════════════════════════════════════════════════════════════
function Step5({ all, onPublish, isPublishing, validationErrors, onGoToStep }) {
  const { basic = {}, media = {}, labSections = [], labOutline, toc = [], setupNotes = [] } = all;
  const [showJSON, setShowJSON] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalLessons = (media.sections || []).reduce((s, sec) => s + (sec.lessons || []).length, 0);
  const outlineSteps =
    labOutline?.sections?.reduce(
      (acc, sec) =>
        acc +
        (sec.tasks || []).reduce((a, task) => a + (task.steps || []).length, 0),
      0
    ) ?? 0;
  const hasErrors = validationErrors?.length > 0;

  const output = {
    _endpoint: "POST /owner/labs/create-full  (multipart/form-data)",
    title: basic.title || "", code: "(auto from title)",
    description: basic.description || "", platform: basic.platform || "",
    level: basic.level || "", labType: basic.labType || "",
    duration: basic.duration || "", credits: basic.credits || "",
    timerSec: Number(basic.timerSec || 0), isFree: !!basic.isFree,
    thumbnail: media._thumbnailFile ? `[FILE: ${media._thumbnailFile.name}]` : media.thumbnail || "(none)",
    toc: (toc || []).map(({ id, slug, label, indent, isTask }) => ({ id: slug, label, indent, isTask })),
    setupNotes,
    labOutline: labOutline || null,
    sections: (labSections || []).map(({ id, ...rest }) => rest),
    _curriculum: (media.sections || []).map(s => ({ title: s.title, lessons: (s.lessons || []).length })),
  };
  const jsonStr = JSON.stringify(output, null, 2);
  const copy = async () => { try { await navigator.clipboard.writeText(jsonStr); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { } };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: labOutline?.sections ? "Outline steps" : "Lab blocks",
            value: labOutline?.sections ? outlineSteps : (labSections || []).length,
            bg: "bg-blue-50",
            fg: "text-blue-600",
            Icon: Layers,
          },
          { label: "TOC Items", value: (toc || []).length, bg: "bg-purple-50", fg: "text-purple-600", Icon: Hash },
          { label: "Setup Notes", value: (setupNotes || []).length, bg: "bg-amber-50", fg: "text-amber-600", Icon: Settings },
          { label: "Lessons", value: totalLessons, bg: "bg-green-50", fg: "text-green-600", Icon: BookOpen },
        ].map(({ label, value, bg, fg, Icon }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-3 flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", bg)}><Icon className={cn("w-4 h-4", fg)} /></div>
              <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasErrors && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-800">Fix before publishing:</p>
          </div>
          <ul className="space-y-1.5">
            {validationErrors.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs text-red-700">
                <span>• {e.msg}</span>
                <button onClick={() => onGoToStep(e.step)}
                  className="text-[10px] font-bold border border-red-300 rounded px-1.5 py-0.5 hover:bg-red-100 whitespace-nowrap flex-shrink-0">
                  Step {e.step}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <SectionHeader icon={CheckCircle} title="Lab Summary" subtitle="Review all details before publishing" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 mt-4">
            {[
              ["Title", basic.title || "—"],
              ["URL / code", "Generated on publish"],
              ["Platform", basic.platform || "—"],
              ["Level", basic.level || "—"],
              ["Duration", basic.duration || "—"],
              ["Pricing", null],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2.5 border-b border-border gap-4">
                <span className="text-sm text-muted-foreground w-24 flex-shrink-0">{label}</span>
                {label === "Pricing"
                  ? <Badge className={basic.isFree ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{basic.isFree ? "Free" : `$${basic.price}`}</Badge>
                  : <span className="text-sm font-medium text-right break-all">{val}</span>
                }
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary"><Code2 className="w-4 h-4" /></div>
              <div>
                <p className="font-semibold text-sm">API Payload Preview</p>
                <p className="text-xs text-muted-foreground">What create-full receives</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant={showJSON ? "default" : "outline"} size="sm" onClick={() => setShowJSON(s => !s)}>
                {showJSON ? <><X className="w-3.5 h-3.5 mr-1" />Hide</> : <><Eye className="w-3.5 h-3.5 mr-1" />Show</>}
              </Button>
              {showJSON && <Button type="button" variant="outline" size="sm" onClick={copy}>{copied ? "✓" : "Copy"}</Button>}
            </div>
          </div>
          {showJSON && <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-xl p-4 text-xs overflow-auto max-h-[400px] font-mono leading-relaxed">{jsonStr}</pre>}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
        <div className="text-center">
          <p className="font-semibold text-base mb-1">
            {hasErrors ? "⚠️ Fix the errors above first" : "✅ Ready to publish!"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {media._thumbnailFile ? "Thumbnail will be uploaded along with lab data." : "Lab data will be saved immediately."}
          </p>
          <Button onClick={onPublish} disabled={isPublishing || hasErrors} className="gap-2 px-8" size="lg">
            {isPublishing
              ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing…</>
              : <>🚀 Publish Lab</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN — AdminLabCreate ═════════════════════════════════════════════════════
export default function AdminLabCreate() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [step, setStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishPhase, setPublishPhase] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  // ── Form state — rehydrate from localStorage on mount ─────────────────────
  const [basic, setBasic] = useState(() => { const d = loadDraft(); return d?.basic || defaultBasic(); });
  const [media, setMedia] = useState(() => {
    const d = loadDraft();
    return d?.media ? { ...defaultMedia(), ...d.media, _thumbnailFile: null } : defaultMedia();
  });
  const [content, setContent] = useState(() => {
    const d = loadDraft();
    if (!d?.content) return defaultContent();
    const legacyFlat = (d.content.labSections || []).length > 0 && d.content.labOutline == null;
    return {
      labSections: d.content.labSections || [],
      labOutline: legacyFlat ? undefined : (d.content.labOutline || defaultLabOutline()),
    };
  });
  const [tocData, setTocData] = useState(() => { const d = loadDraft(); return d?.tocData || defaultTocData(); });

  // ── Auto-save draft (600ms debounce) ──────────────────────────────────────
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft({ basic, media, content, tocData });
      setDraftSavedAt(new Date().toLocaleTimeString());
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [basic, media, content, tocData]);

  // ── Publish handler ───────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    const errors = validateAll({ basic, media });
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setIsPublishing(true);
    setPublishError(null);
    setPublishPhase("upload");

    const titleForHighlight = basic.title;

    try {
      const responseData = await createLabFull({ basic, media, content, tocData, dispatch });

      console.log("[AdminLabCreate] create-full response:", responseData);

      const rd = responseData && typeof responseData === "object" ? responseData : {};
      const inner = rd.data !== undefined && rd.data !== null ? rd.data : rd;
      const createdLab = inner?.lab ?? (inner != null && inner.id != null ? inner : null);
      const labId = createdLab?.id ?? createdLab?._id ?? null;

      if (!labId) {
        console.error("[AdminLabCreate] No labId in response:", responseData);
        throw new Error("Server did not return a lab ID.");
      }

      // Prevent debounced auto-save from writing the previous form back after clearDraft.
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      clearDraft();

      const createdSlug = createdLab?.slug || "";
      dispatch(setLastCreated({ id: labId, title: titleForHighlight, code: createdSlug }));

      setBasic(defaultBasic());
      setMedia(defaultMedia());
      setContent(defaultContent());
      setTocData(defaultTocData());
      setStep(1);
      setDraftSavedAt(null);

      setPublishPhase("done");
      setTimeout(() => setPublishPhase(null), 2200);
    } catch (err) {
      console.error("[AdminLabCreate] Publish failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.data?.message ||
        err?.message ||
        "Something went wrong. Please try again.";
      setPublishError(msg);
      setPublishPhase(null);
    } finally {
      setIsPublishing(false);
    }
  }, [basic, media, content, tocData, dispatch]);

  const handleSaveDraft = useCallback(() => {
    saveDraft({ basic, media, content, tocData });
    setDraftSavedAt(new Date().toLocaleTimeString());
  }, [basic, media, content, tocData]);

  const all = { basic, media, ...content, ...tocData };

  return (
    <>
      <PublishStatus phase={publishPhase} />

      <ValidationBanner
        errors={validationErrors}
        onGoToStep={setStep}
        onDismiss={() => setValidationErrors([])}
      />

      {publishError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9996] w-[min(480px,92vw)] bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{publishError}</span>
          <button onClick={() => setPublishError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mb-4 md:mb-6">
        <Button variant="ghost" className="mb-3 text-muted-foreground -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Labs
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Create New Lab</h1>
            <p className="text-muted-foreground mt-0.5 text-sm hidden sm:block">
              Build a hands-on lab with tasks, steps, and real cloud environments
            </p>
          </div>
          <div className="flex items-center gap-3">
            {draftSavedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="hidden sm:inline">Draft saved {draftSavedAt}</span>
                <span className="sm:hidden">Saved</span>
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Save Draft</span><span className="sm:hidden">Save</span>
            </Button>
          </div>
        </div>
      </div>

      <StepTabBar steps={STEPS} current={step} onChange={setStep} />

      <div className="mt-4">
        {step === 1 && <Step1 data={basic} onChange={setBasic} />}
        {step === 2 && <Step2 data={media} onChange={setMedia} />}
        {step === 3 && <Step3 data={content} onChange={setContent} />}
        {step === 4 && <Step4 data={tocData} onChange={setTocData} />}
        {step === 5 && (
          <Step5
            all={all}
            onPublish={handlePublish}
            isPublishing={isPublishing}
            validationErrors={validationErrors}
            onGoToStep={setStep}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />{step === 1 ? "Cancel" : "Back"}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" />Save Draft
          </Button>
          <Button
            onClick={() => step < STEPS.length ? setStep(step + 1) : handlePublish()}
            disabled={step === STEPS.length && isPublishing}
          >
            {step < STEPS.length
              ? <><span>Continue</span><ArrowRight className="w-4 h-4 ml-2" /></>
              : isPublishing
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing…</>
                : <span>🚀 Publish</span>
            }
          </Button>
        </div>
      </div>
    </>
  );
}

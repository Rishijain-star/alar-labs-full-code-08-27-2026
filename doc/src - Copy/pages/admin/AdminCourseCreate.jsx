// src/pages/admin/AdminCourseCreate.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  ArrowLeft, ArrowRight, Save, X, Plus, GripVertical,
  Image as ImageIcon, Code2, AlertCircle,
  FlaskConical, BookOpen, Settings, CheckCircle,
  Layers, ToggleLeft, Eye,
  Video, FileText, Clock,
  ChevronDown, ChevronUp, Star, Trophy,
  Lock, Unlock, Info, Check, Award, Loader2,
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

import { setLastCreated } from "@/store/slices/courseSlice";
import { useGetActiveCategoriesQuery } from "@/store/api/categoryApi";
import { useGetPublicLabsQuery } from "@/store/api/labApi";
import { useGetActiveTechSkillsQuery } from "@/store/api/technologySkillApi";
import { createCourseFull } from "../../lib/uploadWithProgress";
import RichEditor from "../../components/ui/richeditor";

// Draft persistence
const DRAFT_KEY = "adminCourseCreate_draft_v3";
function saveDraft({ basic, media, labs, settings }) {
  try {
    const { _thumbnailFile, _introVideoFile, ...mediaSafe } = media;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ basic, media: mediaSafe, labs, settings, _savedAt: Date.now() }));
  } catch { }
}
function loadDraft() {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

// Constants
const STEPS = [
  { id: 1, label: "Basic Info", icon: BookOpen, desc: "Course metadata & settings" },
  { id: 2, label: "Media & Syllabus", icon: Video, desc: "Thumbnail, outcomes & modules" },
  { id: 3, label: "Labs & Content", icon: FlaskConical, desc: "Attach labs to content" },
  { id: 4, label: "Settings", icon: Settings, desc: "Pricing, access & publish" },
  { id: 5, label: "Review", icon: CheckCircle, desc: "Preview & publish" },
];
const PLATFORMS = ["AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Linux", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const CATEGORIES = [];
const DURATION_UNITS = ["Hours", "Days", "Weeks"];
const LESSON_TYPES = [
  { value: "video", label: "Video", icon: "▶" },
  { value: "article", label: "Article", icon: "📄" },
  { value: "quiz", label: "Quiz", icon: "🏆" },
  { value: "code", label: "Exercise", icon: "⚡" },
  { value: "lab", label: "Lab", icon: "🧪" },
];
const AVAILABLE_LABS = [
  { id: "lab-001", code: "LAB-101-01-01", title: "Deploy a Kubernetes Cluster on AWS EKS", level: "Intermediate", duration: "2 hours", platform: "AWS" },
  { id: "lab-002", code: "LAB-102-01-01", title: "Azure Blob Storage with Java", level: "Beginner", duration: "1 hour", platform: "Azure" },
  { id: "lab-003", code: "LAB-103-01-01", title: "Docker Container Networking Deep Dive", level: "Advanced", duration: "3 hours", platform: "Docker" },
  { id: "lab-004", code: "LAB-104-01-01", title: "Python FastAPI on Google Cloud Run", level: "Intermediate", duration: "90 min", platform: "Google Cloud" },
  { id: "lab-005", code: "LAB-105-01-01", title: "Linux Shell Scripting Essentials", level: "Beginner", duration: "45 min", platform: "Linux" },
  { id: "sbl-001", code: "SBL-K8S-101", title: "Kubernetes Fundamentals Skill Check", level: "Intermediate", duration: "30 min", platform: "Kubernetes", type: "skill-builder" },
];
const CERT_TEMPLATES = [
  { id: "classic-blue", label: "Classic Blue", desc: "Professional navy", preview: { bg: "linear-gradient(135deg,#1e3a5f,#2563eb)", border: "#93c5fd", accent: "#fbbf24", text: "#fff", logo: "🏛️" } },
  { id: "gold-elegant", label: "Gold Elegant", desc: "Premium dark gold", preview: { bg: "linear-gradient(135deg,#292524,#57534e)", border: "#fbbf24", accent: "#fbbf24", text: "#fef3c7", logo: "🏅" } },
  { id: "emerald-fresh", label: "Emerald Fresh", desc: "Fresh green", preview: { bg: "linear-gradient(135deg,#064e3b,#059669)", border: "#6ee7b7", accent: "#a7f3d0", text: "#fff", logo: "🌿" } },
  { id: "minimal-white", label: "Minimal White", desc: "Clean minimal", preview: { bg: "#fff", border: "#e5e7eb", accent: "#1a73e8", text: "#1a1a2e", logo: "📜" } },
];

let _uid = 0;
const uid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${++_uid}_${Math.random().toString(36).slice(2, 6)}`;
};

// ── Header constants ─────────────────────────────────────────────────────────
const HEADER_GRADIENTS = [
  { id: "slate-pro", label: "Slate Pro", value: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)" },
  { id: "indigo-night", label: "Indigo Night", value: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" },
  { id: "ocean-deep", label: "Ocean Deep", value: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" },
  { id: "emerald-dark", label: "Emerald Dark", value: "linear-gradient(135deg,#0a3d2e,#145a42,#1a7a55)" },
  { id: "crimson-dusk", label: "Crimson Dusk", value: "linear-gradient(135deg,#1a0000,#3d0000,#6b0000)" },
  { id: "aurora", label: "Aurora", value: "linear-gradient(135deg,#0d1b2a,#1b4332,#2d6a4f)" },
];

// Simple catalog for certification dropdown (can be wired to API later)
const AVAILABLE_CERTIFICATES = [
  { id: "aws-saa-c03", title: "AWS Solutions Architect Associate (SAA-C03)" },
  { id: "az-104", title: "Azure Administrator (AZ-104)" },
  { id: "gcp-ace", title: "Google Cloud Associate Cloud Engineer" },
  { id: "cka", title: "Kubernetes Administrator (CKA)" },
  { id: "tf-assoc", title: "HashiCorp Terraform Associate" },
  { id: "security-plus", title: "CompTIA Security+" },
];
const HEADER_LAYOUTS = [
  { id: "left-hero", label: "Left Hero", icon: "◧" },
  { id: "centered", label: "Centered", icon: "▣" },
  { id: "split", label: "Split", icon: "◫" },
];
const HEADER_ACCENT_COLORS = [
  { id: "amber", label: "Amber", value: "#f59e0b" },
  { id: "cyan", label: "Cyan", value: "#06b6d4" },
  { id: "emerald", label: "Emerald", value: "#10b981" },
  { id: "rose", label: "Rose", value: "#f43f5e" },
  { id: "violet", label: "Violet", value: "#8b5cf6" },
  { id: "white", label: "White", value: "#ffffff" },
];

function defaultHeader() {
  return {
    enabled: true,
    headline: "", subheadline: "",
    layout: "left-hero",
    gradientId: "slate-pro", customColor: "#1a1a2e", useCustomColor: false,
    accentColorId: "amber",
    bgImageUrl: "",
    instructorName: "", instructorTitle: "",
    ctaLabel: "Enroll Now", ctaSecondaryLabel: "Preview Course",
    showBadges: true, showRating: true, showEnrolled: true,
    showDuration: true, showCta: true, showSecondaryCta: true,
    patternOverlay: true,
  };
}

// Default state factories
const defaultBasic = () => ({
  title: "", code: "", description: "", fullDescription: "",
  category: "", level: "", platform: "", techStack: [],
  durationValue: "", durationUnit: "Hours",
  credits: "", rating: 4.8,
  isFree: true, price: "", currency: "USD", enrolledCount: 0,
});
const defaultMedia = () => ({
  thumbnail: "", _thumbnailFile: null,
  introVideoUrl: "", _introVideoFile: null,
  whatYouLearn: [""], requirements: [""], modules: [],
  header: defaultHeader(),
});
const defaultLabs = () => ({ featuredLabs: [], courseNotes: [""] });
const defaultSettings = () => ({
  pricingModel: "free", price: "", currency: "USD",
  isPublished: false, allowPreview: false,
  requireSequential: false, requirePrerequisites: false,
  privateAccess: false, showProgress: true,
  completionMessage: "",
  certificate: {
    enabled: false, templateId: "classic-blue",
    signatoryName: "", signatoryTitle: "", orgName: "",
    certValidity: "Lifetime", idPrefix: "", passingScore: "80",
    includeScore: true, includeDate: true, includeQR: true, emailOnComplete: true,
  },
});

function validateAll({ basic, media, settings }) {
  const errors = [];
  if (!basic.title?.trim()) errors.push({ step: 1, msg: "Course title is required" });
  if (!basic.description?.trim()) errors.push({ step: 1, msg: "Short description is required" });
  if (!basic.category) errors.push({ step: 1, msg: "Category is required" });
  if (!basic.level) errors.push({ step: 1, msg: "Level is required" });
  if (!basic.isFree && !basic.price) errors.push({ step: 1, msg: "Price is required for paid courses" });
  const modules = media.modules || [];
  if (modules.length === 0) errors.push({ step: 2, msg: "Add at least one module" });
  const emptyModules = modules.filter(m => m.lessons.length === 0);
  if (emptyModules.length > 0)
    errors.push({ step: 2, msg: `Module${emptyModules.length > 1 ? "s" : ""} "${emptyModules.map(m => m.title).join(", ")}" ha${emptyModules.length > 1 ? "ve" : "s"} no lessons` });
  
  // Validate video lessons have content
  modules.forEach(m => {
    m.lessons.forEach(l => {
      if (l.type === "video" && !l._videoFile && !l.videoUrl) {
        errors.push({ step: 2, msg: `Video lesson "${l.title}" in module "${m.title}" is missing a video file or URL` });
      }
      if (l.type === "lab" && !l.labId) {
        errors.push({ step: 2, msg: `Lab lesson "${l.title}" in module "${m.title}" is missing a linked lab` });
      }
    });
  });
  const cert = settings.certificate || {};
  if (cert.enabled) {
    const hasLinkedCert =
      !!(cert.certificationId && String(cert.certificationId).trim());
    if (!hasLinkedCert && !cert.signatoryName?.trim()) {
      errors.push({
        step: 4,
        msg: "Enter a signatory name for the certificate, or choose a linked certificate in Step 4",
      });
    }
  }
  return errors;
}

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
            <span>{e.msg}</span>
            <button onClick={() => { onGoToStep(e.step); onDismiss(); }}
              className="text-[10px] font-bold text-red-600 border border-red-300 rounded px-1.5 py-0.5 hover:bg-red-100 whitespace-nowrap">
              Go to Step {e.step}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  COURSE HEADER PREVIEW
// ═══════════════════════════════════════════════════════════════════════════
function CourseHeaderPreview({ header, basic }) {
  const gradient = HEADER_GRADIENTS.find(g => g.id === header.gradientId);
  const bgStyle = header.useCustomColor
    ? { background: header.customColor || "#1a1a2e" }
    : { background: gradient?.value || HEADER_GRADIENTS[0].value };
  if (header.bgImageUrl) {
    bgStyle.backgroundImage = `url(${header.bgImageUrl})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
  }
  const accent = HEADER_ACCENT_COLORS.find(a => a.id === header.accentColorId)?.value || "#f59e0b";
  const title = header.headline || basic?.title || "Course Title Goes Here";
  const subtitle = header.subheadline || basic?.description || "A compelling subtitle describing the transformation learners will experience throughout this course.";
  const isCentered = header.layout === "centered";
  const isSplit = header.layout === "split";
  const platformEmoji = { AWS: "☁️", Azure: "🔷", Docker: "🐳", Kubernetes: "⚙️", Linux: "🐧", "Google Cloud": "🌐" }[basic?.platform] || "🎓";

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none" style={{ ...bgStyle, minHeight: 230 }}>
      {header.bgImageUrl && <div className="absolute inset-0 bg-black/50" />}
      {header.patternOverlay && (
        <div className="absolute inset-0 opacity-[0.045]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)",
          backgroundSize: "26px 26px",
        }} />
      )}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-[0.12]"
        style={{ background: accent, transform: "translate(35%,-35%)" }} />
      <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full blur-2xl opacity-[0.08]"
        style={{ background: accent, transform: "translate(-25%,25%)" }} />

      <div className={`relative z-10 p-6 md:p-8 flex gap-6 items-center
        ${isCentered ? "flex-col text-center" : isSplit ? "flex-row" : "flex-col items-start"}`}>
        <div className={`flex-1 ${isCentered ? "flex flex-col items-center" : ""}`}>
          {header.showBadges && (basic?.category || basic?.level || basic?.platform) && (
            <div className={`flex flex-wrap gap-1.5 mb-3 ${isCentered ? "justify-center" : ""}`}>
              {basic?.category && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                  style={{ borderColor: accent + "55", color: accent, background: accent + "18" }}>
                  {basic.category}
                </span>
              )}
              {basic?.level && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white/65 border border-white/10">
                  {basic.level}
                </span>
              )}
              {basic?.platform && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white/65 border border-white/10">
                  {basic.platform}
                </span>
              )}
            </div>
          )}
          <h1 className="font-bold leading-tight text-white mb-2"
            style={{ fontSize: "clamp(1.05rem,2.8vw,1.65rem)", fontFamily: "'Georgia',serif" }}>
            {title}
          </h1>
          <div className={`h-[3px] w-10 rounded-full mb-3 ${isCentered ? "mx-auto" : ""}`} style={{ background: accent }} />
          <p className="text-[13px] text-white/70 leading-relaxed mb-4 max-w-lg">{subtitle}</p>
          <div className={`flex flex-wrap items-center gap-4 text-xs text-white/55 mb-4 ${isCentered ? "justify-center" : ""}`}>
            {header.showRating && (
              <span className="flex items-center gap-1">
                <span style={{ color: accent }}>★</span>
                <span className="font-semibold text-white">{basic?.rating || "4.8"}</span>
                <span>rating</span>
              </span>
            )}
            {header.showEnrolled && (
              <span className="flex items-center gap-1">
                <span>👥</span>
                <span className="font-semibold text-white">{Number(basic?.enrolledCount || 0).toLocaleString()}+</span>
                <span>enrolled</span>
              </span>
            )}
            {header.showDuration && basic?.durationValue && (
              <span className="flex items-center gap-1">
                <span>🕐</span>
                <span className="font-semibold text-white">{basic.durationValue} {basic.durationUnit}</span>
              </span>
            )}
            {header.instructorName && (
              <span className="flex items-center gap-1">
                <span>👤</span>
                <span className="text-white/80">{header.instructorName}</span>
              </span>
            )}
          </div>
          {header.showCta && (
            <div className={`flex flex-wrap gap-2 ${isCentered ? "justify-center" : ""}`}>
              <span className="text-xs font-bold px-5 py-2 rounded-lg cursor-pointer"
                style={{ background: accent, color: "#0a0a0a" }}>
                {header.ctaLabel || "Enroll Now"}
              </span>
              {header.showSecondaryCta && (
                <span className="text-xs font-semibold px-5 py-2 rounded-lg border text-white/80 cursor-pointer"
                  style={{ borderColor: "rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)" }}>
                  {header.ctaSecondaryLabel || "Preview Course"}
                </span>
              )}
            </div>
          )}
        </div>
        {isSplit && (
          <div className="hidden md:flex flex-col items-center justify-center w-36 flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 flex items-center justify-center text-4xl mb-2"
              style={{ borderColor: accent + "35", background: "rgba(255,255,255,0.06)" }}>
              {platformEmoji}
            </div>
            {header.instructorName && <p className="text-[11px] font-semibold text-white/70 text-center leading-tight">{header.instructorName}</p>}
            {header.instructorTitle && <p className="text-[9px] text-white/40 text-center mt-0.5">{header.instructorTitle}</p>}
          </div>
        )}
      </div>
      {basic?.title?.trim() && (
        <div className="absolute top-3 right-3 text-[9px] font-mono font-bold px-2 py-0.5 rounded max-w-[min(200px,45%)] truncate"
          style={{ background: "rgba(0,0,0,0.45)", color: accent, letterSpacing: 0.5 }}
          title="Preview only — final slug is assigned on publish">
          {String(basic.title)
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "") || "…"}
        </div>
      )}
      <div className="absolute bottom-3 right-3">
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
          style={{ background: basic?.isFree ? "#10b98122" : accent + "22", color: basic?.isFree ? "#10b981" : accent, border: `1px solid ${basic?.isFree ? "#10b98144" : accent + "44"}` }}>
          {basic?.isFree ? "FREE" : `${basic?.currency || "USD"} ${basic?.price || "—"}`}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  COURSE HEADER BUILDER
// ═══════════════════════════════════════════════════════════════════════════
function CourseHeaderBuilder({ data, onChange, basic }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4 md:p-6">
        <SectionHeader icon={Star} title="Course Page Header" subtitle="Hero banner displayed at the top of the course detail page" />

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border mt-4 mb-5">
          <div>
            <p className="text-sm font-semibold">{data.enabled ? "Header Enabled ✅" : "Header Disabled"}</p>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {data.enabled ? "A hero banner will appear on the course detail page" : "No banner will be shown"}
            </p>
          </div>
          <Switch checked={!!data.enabled} onCheckedChange={v => set("enabled", v)} />
        </div>

        {data.enabled && (
          <div className="space-y-6">

            {/* Live Preview */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Live Preview</p>
              <CourseHeaderPreview header={data} basic={basic} />
            </div>

            {/* Layout */}
            <div>
              <FieldLabel>Layout</FieldLabel>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {HEADER_LAYOUTS.map(l => (
                  <button key={l.id} type="button" onClick={() => set("layout", l.id)}
                    className={cn("py-2.5 rounded-lg border-2 text-center transition-all text-xs font-semibold",
                      data.layout === l.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                    <div className="text-xl mb-1">{l.icon}</div>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text */}
            <div className="space-y-3">
              <div>
                <FieldLabel hint="Defaults to course title">Headline</FieldLabel>
                <Input value={data.headline} onChange={e => set("headline", e.target.value)}
                  placeholder={basic?.title || "Master Cloud Architecture from Zero to Hero"} className="bg-muted/30" />
              </div>
              <div>
                <FieldLabel hint="Defaults to short description">Subheadline / Tagline</FieldLabel>
                <RichEditor value={data.subheadline} onChange={(html) => set("subheadline", html)}
                  placeholder={basic?.description || "A compelling tagline that converts visitors to enrolled students..."}
                  className="bg-muted/30" />
              </div>
            </div>

            {/* Background gradient */}
            <div>
              <FieldLabel>Background Gradient</FieldLabel>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1.5 mb-3">
                {HEADER_GRADIENTS.map(g => (
                  <button key={g.id} type="button" title={g.label}
                    onClick={() => { set("gradientId", g.id); set("useCustomColor", false); }}
                    className={cn("relative rounded-xl overflow-hidden h-11 border-2 transition-all",
                      !data.useCustomColor && data.gradientId === g.id ? "border-primary ring-2 ring-primary/30 scale-105" : "border-transparent hover:border-primary/40")}>
                    <div className="absolute inset-0" style={{ background: g.value }} />
                    <span className="absolute bottom-0.5 left-0 right-0 text-[8px] text-white/80 text-center font-semibold px-0.5">{g.label}</span>
                    {!data.useCustomColor && data.gradientId === g.id && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={() => set("useCustomColor", !data.useCustomColor)}
                  className={cn("px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all flex items-center gap-2",
                    data.useCustomColor ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:border-primary/40")}>
                  <span className="w-3 h-3 rounded-full border border-current" style={{ background: data.customColor || "#1a1a2e" }} />
                  Custom Color
                </button>
                {data.useCustomColor && (
                  <input type="color" value={data.customColor || "#1a1a2e"}
                    onChange={e => set("customColor", e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5" />
                )}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <FieldLabel>Accent Color</FieldLabel>
              <div className="flex flex-wrap gap-2.5 mt-1.5">
                {HEADER_ACCENT_COLORS.map(a => (
                  <button key={a.id} type="button" title={a.label} onClick={() => set("accentColorId", a.id)}
                    className={cn("w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center shadow-sm",
                      data.accentColorId === a.id ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105")}
                    style={{ background: a.value }}>
                    {data.accentColorId === a.id && (
                      <Check className="w-3.5 h-3.5" style={{ color: a.id === "white" ? "#374151" : "#000", opacity: 0.8 }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Background image */}
            <div>
              <FieldLabel hint="Optional texture / photo overlaid on gradient">Background Image URL</FieldLabel>
              <Input value={data.bgImageUrl || ""} onChange={e => set("bgImageUrl", e.target.value)}
                placeholder="https://cdn.example.com/hero-bg.jpg" className="bg-muted/30 text-xs" />
            </div>

            {/* Instructor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Instructor Name</FieldLabel>
                <Input value={data.instructorName} onChange={e => set("instructorName", e.target.value)}
                  placeholder="Dr. Sarah Mitchell" className="bg-muted/30" />
              </div>
              <div>
                <FieldLabel>Instructor Title</FieldLabel>
                <Input value={data.instructorTitle} onChange={e => set("instructorTitle", e.target.value)}
                  placeholder="Senior Cloud Architect, AWS" className="bg-muted/30" />
              </div>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Primary CTA Label</FieldLabel>
                <Input value={data.ctaLabel} onChange={e => set("ctaLabel", e.target.value)}
                  placeholder="Enroll Now" className="bg-muted/30" />
              </div>
              <div>
                <FieldLabel>Secondary CTA Label</FieldLabel>
                <Input value={data.ctaSecondaryLabel} onChange={e => set("ctaSecondaryLabel", e.target.value)}
                  placeholder="Preview Course" className="bg-muted/30" />
              </div>
            </div>

            {/* Visibility toggles */}
            <div className="space-y-2">
              {[
                { key: "showBadges", label: "Show Category / Level / Platform Badges" },
                { key: "showRating", label: "Show Star Rating" },
                { key: "showEnrolled", label: "Show Enrolled Count" },
                { key: "showDuration", label: "Show Course Duration" },
                { key: "showCta", label: "Show Primary CTA Button" },
                { key: "showSecondaryCta", label: "Show Secondary CTA Button" },
                { key: "patternOverlay", label: "Show Dot Grid Pattern Overlay" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border p-2.5 hover:bg-muted/20">
                  <p className="text-sm">{label}</p>
                  <Switch checked={!!data[key]} onCheckedChange={v => set(key, v)} />
                </div>
              ))}
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  STEP 1
// ═══════════════════════════════════════════════════════════════════════════
function Step1({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const [techInput, setTechInput] = useState("");
  // dynamic categories (cached 10m via store)
  const { data: catData } = useGetActiveCategoriesQuery(undefined, { refetchOnMountOrArgChange: false });
  const catRows =
    catData?.data?.rows ||
    catData?.rows ||
    catData?.data ||
    catData ||
    [];
  const categories = Array.isArray(catRows)
    ? catRows.map((c) => c.name || c.title || c.slug || c)
    : [];
  // technology skill suggestions (cached 10m via store)
  const { data: techData } = useGetActiveTechSkillsQuery({ limit: 200 }, { refetchOnMountOrArgChange: false });
  const techRows =
    techData?.data?.rows ||
    techData?.rows ||
    techData?.data ||
    techData ||
    [];
  const techSuggestions = Array.isArray(techRows)
    ? techRows.map((s) => s.name || s.title).filter(Boolean)
    : [];
  const addTech = (e) => {
    if (e.key !== "Enter" || !techInput.trim()) return;
    e.preventDefault();
    if (!(data.techStack || []).includes(techInput.trim()))
      set("techStack", [...(data.techStack || []), techInput.trim()]);
    setTechInput("");
  };
  const removeTech = (t) => set("techStack", (data.techStack || []).filter(x => x !== t));

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={BookOpen} title="Course Details" subtitle="Core information shown on listing and overview pages" />
          <div className="space-y-4 mt-4">
            <div>
              <FieldLabel required>Course Title</FieldLabel>
              <Input placeholder="e.g. Complete AWS Solutions Architect Course" value={data.title} onChange={e => set("title", e.target.value)} className="bg-muted/30" />
              <p className="text-xs text-muted-foreground mt-2">
                Public URL and course code are generated from this title when you publish (e.g.{" "}
                <span className="font-mono">/courses/your-course-slug</span>).
              </p>
            </div>
            <div>
              <FieldLabel required hint="~150–200 chars shown in course cards">Short Description</FieldLabel>
              <RichEditor
                placeholder="A comprehensive course covering real-world cloud architecture skills..."
                value={data.description}
                onChange={(html) => set("description", html)}
                className="bg-muted/30 min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{data.description?.replace(/<[^>]*>/g, "").length || 0} / 200</p>
            </div>
            <div>
              <FieldLabel hint="Full overview shown on the course detail page">Full Description</FieldLabel>
              <RichEditor
                placeholder="Detailed course content, prerequisites, and what learners will achieve..."
                value={data.fullDescription}
                onChange={(html) => set("fullDescription", html)}
                className="bg-muted/30 min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel required>Category</FieldLabel>
                <Select value={data.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
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
                <FieldLabel>Cloud Platform</FieldLabel>
                <Select value={data.platform} onValueChange={v => set("platform", v)}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FieldLabel hint="Press Enter to add">Technology Stack</FieldLabel>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border min-h-[48px] focus-within:ring-2 focus-within:ring-ring">
                {(data.techStack || []).map(tech => (
                  <Badge key={tech} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1.5">
                    {tech}
                    <button type="button" onClick={() => removeTech(tech)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
                <input
                  type="text"
                  placeholder="Add technology…"
                  value={techInput}
                  onChange={e => setTechInput(e.target.value)}
                  onKeyDown={addTech}
                  list="tech-suggestions"
                  className="bg-transparent border-0 outline-none text-sm flex-1 min-w-[120px]"
                />
                <datalist id="tech-suggestions">
                  {techSuggestions.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={Settings} title="Duration & Credits" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="col-span-2">
              <FieldLabel>Total Duration</FieldLabel>
              <div className="flex gap-2">
                <Input type="number" min="0" placeholder="10" value={data.durationValue} onChange={e => set("durationValue", e.target.value)} className="bg-muted/30" />
                <Select value={data.durationUnit || "Hours"} onValueChange={v => set("durationUnit", v)}>
                  <SelectTrigger className="bg-muted/30 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{DURATION_UNITS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FieldLabel>Credits</FieldLabel>
              <Input placeholder="12" value={data.credits} onChange={e => set("credits", e.target.value)} className="bg-muted/30" />
            </div>
            <div>
              <FieldLabel hint="0.0–5.0">Rating</FieldLabel>
              <Input type="number" step="0.1" min="0" max="5" value={data.rating} onChange={e => set("rating", e.target.value)} className="bg-muted/30" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={ToggleLeft} title="Pricing & Enrollment" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start mt-4">
            <div className="col-span-1 sm:col-span-2">
              <FieldLabel>Pricing</FieldLabel>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{data.isFree ? "Free Course" : "Paid Course"}</p>
                  <p className="text-xs text-muted-foreground">{data.isFree ? "No cost" : "Requires purchase"}</p>
                </div>
                <Switch checked={!data.isFree} onCheckedChange={v => set("isFree", !v)} />
              </div>
            </div>
            {!data.isFree && (
              <>
                <div>
                  <FieldLabel required>Price ($)</FieldLabel>
                  <Input type="number" step="0.01" placeholder="49.99" value={data.price} onChange={e => set("price", e.target.value)} className="bg-muted/30" />
                </div>
                <div>
                  <FieldLabel>Currency</FieldLabel>
                  <Select value={data.currency || "USD"} onValueChange={v => set("currency", v)}>
                    <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                    <SelectContent>{["USD", "INR", "EUR", "GBP", "AUD", "CAD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
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
//  STEP 2
// ═══════════════════════════════════════════════════════════════════════════
function Step2({ data, onChange, basic }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const [expandedModule, setExpandedModule] = useState(null);

  const updateList = (key, i, val) => { const a = [...(data[key] || [])]; a[i] = val; set(key, a); };
  const addListItem = (key) => set(key, [...(data[key] || []), ""]);
  const removeListItem = (key, i) => set(key, (data[key] || []).filter((_, j) => j !== i));

  const addModule = () => {
    const m = { id: uid(), title: `Module ${(data.modules || []).length + 1}: New Module`, lessons: [] };
    set("modules", [...(data.modules || []), m]);
    setExpandedModule(m.id);
  };
  const removeModule = (id) => set("modules", (data.modules || []).filter(m => m.id !== id));
  const updateModule = (id, field, val) => set("modules", (data.modules || []).map(m => m.id === id ? { ...m, [field]: val } : m));
  const toggleExpand = (id) => setExpandedModule(prev => prev === id ? null : id);
  const addLesson = (moduleId) => {
    const lesson = { id: uid(), title: "New Lesson", type: "video", duration: "15 Min", free: false, labId: "", _videoFile: null, videoUrl: "" };
    set("modules", (data.modules || []).map(m => m.id === moduleId ? { ...m, lessons: [...m.lessons, lesson] } : m));
  };
  const removeLesson = (moduleId, lessonId) =>
    set("modules", (data.modules || []).map(m => m.id === moduleId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m));
  const updateLesson = (moduleId, lessonId, field, val) =>
    set("modules", (data.modules || []).map(m =>
      m.id === moduleId ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, [field]: val } : l) } : m));

  const thumbPreview = data._thumbnailFile ? URL.createObjectURL(data._thumbnailFile) : data.thumbnail || "";
  const totalLessons = (data.modules || []).reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="space-y-4">

      {/* ── COURSE HEADER BUILDER — first card in Step 2 ── */}
      <CourseHeaderBuilder
        data={data.header || defaultHeader()}
        onChange={header => set("header", header)}
        basic={basic}
      />

      {/* Thumbnail */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={ImageIcon} title="Course Thumbnail" subtitle="Recommended: 1280×720px" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-3">
              <MediaUploader accept="image" value={data._thumbnailFile || null} previewUrl={data.thumbnail || ""}
                onChange={f => { set("_thumbnailFile", f); if (!f) set("thumbnail", ""); }}
                maxMB={5} hint="JPG / PNG / WebP, max 5MB" showPreview={false} />
              <div>
                <FieldLabel hint="Or paste existing CDN URL">Image URL</FieldLabel>
                <Input placeholder="https://cdn.example.com/thumb.jpg" value={data.thumbnail || ""}
                  onChange={e => { set("thumbnail", e.target.value); set("_thumbnailFile", null); }}
                  className="bg-muted/30 text-xs" />
              </div>
            </div>
            <div className="aspect-video rounded-xl border border-border bg-muted overflow-hidden flex items-center justify-center">
              {thumbPreview
                ? <img src={thumbPreview} alt="preview" className="w-full h-full object-cover" />
                : <div className="text-center text-muted-foreground"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No image selected</p></div>
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intro Video */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={Video} title="Intro Video" subtitle="Short preview for prospective students" />
          <div className="space-y-3 mt-4">
            <MediaUploader accept="video" value={data._introVideoFile || null} previewUrl={data.introVideoUrl || ""}
              onChange={f => { set("_introVideoFile", f); if (!f) set("introVideoUrl", ""); }}
              maxMB={500} hint="MP4 / WebM, max 500MB" showPreview={false} />
            <div>
              <FieldLabel hint="Or paste YouTube / Vimeo / MP4 URL">Video URL</FieldLabel>
              <Input placeholder="https://youtube.com/embed/xxx" value={data.introVideoUrl || ""}
                onChange={e => { set("introVideoUrl", e.target.value); set("_introVideoFile", null); }}
                className="bg-muted/30 text-xs" />
            </div>
          </div>
          {(data._thumbnailFile || data._introVideoFile) && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Files will be uploaded as part of <strong>POST /courses/create-full</strong> with progress bar.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What you'll learn */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={CheckCircle} title="What Students Will Learn" />
          <div className="space-y-2 mt-4">
            {(data.whatYouLearn || [""]).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-green-500 text-sm flex-shrink-0">✓</span>
                <Input value={item} onChange={e => updateList("whatYouLearn", i, e.target.value)} placeholder={`Learning outcome ${i + 1}`} className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeListItem("whatYouLearn", i)}><X className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-1 text-primary border-primary/30" onClick={() => addListItem("whatYouLearn")}><Plus className="w-3.5 h-3.5 mr-1" />Add Outcome</Button>
          </div>
        </CardContent>
      </Card>

      {/* Prerequisites */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={BookOpen} title="Prerequisites" />
          <div className="space-y-2 mt-4">
            {(data.requirements || [""]).map((req, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <Input value={req} onChange={e => updateList("requirements", i, e.target.value)} placeholder={`Prerequisite ${i + 1}`} className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeListItem("requirements", i)}><X className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-1 text-primary border-primary/30" onClick={() => addListItem("requirements")}><Plus className="w-3.5 h-3.5 mr-1" />Add Prerequisite</Button>
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <SectionHeader icon={Layers} title="Course Syllabus" subtitle="Modules and labs." />
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className="text-xs">{(data.modules || []).length}M · {totalLessons}L</Badge>
              <Button type="button" size="sm" onClick={addModule}><Plus className="w-3.5 h-3.5 mr-1" />Add Module</Button>
            </div>
          </div>
          {(data.modules || []).length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No modules yet</p>
              <p className="text-xs mt-1">Click "Add Module" to structure your course</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(data.modules || []).map((mod, mi) => (
                <div key={mod.id} className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20 cursor-pointer" onClick={() => toggleExpand(mod.id)}>
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 hidden sm:block" />
                    <div className="w-6 h-6 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{mi + 1}</div>
                    <input value={mod.title} onChange={e => { e.stopPropagation(); updateModule(mod.id, "title", e.target.value); }} onClick={e => e.stopPropagation()}
                      placeholder="Module title" className="flex-1 bg-transparent border-none outline-none text-sm font-semibold min-w-0" />
                    <Badge variant="outline" className="text-xs flex-shrink-0 hidden sm:flex">{mod.lessons.length} labs</Badge>
                    {expandedModule === mod.id ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 flex-shrink-0" onClick={e => { e.stopPropagation(); removeModule(mod.id); }}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                  {expandedModule === mod.id && (
                    <div className="p-3 space-y-2">
                      <div className="hidden sm:grid grid-cols-12 gap-2 mb-1">
                        {["LAB TITLE", "TYPE", "DURATION", "FREE?", ""].map((h, i) => (
  <div key={i} className={cn("text-[10px] font-semibold text-muted-foreground uppercase tracking-wide",
    i === 0 ? "col-span-5" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-1 text-center" : "col-span-1")}>{h}</div>
))}
                      </div>
                      {mod.lessons.length === 0 && <p className="text-xs text-muted-foreground italic py-2 text-center">No labs yet</p>}
                      {mod.lessons.map(lesson => (
                        <div key={lesson.id}>
                          <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                            <Input value={lesson.title} onChange={e => updateLesson(mod.id, lesson.id, "title", e.target.value)} placeholder="Lab name" className="col-span-5 bg-muted/30 h-8 text-sm" />
                            <Select value={lesson.type} onValueChange={v => updateLesson(mod.id, lesson.id, "type", v)}>
                              <SelectTrigger className="col-span-3 bg-muted/30 h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{LESSON_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input value={lesson.duration} onChange={e => updateLesson(mod.id, lesson.id, "duration", e.target.value)} placeholder="15 Min" className="col-span-2 bg-muted/30 h-8 text-sm" />
                            <div className="col-span-1 flex justify-center">
                              <Switch checked={lesson.free} onCheckedChange={v => updateLesson(mod.id, lesson.id, "free", v)} className="scale-75" />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="col-span-1 h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => removeLesson(mod.id, lesson.id)}><X className="w-3 h-3" /></Button>
                          </div>
                          <div className="sm:hidden space-y-2 p-2 border border-border rounded-lg bg-muted/10">
                            <div className="flex items-center gap-2">
                              <Input value={lesson.title} onChange={e => updateLesson(mod.id, lesson.id, "title", e.target.value)} placeholder="Lesson name" className="bg-muted/30 h-8 text-sm flex-1" />
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 flex-shrink-0" onClick={() => removeLesson(mod.id, lesson.id)}><X className="w-3 h-3" /></Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={lesson.type} onValueChange={v => updateLesson(mod.id, lesson.id, "type", v)}>
                                <SelectTrigger className="bg-muted/30 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{LESSON_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
                              </Select>
                              <Input value={lesson.duration} onChange={e => updateLesson(mod.id, lesson.id, "duration", e.target.value)} placeholder="15 Min" className="bg-muted/30 h-8 text-xs" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Free preview</span>
                              <Switch checked={lesson.free} onCheckedChange={v => updateLesson(mod.id, lesson.id, "free", v)} className="scale-75" />
                            </div>
                          </div>
                          {lesson.type === "lab" && (
                            <div className="mt-1 ml-1">
                              <LabPicker value={lesson.labId} onChange={labId => updateLesson(mod.id, lesson.id, "labId", labId)} />
                            </div>
                          )}
                          {lesson.type === "video" && (
                            <div className="mt-2 ml-1 p-3 bg-muted/20 rounded-lg border border-dashed border-border">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                <Video className="w-3 h-3" /> Lesson Video
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <MediaUploader
                                  accept="video"
                                  value={lesson._videoFile || null}
                                  previewUrl={lesson.videoUrl || ""}
                                  onChange={f => {
                                    updateLesson(mod.id, lesson.id, "_videoFile", f);
                                    if (!f) updateLesson(mod.id, lesson.id, "videoUrl", "");
                                  }}
                                  maxMB={500}
                                  hint="MP4 / WebM, max 500MB"
                                  showPreview={false}
                                />
                                <div className="space-y-2">
                                  <FieldLabel hint="Or paste video URL">Direct Video URL</FieldLabel>
                                  <Input
                                    placeholder="https://example.com/video.mp4"
                                    value={lesson.videoUrl || ""}
                                    onChange={e => {
                                      updateLesson(mod.id, lesson.id, "videoUrl", e.target.value);
                                      updateLesson(mod.id, lesson.id, "_videoFile", null);
                                    }}
                                    className="bg-white text-xs h-8"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="mt-1 h-7 text-xs text-primary border-dashed border-primary/40" onClick={() => addLesson(mod.id)}>
  <Plus className="w-3 h-3 mr-1" />Add Lesson
</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LabPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  // Fetch labs dynamically (cached by RTK Query)
  const { data: labsData } = useGetPublicLabsQuery({  limit: 100 }, { refetchOnMountOrArgChange: false });
  const rows =
    labsData?.data?.rows || labsData?.rows || labsData?.data || labsData || [];
  const LABS = Array.isArray(rows)
    ? rows.map((l) => ({
        id: l.id || l._id,
        code: l.code || l.slug || "",
        title: l.title,
        level: l.difficulty || "Intermediate",
        duration: l.time_limit_minutes ? `${Math.round(l.time_limit_minutes)} min` : "N/A",
        platform: l.platform || "",
        type: l.type || undefined,
      }))
    : [];
  const selected = LABS.find(l => l.id === value);
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
      <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" />Link a Lab</p>
      {selected ? (
        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-primary/20">
          <FlaskConical className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{selected.title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground font-mono">{selected.code}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1">{selected.level}</Badge>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground h-7 text-xs" onClick={() => onChange("")}>Change</Button>
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" size="sm" className="border-dashed border-primary/40 text-primary text-xs" onClick={() => setOpen(!open)}>
            <Plus className="w-3 h-3 mr-1" />Select a lab
          </Button>
          {open && (
            <div className="mt-2 border border-border rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
              {LABS.map(lab => (
                <div key={lab.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 cursor-pointer border-b last:border-b-0"
                  onClick={() => { onChange(lab.id); setOpen(false); }}>
                  <FlaskConical className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{lab.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono">{lab.code}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1">{lab.level}</Badge>
                      {lab.type === "skill-builder" && <Badge className="text-[10px] py-0 px-1 bg-amber-100 text-amber-700">Skill Builder</Badge>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0"><Clock className="w-3 h-3" />{lab.duration}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  STEP 3
// ═══════════════════════════════════════════════════════════════════════════
function Step3({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const selectedIds = data.featuredLabs || [];
  // Dynamic labs list for selection
  const { data: labsData } = useGetPublicLabsQuery({  limit: 100 }, { refetchOnMountOrArgChange: false });
  const rows =
    labsData?.data?.rows || labsData?.rows || labsData?.data || labsData || [];
  const LABS = Array.isArray(rows)
    ? rows.map((l) => ({
        id: l.id || l._id,
        code: l.code || l.slug || "",
        title: l.title,
        level: l.difficulty || "Intermediate",
        duration: l.time_limit_minutes ? `${Math.round(l.time_limit_minutes)} min` : "N/A",
        platform: l.platform || "",
        type: l.type || undefined,
      }))
    : [];
  const toggle = (lab) => {
    const exists = selectedIds.includes(lab.id);
    set("featuredLabs", exists ? selectedIds.filter(id => id !== lab.id) : [...selectedIds, lab.id]);
  };
  const updateList = (key, i, val) => { const a = [...(data[key] || [])]; a[i] = val; set(key, a); };
  const addListItem = (key) => set(key, [...(data[key] || []), ""]);
  const removeListItem = (key, i) => set(key, (data[key] || []).filter((_, j) => j !== i));
  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={FlaskConical} title="Featured Labs" subtitle="Showcase on the course overview page" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {LABS.map(lab => {
              const isSelected = selectedIds.includes(lab.id);
              return (
                <div key={lab.id} onClick={() => toggle(lab)}
                  className={cn("p-3 border-2 rounded-xl cursor-pointer transition-all", isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{lab.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">{lab.code}</span>
                        <Badge variant="outline" className="text-xs py-0">{lab.level}</Badge>
                        {lab.type === "skill-builder" && <Badge className="text-xs py-0 bg-amber-100 text-amber-700">Skill Builder</Badge>}
                      </div>
                    </div>
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", isSelected ? "border-primary bg-primary" : "border-muted-foreground/40")}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={FileText} title="Course Notes" subtitle="Additional notes on the course page sidebar" />
          <div className="space-y-2 mt-4">
            {(data.courseNotes || [""]).map((note, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <Input value={note} onChange={e => updateList("courseNotes", i, e.target.value)} placeholder={`Course note ${i + 1}`} className="bg-muted/30 flex-1" />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeListItem("courseNotes", i)}><X className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-3 text-primary border-primary/30" onClick={() => addListItem("courseNotes")}><Plus className="w-3.5 h-3.5 mr-1" />Add Note</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  STEP 4
// ═══════════════════════════════════════════════════════════════════════════
function Step4({ data, onChange, courseTitle }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const setCert = (k, v) => onChange({ ...data, certificate: { ...(data.certificate || {}), [k]: v } });
  const cert = data.certificate || {};
  const selectedTemplate = CERT_TEMPLATES.find(t => t.id === (cert.templateId || "classic-blue")) || CERT_TEMPLATES[0];
  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={Lock} title="Pricing Model" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 mb-4">
            {[
              { id: "free", label: "Free Course", desc: "All content accessible without payment", icon: Unlock, color: "text-emerald-500", bg: "bg-emerald-50" },
              { id: "paid", label: "Paid Course", desc: "Students purchase access", icon: Lock, color: "text-primary", bg: "bg-primary/10" },
            ].map(opt => (
              <div key={opt.id} onClick={() => set("pricingModel", opt.id)}
                className={cn("p-4 border-2 rounded-xl cursor-pointer relative", data.pricingModel === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                {data.pricingModel === opt.id && <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2", opt.bg)}><opt.icon className={cn("w-4 h-4", opt.color)} /></div>
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            ))}
          </div>
          {data.pricingModel === "paid" && (
            <div className="p-4 bg-muted/30 rounded-xl border flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground font-medium">$</span>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={data.price || ""} onChange={e => set("price", e.target.value)} className="bg-white w-32" />
              <Select value={data.currency || "USD"} onValueChange={v => set("currency", v)}>
                <SelectTrigger className="bg-white w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{["USD", "INR", "EUR", "GBP", "AUD", "CAD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={Settings} title="Course Behavior" />
          <div className="space-y-2 mt-4">
            {[
              { key: "isPublished", label: "Published", desc: "Make visible to students immediately" },
              { key: "allowPreview", label: "Allow Free Preview", desc: "Show first lesson to non-enrolled" },
              { key: "requireSequential", label: "Sequential Modules", desc: "Students must complete in order" },
              { key: "requirePrerequisites", label: "Require Prerequisites", desc: "Must complete prerequisite courses first" },
              { key: "privateAccess", label: "Private Access Only", desc: "Only specific groups can enroll" },
              { key: "showProgress", label: "Show Progress Bar", desc: "Display completion progress to students" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/20">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{desc}</p>
                </div>
                <Switch checked={!!data[key]} onCheckedChange={v => set(key, v)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={Trophy} title="Completion Message" />
          <Textarea value={data.completionMessage || ""} onChange={e => set("completionMessage", e.target.value)}
            placeholder="🎉 Congratulations! You've taken a big step forward in your cloud career." rows={3} className="bg-muted/30 mt-4" />
        </CardContent>
      </Card>
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={Award} title="Completion Certificate" subtitle="Issue a certificate on course completion" />
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border mt-4 mb-5">
            <div>
              <p className="text-sm font-semibold">{cert.enabled ? "Certificate Enabled ✅" : "Certificate Disabled"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{cert.enabled ? "Students will receive a certificate upon completion" : "No certificate will be issued"}</p>
            </div>
            <Switch checked={!!cert.enabled} onCheckedChange={v => setCert("enabled", v)} />
          </div>
          {cert.enabled && (
            <div className="space-y-4 ">
              <div className="h-full rounded-lg border p-3 bg-muted/20 text-xs text-muted-foreground">
                <FieldLabel>Select Certificate</FieldLabel>
                <Select
                  className="bg-muted/30 mt-4"
                  value={cert.certificationId || ""}
                  onValueChange={(v) => setCert("certificationId", v)}
                >
                  <SelectTrigger className="bg-white w-full h-full sm:w-96 mt-2 ">
                    <SelectValue placeholder="Choose an existing certificate" />
                  </SelectTrigger>
                  <SelectContent className="bg-white w-full h-full sm:w-96 mt-2 ">
                    {AVAILABLE_CERTIFICATES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cert.certificationId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: {AVAILABLE_CERTIFICATES.find(x => x.id === cert.certificationId)?.title}
                  </p>
                )}
              </div>
              <div className="rounded-lg border p-3 bg-muted/20 text-xs text-muted-foreground">
                Pick a linked program certificate above, or fill in the signatory details below for a custom completion certificate.
              </div>

              <div className="space-y-3 pt-2 border-t border-dashed border-border mt-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Certificate signature</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cert.certificationId
                      ? "Optional — shown on the certificate PDF if your template uses it."
                      : "Required — name that appears on the learner’s certificate."}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Signatory name</FieldLabel>
                    <Input
                      value={cert.signatoryName || ""}
                      onChange={(e) => setCert("signatoryName", e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <FieldLabel>Signatory title</FieldLabel>
                    <Input
                      value={cert.signatoryTitle || ""}
                      onChange={(e) => setCert("signatoryTitle", e.target.value)}
                      placeholder="e.g. Director of Training"
                      className="bg-white"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Organization (optional)</FieldLabel>
                  <Input
                    value={cert.orgName || ""}
                    onChange={(e) => setCert("orgName", e.target.value)}
                    placeholder={courseTitle ? `e.g. ${courseTitle}` : "e.g. ALAR Labs"}
                    className="bg-white sm:max-w-md"
                  />
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
//  STEP 5
// ═══════════════════════════════════════════════════════════════════════════
function Step5({ all, onPublish, isPublishing, validationErrors, onGoToStep }) {
  const { basic = {}, media = {}, labs = {}, settings = {} } = all;
  const [showJSON, setShowJSON] = useState(false);
  const [copied, setCopied] = useState(false);
  const modules = media.modules || [];
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const labLessons = modules.flatMap(m => m.lessons.filter(l => l.type === "lab"));
  const featuredLabs = labs.featuredLabs || [];
  const thumbUrl = media._thumbnailFile ? URL.createObjectURL(media._thumbnailFile) : media.thumbnail || "";
  const hasPendingFiles = !!(media._thumbnailFile || media._introVideoFile);
  const header = media.header || {};

  const output = {
    _endpoint: "POST /owner/courses/create-full  (multipart/form-data)",
    title: basic.title || "", code: "(auto from title)",
    description: basic.description || "", fullDescription: basic.fullDescription || "",
    category: basic.category || "", level: basic.level || "", platform: basic.platform || "",
    techStack: basic.techStack || [],
    duration: basic.durationValue ? `${basic.durationValue} ${basic.durationUnit}` : "",
    isFree: !!basic.isFree, price: basic.price ? Number(basic.price) : 0,
    thumbnail: media._thumbnailFile ? `[FILE: ${media._thumbnailFile.name}]` : media.thumbnail || "(none)",
    introVideoUrl: media._introVideoFile ? `[FILE: ${media._introVideoFile.name}]` : media.introVideoUrl || "(none)",
    header: header.enabled !== false ? {
      headline: header.headline || basic.title || "",
      subheadline: header.subheadline || basic.description || "",
      layout: header.layout || "left-hero",
      gradientId: header.gradientId || "slate-pro",
      accentColorId: header.accentColorId || "amber",
      instructorName: header.instructorName || "",
      instructorTitle: header.instructorTitle || "",
      ctaLabel: header.ctaLabel || "Enroll Now",
      ctaSecondaryLabel: header.ctaSecondaryLabel || "Preview Course",
      showBadges: !!header.showBadges, showRating: !!header.showRating,
      showEnrolled: !!header.showEnrolled, showDuration: !!header.showDuration,
      showCta: !!header.showCta, showSecondaryCta: !!header.showSecondaryCta,
      patternOverlay: !!header.patternOverlay,
    } : null,
    whatYouLearn: (media.whatYouLearn || []).filter(Boolean),
    requirements: (media.requirements || []).filter(Boolean),
    featuredLabs, courseNotes: (labs.courseNotes || []).filter(Boolean),
    modules: modules.map(({ id, ...m }) => ({ title: m.title, lessons: m.lessons.map(({ id: lid, ...l }) => l) })),
    settings: {
      pricingModel: settings.pricingModel || "free", isPublished: !!settings.isPublished,
      allowPreview: !!settings.allowPreview, requireSequential: !!settings.requireSequential,
      requirePrerequisites: !!settings.requirePrerequisites, privateAccess: !!settings.privateAccess,
      showProgress: !!settings.showProgress, completionMessage: settings.completionMessage || "",
      certificate: settings.certificate || null,
    },
  };

  const jsonStr = JSON.stringify(output, null, 2);
  const copy = async () => { try { await navigator.clipboard.writeText(jsonStr); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { } };
  const hasErrors = validationErrors?.length > 0;

  return (
    <div className="space-y-4">

      {/* Header preview in Step 5 */}
      {header.enabled !== false && (
        <Card className="border shadow-sm">
          <CardContent className="p-4 md:p-6">
            <SectionHeader icon={Star} title="Course Header Preview" subtitle="This banner will appear on the course detail page" />
            <div className="mt-3"><CourseHeaderPreview header={header} basic={basic} /></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Modules", value: modules.length, bg: "bg-blue-50", fg: "text-blue-600", Icon: Layers },
          { label: "Total Lessons", value: totalLessons, bg: "bg-purple-50", fg: "text-purple-600", Icon: BookOpen },
          { label: "Lab Lessons", value: labLessons.length, bg: "bg-green-50", fg: "text-green-600", Icon: FlaskConical },
          { label: "Featured Labs", value: featuredLabs.length, bg: "bg-amber-50", fg: "text-amber-600", Icon: Star },
        ].map(({ label, value, bg, fg, Icon }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-3 flex items-center gap-2">
              <div className={cn("p-2 rounded-lg flex-shrink-0", bg)}><Icon className={cn("w-4 h-4", fg)} /></div>
              <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasErrors && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" /><p className="text-sm font-semibold text-red-800">Fix before publishing:</p></div>
          <ul className="space-y-1.5">
            {validationErrors.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs text-red-700">
                <span>{e.msg}</span>
                <button onClick={() => onGoToStep(e.step)} className="text-[10px] font-bold border border-red-300 rounded px-1.5 py-0.5 hover:bg-red-100 whitespace-nowrap flex-shrink-0">Step {e.step}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <SectionHeader icon={CheckCircle} title="Course Summary" subtitle="Review before publishing" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 mt-4">
            {[
              ["Title", basic.title || "—"], ["URL / code", "Generated on publish"], ["Category", basic.category || "—"],
              ["Level", basic.level || "—"], ["Platform", basic.platform || "—"],
              ["Duration", basic.durationValue ? `${basic.durationValue} ${basic.durationUnit}` : "—"],
              ["Thumbnail", thumbUrl ? "✅ Set" : "⚠️ Not set"],
              ["Intro Video", media.introVideoUrl || media._introVideoFile ? "✅ Set" : "Not set"],
              ["Header", null], ["Pricing", null], ["Status", null], ["Certificate", null],
            ].map(([label, val]) => (
              <div key={label} className="flex items-start justify-between py-2 border-b border-border gap-3">
                <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
                {label === "Pricing" ? (
                  <Badge className={basic.isFree ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{basic.isFree ? "Free" : `${basic.currency || "USD"} ${basic.price}`}</Badge>
                ) : label === "Status" ? (
                  <Badge className={settings.isPublished ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>{settings.isPublished ? "Published" : "Draft"}</Badge>
                ) : label === "Certificate" ? (
                  <Badge className={settings.certificate?.enabled ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}>{settings.certificate?.enabled ? "✅ Enabled" : "Disabled"}</Badge>
                ) : label === "Header" ? (
                  <Badge className={header.enabled !== false ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}>
                    {header.enabled !== false ? `✅ ${header.layout || "left-hero"}` : "Disabled"}
                  </Badge>
                ) : (
                  <span className="text-xs font-medium text-right break-all">{val}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {thumbUrl && (
        <Card className="border shadow-sm">
          <CardContent className="p-4 md:p-6">
            <SectionHeader icon={ImageIcon} title="Thumbnail Preview" />
            <img src={thumbUrl} alt="thumbnail" className="mt-3 h-36 rounded-xl object-cover border border-border" />
          </CardContent>
        </Card>
      )}

      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary flex-shrink-0"><Code2 className="w-4 h-4" /></div>
              <div><p className="font-semibold text-sm">API Payload Preview</p><p className="text-xs text-muted-foreground hidden sm:block">What create-full receives</p></div>
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
          <p className="font-semibold text-base mb-1">{hasErrors ? "⚠️ Fix the errors above first" : "✅ Ready to publish!"}</p>
          <p className="text-xs text-muted-foreground mb-4">{hasPendingFiles ? "Files will be uploaded along with course data." : "Course data will be saved immediately."}</p>
          <Button onClick={onPublish} disabled={isPublishing || hasErrors} className="gap-2 px-8" size="lg">
            {isPublishing ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing…</> : <>🚀 Publish Course</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminCourseCreate() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishPhase, setPublishPhase] = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const suppressAutosaveRef = useRef(false);

  const [basic, setBasic] = useState(() => { const d = loadDraft(); return d?.basic || defaultBasic(); });
  const [media, setMedia] = useState(() => {
    const d = loadDraft();
    return d?.media
      ? { ...defaultMedia(), ...d.media, _thumbnailFile: null, _introVideoFile: null, header: { ...defaultHeader(), ...(d.media.header || {}) } }
      : defaultMedia();
  });
  const [labs, setLabs] = useState(() => { const d = loadDraft(); return d?.labs || defaultLabs(); });
  const [settings, setSettings] = useState(() => {
    const d = loadDraft();
    return d?.settings
      ? { ...defaultSettings(), ...d.settings, certificate: { ...defaultSettings().certificate, ...(d.settings.certificate || {}) } }
      : defaultSettings();
  });

  const saveTimer = useRef(null);
  useEffect(() => {
    if (suppressAutosaveRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft({ basic, media, labs, settings });
      setDraftSavedAt(new Date().toLocaleTimeString());
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [basic, media, labs, settings]);

  const handlePublish = useCallback(async () => {
    const errors = validateAll({ basic, media, settings });
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setValidationErrors([]);
    setIsPublishing(true);
    setPublishError(null);
    setPublishPhase("upload");
    try {
      const responseData = await createCourseFull({ basic, media, labs, settings, dispatch });
      const createdCourse = responseData?.data?.course ?? responseData?.course ?? responseData;
      const courseId =
        createdCourse?.id ||
        createdCourse?._id ||
        responseData?.course_id ||
        responseData?.data?.course_id;
      if (!courseId) throw new Error("Server did not return a course ID.");
      setPublishPhase("done");
      setMedia(m => ({ ...m, _thumbnailFile: null, _introVideoFile: null }));
      const createdSlug =
        responseData?.slug ||
        responseData?.data?.slug ||
        createdCourse?.slug ||
        "";
      dispatch(setLastCreated({ id: courseId, title: basic.title, code: createdSlug }));
      suppressAutosaveRef.current = true;
      clearDraft();
      setTimeout(() => navigate("/app/courses/list"), 800);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || "Something went wrong. Please try again.";
      setPublishError(msg);
      setPublishPhase(null);
    } finally {
      setIsPublishing(false);
    }
  }, [basic, media, labs, settings, dispatch, navigate]);

  const handleSaveDraft = useCallback(() => {
    saveDraft({ basic, media, labs, settings });
    setDraftSavedAt(new Date().toLocaleTimeString());
  }, [basic, media, labs, settings]);

  const all = { basic, media, labs, settings };

  return (
    <>
      <ValidationBanner errors={validationErrors} onGoToStep={setStep} onDismiss={() => setValidationErrors([])} />

      {publishError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9996] w-[min(480px,92vw)] bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{publishError}</span>
          <button onClick={() => setPublishError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="mb-4 md:mb-6">
        <Button variant="ghost" className="mb-3 text-muted-foreground -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Courses
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Create New Course</h1>
            <p className="text-muted-foreground mt-0.5 text-sm hidden sm:block">Build a structured course with modules, lessons, and embedded hands-on labs</p>
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
        {step === 2 && <Step2 data={media} onChange={setMedia} basic={basic} />}
        {step === 3 && <Step3 data={labs} onChange={setLabs} />}
        {step === 4 && <Step4 data={settings} onChange={setSettings} courseTitle={basic.title} />}
        {step === 5 && <Step5 all={all} onPublish={handlePublish} isPublishing={isPublishing} validationErrors={validationErrors} onGoToStep={setStep} />}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />{step === 1 ? "Cancel" : "Back"}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleSaveDraft}><Save className="w-4 h-4 mr-2" />Save Draft</Button>
          <Button onClick={() => step < STEPS.length ? setStep(step + 1) : handlePublish()} disabled={step === STEPS.length && isPublishing}>
            {step < STEPS.length
              ? <><span>Continue</span><ArrowRight className="w-4 h-4 ml-2" /></>
              : isPublishing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing…</> : <span>🚀 Publish</span>}
          </Button>
        </div>
      </div>
    </>
  );
}

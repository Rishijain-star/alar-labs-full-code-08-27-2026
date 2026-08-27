import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock, Users, Star, Play, FileText,
  BookOpen, ArrowLeft, Layers,
  CheckCircle2, Lock, Award, Zap, Code2, HelpCircle, Download, Check,
  Link2, Facebook, Twitter, Linkedin, MessageCircle, Share2, ChevronDown, ChevronRight,
  FlaskConical, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import HeroOverviewMediaCard from "@/components/learning/HeroOverviewMediaCard";
import ContentOverviewPageSkeleton from "@/components/learning/ContentOverviewPageSkeleton";
import {
  mapCourseViewPayload,
  normalizeOutlineModules,
  getEnrollCtaLabel,
} from "@/lib/contentDetailMappers";
import { useEnrollCourseMutation } from "@/store/api/learningApi";

const BLOCK_TYPES = [
  { id: "video", label: "Videos", icon: Play, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "richText", label: "Text / Docs", icon: FileText, color: "text-slate-600", bg: "bg-slate-100" },
  { id: "image", label: "Images", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "quiz", label: "Quizzes", icon: HelpCircle, color: "text-yellow-600", bg: "bg-yellow-50" },
  { id: "code", label: "Codes", icon: Code2, color: "text-green-600", bg: "bg-green-50" },
  { id: "project", label: "Projects", icon: Zap, color: "text-pink-600", bg: "bg-pink-50" },
  { id: "download", label: "Downloads", icon: Download, color: "text-teal-600", bg: "bg-teal-50" },
];

function calculateLessonBreakdown(modules) {
  const breakdown = {};
  (modules || []).forEach((mod) => {
    (mod.lessons || []).forEach((les) => {
      const type = les.type || "video";
      breakdown[type] = (breakdown[type] || 0) + 1;
      (les.tasks || []).forEach((t) => {
        const tt = t.type || "richText";
        breakdown[tt] = (breakdown[tt] || 0) + 1;
      });
    });
  });
  return breakdown;
}

const TypeIcon = ({ type, className = "w-3.5 h-3.5" }) => {
  const cfg = BLOCK_TYPES.find((t) => t.id === type) || BLOCK_TYPES[1];
  const Icon = cfg.icon;
  return <Icon className={cn(className, cfg.color)} />;
};

export default function CourseOverviewPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const [enrollCourse] = useEnrollCourseMutation();
  const [activeTab, setActiveTab] = useState("details");
  const [selectedModule, setSelectedModule] = useState(null);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const isEnrolled = !!course?.isPurchased;
  const outlineModules = course ? normalizeOutlineModules(course.modules, { isEnrolled }) : [];
  const ctaLabel = course ? getEnrollCtaLabel({ isEnrolled, isFree: course.isFree }) : "Enroll Now";

  const loadCourse = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const path = `/courses/slug/${encodeURIComponent(slug)}/view`;
      const res = await api.get(path, { withCredentials: true });
      const raw = res?.data?.data || res?.data;
      const mapped = mapCourseViewPayload(raw);
      if (mapped) {
        setCourse(mapped);
        const mods = normalizeOutlineModules(mapped.modules, { isEnrolled: !!mapped.isPurchased });
        if (mods.length > 0) setSelectedModule(mods[0].id);
      }
    } catch (e) {
      console.error("Failed to load course", e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  if (loading) {
    return <ContentOverviewPageSkeleton backLabel="Courses" />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-foreground">Course not found</h2>
        <Link to="/courses" className="text-primary font-semibold hover:underline flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
      </div>
    );
  }

  const totalLessons = outlineModules.reduce((acc, m) => acc + (m.lessons || []).length, 0);
  const totalModules = outlineModules.length;
  const includedLabs = course.includedLabs || [];
  const normalLabsCount = includedLabs.filter((l) => l.type === "normal").length;
  const skillBuilderLabsCount = includedLabs.filter((l) => l.type === "skill_builder").length;

  const blockBreakdown = calculateLessonBreakdown(outlineModules);

  const selectedMod = outlineModules.find((m) => m.id === selectedModule);

  const toggleLesson = (id) => setExpandedLesson((prev) => (prev === id ? null : id));

  const goToLearning = () => navigate(`/courses/${course.slug}/learn`);

  const runEnroll = async () => {
    if (!course?.id) return;
    await enrollCourse({
      courseId: course.id,
      confirmPurchase: !course.isFree,
    }).unwrap();
    await loadCourse();
    goToLearning();
  };

  const handleEnroll = async (e) => {
    e?.preventDefault?.();
    if (!course) return;
    if (isEnrolled) {
      goToLearning();
      return;
    }
    if (!isAuthenticated) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (course.isFree) {
      try {
        await runEnroll();
      } catch {
        /* toast from RTK */
      }
      return;
    }
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    setPaymentModalOpen(false);
    if (!isAuthenticated) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    try {
      await runEnroll();
    } catch {
      /* toast from RTK */
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8]" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Sticky Navbar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-4">
          <Link to="/courses" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Courses</span>
          </Link>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="text-xs h-8 px-3 border-slate-300">Preview</Button>
          {isEnrolled ? (
            <Button
              size="sm"
              className="text-xs h-8 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold"
              onClick={goToLearning}
            >
              Start Now
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={handleEnroll}
            >
              {ctaLabel}
            </Button>
          )}
        </div>
      </div>

      {/* ── HERO BAND ── */}
      <div className="relative">
        <div className="absolute inset-0">
          <img
            src={course.thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f3d]/95 via-[#1a3560]/90 to-[#1e4080]/85" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_308px] gap-8 items-center">

          {/* Hero Left */}
          <div className="flex flex-col justify-between h-full gap-5">

            {/* Top: badges + title + desc */}
            <div>
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {course.isFree ? (
                  <span className="bg-emerald-400/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-400/30 tracking-wide">
                    Free
                  </span>
                ) : (
                  <span className="bg-purple-400/20 text-purple-300 text-xs font-semibold px-3 py-1 rounded-full border border-purple-400/30 tracking-wide">
                    ${course.price}
                  </span>
                )}
                <span className="bg-white/10 text-white/80 text-xs font-semibold px-3 py-1 rounded-full border border-white/15 tracking-wide">
                  {course.difficulty}
                </span>
                {(course.technologies || []).map((tech) => (
                  <span key={tech} className="bg-orange-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    {tech}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight drop-shadow-md">
                {course.title}
              </h1>

              {/* Description */}
              <p className="text-base text-blue-100 font-medium leading-relaxed max-w-xl">
                {course.shortDescription}
              </p>
            </div>

            {/* Bottom: stats + content badges */}
            <div>
              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-blue-100 mb-4">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= Math.round(course.rating) ? "text-yellow-400 text-base" : "text-white/20 text-base"}>★</span>
                  ))}
                  <span className="font-bold text-white ml-1 text-sm">{course.rating}</span>
                  <span className="text-blue-200/70 ml-0.5 text-xs">({course.studentCount.toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-200/80" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-200/80" />
                  <span>{totalModules} Modules</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-200/80" />
                  <span>{totalLessons} Lessons</span>
                </div>
              </div>

              {/* Content type mini-badges */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(blockBreakdown).map(([type, count]) => {
                  const cfg = BLOCK_TYPES.find((t) => t.id === type);
                  const Icon = cfg?.icon || FileText;
                  return (
                    <span key={type} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                      <Icon className="w-3 h-3" />{count}
                    </span>
                  );
                })}
                <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-200 border border-orange-400/30">
                  <FlaskConical className="w-3 h-3" />{normalLabsCount} Normal Labs
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                  <Zap className="w-3 h-3" />{skillBuilderLabsCount} Skill Builder Labs
                </span>
                {course.certificate && course.certificate.available && (
                  <button
                    onClick={() => setCertificateModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:bg-amber-500/30 transition-all duration-300 hover:scale-105 cursor-pointer"
                  >
                    <Award className="w-3 h-3" />Certificate Included
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Hero Right — thumbnail/video background + Start Now overlay */}
          <HeroOverviewMediaCard
            introVideoUrl={course.introVideoUrl}
            thumbnail={course.thumbnail}
            isEnrolled={isEnrolled}
            ctaLabel={ctaLabel}
            onPrimaryClick={isEnrolled ? goToLearning : handleEnroll}
          />

        </div>
      </div>

      {/* ── TABS ── */}
      <div className="max-w-7xl mx-auto px-6 mt-3">
        <div className="flex border-b border-slate-200">
          {["details", "outline"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-2.5 px-1 mr-8 text-sm font-semibold border-b-2 transition-colors capitalize -mb-px",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="max-w-7xl mx-auto px-6 pt-5 pb-8">

        {/* ════════ DETAILS TAB ════════ */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_308px] gap-6 items-start">

            {/* LEFT */}
            <div className="space-y-5">

              {/* What You'll Learn */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h2 className="text-base font-bold text-slate-900">What You'll Learn</h2>
                </div>
                <ul className="space-y-3">
                  {course.learningOutcomes.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700 leading-snug">
                      <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Objectives */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h2 className="text-base font-bold text-slate-900">Objectives</h2>
                </div>
                <ul className="space-y-3">
                  {course.objectives.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700 leading-snug">
                      <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h2 className="text-base font-bold text-slate-900">Requirements</h2>
                </div>
                <ul className="space-y-3">
                  {course.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700 leading-snug">
                      <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Included Labs */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <FlaskConical className="w-5 h-5 text-orange-500" />
                  <h2 className="text-base font-bold text-slate-900">Included Labs</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {course.includedLabs.map((lab) => (
                    <Card key={lab.id} className="border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden">
                      {lab.thumbnail && (
                        <div className="aspect-video bg-slate-100 overflow-hidden relative">
                          <img src={lab.thumbnail} alt={lab.title} className="w-full h-full object-cover" />
                          <div className="absolute top-3 left-3">
                            <Badge variant={lab.type === "skill_builder" ? "default" : "secondary"} className="text-[10px]">
                              {lab.type === "skill_builder" ? "Skill Builder" : "Normal Lab"}
                            </Badge>
                          </div>
                        </div>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">{lab.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">{lab.shortDescription}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-medium">{lab.difficulty}</span>
                          <span>·</span>
                          <span>{lab.duration}</span>
                          <span>·</span>
                          <span>{lab.tasksCount} tasks</span>
                        </div>
                        <Link to={`/labs/${lab.slug}`} className="block">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9">
                            Open Lab
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR */}
            <div className="space-y-4">

              {/* Content at a Glance */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Content at a Glance</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(blockBreakdown).map(([type, count]) => {
                    const cfg = BLOCK_TYPES.find((t) => t.id === type);
                    const Icon = cfg?.icon || FileText;
                    return (
                      <div key={type} className="flex items-center justify-between py-0.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", cfg?.bg || "bg-slate-100")}>
                            <Icon className={cn("w-3.5 h-3.5", cfg?.color || "text-slate-500")} />
                          </div>
                          <span className="text-[13px] text-slate-700 font-medium">
                            {cfg?.label || type}
                            {type === 'video' && 's'}
                            {type === 'richText' && ' / Docs'}
                            {type === 'code' && 's'}
                            {type === 'quiz' && 'zes'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{count}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-slate-100 my-2" />
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-orange-50">
                        <FlaskConical className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                      <span className="text-[13px] text-slate-700 font-medium">Normal Labs</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{normalLabsCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-purple-50">
                        <Zap className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <span className="text-[13px] text-slate-700 font-medium">Skill Builder Labs</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{skillBuilderLabsCount}</span>
                  </div>
                  {course.certificate && course.certificate.available && (
                    <>
                      <div className="border-t border-slate-100 my-2" />
                      <button
                        onClick={() => setCertificateModalOpen(true)}
                        className="w-full flex items-center justify-between py-0.5 hover:bg-slate-50 rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-amber-50">
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <span className="text-[13px] text-slate-700 font-medium">Certificate Included</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">1</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Share this Course */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="w-4 h-4 text-violet-500" />
                  <h3 className="text-sm font-bold text-slate-900">Share this Course</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">Share this course with your friends and peers</p>
                <div className="flex items-center gap-2">
                  {[
                    { icon: Link2, bg: "bg-slate-100 hover:bg-slate-200", color: "text-slate-600" },
                    { icon: Facebook, bg: "bg-blue-600 hover:bg-blue-700", color: "text-white" },
                    { icon: Twitter, bg: "bg-sky-400 hover:bg-sky-500", color: "text-white" },
                    { icon: Linkedin, bg: "bg-blue-700 hover:bg-blue-800", color: "text-white" },
                    { icon: MessageCircle, bg: "bg-green-500 hover:bg-green-600", color: "text-white" },
                  ].map(({ icon: Icon, bg, color }, i) => (
                    <button key={i} className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-colors", bg)}>
                      <Icon className={cn("w-4 h-4", color)} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ OUTLINE TAB ════════ */}
        {activeTab === "outline" && (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">

            {/* Left: Module timeline */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sticky top-[60px]">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Course Outline</p>
              <div className="relative">
                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-200 z-0" />
                <div className="space-y-0 relative z-10">
                  {outlineModules.map((mod) => {
                    const isActive = selectedModule === mod.id;
                    const isLocked = !!mod.locked;
                    return (
                      <button
                        key={mod.id}
                        onClick={() => setSelectedModule(mod.id)}
                        className={cn(
                          "relative w-full text-left pl-7 pb-4 last:pb-0 group transition-opacity",
                          isLocked && !isActive && "opacity-60"
                        )}
                      >
                        <div className={cn(
                          "absolute left-0 top-0.5 w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center bg-white transition-all",
                          isActive ? "border-blue-600 bg-blue-600 shadow-sm shadow-blue-200"
                            : isLocked ? "border-slate-300" : "border-blue-300 bg-blue-50"
                        )}>
                          {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                          {!isActive && isLocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                        </div>
                        <p className={cn(
                          "text-xs font-semibold leading-snug",
                          isActive ? "text-blue-700" : "text-slate-700 group-hover:text-slate-900"
                        )}>
                          {mod.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {mod.lessons.length} Lessons
                          {isLocked && <span className="ml-1 text-slate-300">· Locked</span>}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Module content */}
            <div>
              {selectedMod && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                  {/* Module header */}
                  <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{selectedMod.title}</h2>
                      <p className="text-sm text-slate-500 mt-0.5">{selectedMod.description}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-500 border border-slate-200 bg-white px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ml-4">
                      {isEnrolled ? (
                        <span className="text-green-600">Unlocked</span>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" /> Preview Mode
                        </>
                      )}
                    </span>
                  </div>

                  {/* Lessons — accordion */}
                  <div className="divide-y divide-slate-100">
                    {selectedMod.lessons.map((les, li) => {
                      const isOpen = expandedLesson === les.id;
                      return (
                        <div key={les.id}>
                          <button
                            onClick={() => toggleLesson(les.id)}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                              {li + 1}
                            </span>
                            <TypeIcon type={les.type} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800">{les.title}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                                {les.type} · {les.duration} · {les.tasks.length} task{les.tasks.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Lock className={cn("w-3.5 h-3.5 flex-shrink-0", les.locked ? "text-slate-300" : "text-green-500")} />
                            {isOpen
                              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            }
                          </button>

                          {isOpen && (
                            <div className="bg-slate-50 border-t border-slate-100 divide-y divide-slate-100">
                              {les.tasks.map((task) => {
                                const cfg = BLOCK_TYPES.find((t) => t.id === task.type);
                                const Icon = cfg?.icon || FileText;
                                return (
                                  <div key={task.id} className="flex items-center gap-3 px-5 pl-14 py-2.5">
                                    <div className={cn("w-5 h-5 rounded flex items-center justify-center flex-shrink-0", cfg?.bg || "bg-slate-100")}>
                                      <Icon className={cn("w-3 h-3", cfg?.color || "text-slate-500")} />
                                    </div>
                                    <p className="text-xs text-slate-600 flex-1">{task.title}</p>
                                    <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Enroll CTA */}
                  {!isEnrolled ? (
                    <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-t border-blue-100">
                      <p className="text-sm text-slate-600">
                        {course.isFree ? (
                          <>
                            <span className="text-blue-600 font-semibold">Start now</span> to unlock all lessons.
                          </>
                        ) : (
                          <>
                            Enroll in this course to unlock{" "}
                            <span className="text-blue-600 font-semibold">all lessons</span> and start learning.
                          </>
                        )}
                      </p>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 gap-1.5 flex-shrink-0 ml-4"
                        onClick={handleEnroll}
                      >
                        <Play className="w-3.5 h-3.5" /> {ctaLabel}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-t border-green-100">
                      <p className="text-sm text-green-700">
                        You&apos;re enrolled! Continue your learning journey.
                      </p>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4 gap-1.5 flex-shrink-0 ml-4"
                        onClick={goToLearning}
                      >
                        <Play className="w-3.5 h-3.5" /> Start Now
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Enroll in {course.title} for ${course.price || 0}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-2">Course:</p>
              <p className="font-semibold text-slate-900">{course.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handlePaymentSuccess}>
                Payment Success
              </Button>
              <Button variant="destructive" className="w-full" onClick={() => setPaymentModalOpen(false)}>
                Payment Failed
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Modal */}
      {course.certificate && (
        <Dialog open={certificateModalOpen} onOpenChange={setCertificateModalOpen}>
          <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.3" />
                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">ALAR Labs Certification</h3>
                  </div>
                </div>
                <button
                  onClick={() => setCertificateModalOpen(false)}
                  className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-4.5 h-4.5 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500" />

            {/* Modal Body */}
            {course.certificate && (
              <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-11 gap-5">
                  {/* Left Side - Certificate Preview */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-md">
                      {course.certificate.thumbnail && (
                        <img src={course.certificate.thumbnail} alt={course.certificate.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="bg-gradient-to-r from-slate-50 to-amber-50 border border-amber-100 rounded-lg p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Verified Learning Certification</h4>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">This certificate is officially issued by ALAR Labs Learning & Innovation.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Details */}
                  <div className="lg:col-span-6 space-y-4">
                    <div>
                      <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-semibold px-2.5 py-0.5">
                        {course.certificate.type}
                      </Badge>
                      <h2 className="text-xl font-bold text-slate-900 mt-2.5">{course.certificate.title}</h2>
                      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{course.certificate.description}</p>
                    </div>

                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-lg p-3.5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">Requirements</h4>
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          Complete all lessons
                        </li>
                        {course.certificate.requireQuizPassing && (
                          <li className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            Pass all quizzes
                          </li>
                        )}
                        {course.certificate.requireAllTasksCompletion && (
                          <li className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            Complete all tasks
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-200 rounded-lg p-3.5">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Earn After</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                          {course.certificate.minProgress}%
                        </span>
                        <span className="text-base font-semibold text-slate-700">completion</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pt-1">
                      <Button
                        variant="outline"
                        className="flex-1 h-9 text-slate-700 border-slate-300 hover:bg-slate-50 text-sm"
                        onClick={() => setCertificateModalOpen(false)}
                      >
                        Close
                      </Button>
                      <Button className="flex-1 h-9 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-semibold text-sm shadow-md">
                        Preview Certificate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}

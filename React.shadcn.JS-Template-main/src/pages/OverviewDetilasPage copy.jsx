import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

const BLOCK_TYPES = [
  { id: "video", label: "Videos", icon: Play, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "richText", label: "Text / Docs", icon: FileText, color: "text-slate-600", bg: "bg-slate-100" },
  { id: "image", label: "Images", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "quiz", label: "Quizzes", icon: HelpCircle, color: "text-yellow-600", bg: "bg-yellow-50" },
  { id: "code", label: "Codes", icon: Code2, color: "text-green-600", bg: "bg-green-50" },
  { id: "codeSnippet", label: "Code Snippets", icon: Code2, color: "text-cyan-600", bg: "bg-cyan-50" },
  { id: "project", label: "Projects", icon: Zap, color: "text-pink-600", bg: "bg-pink-50" },
  { id: "download", label: "Downloads", icon: Download, color: "text-teal-600", bg: "bg-teal-50" },
];

const MOCK_LAB = {
  id: "lab_1",
  title: "React Hero Section Masterclass",
  shortDescription: "Build beautiful, responsive hero sections for your web applications",
  difficulty: "Beginner",
  duration: "2 hours",
  isFree: true,
  rating: 4.8,
  studentCount: 1200,
  technologies: ["React", "Tailwind CSS", "JavaScript"],
  requirements: [
    "Basic HTML",
    "Basic CSS",
    "Basic JavaScript",
    "Familiarity with React is helpful (not required)",
  ],
  learningOutcomes: [
    "Build responsive hero sections",
    "Create modern UI layouts",
    "Use React components",
    "Add animations and buttons",
  ],
  thumbnail: null,
  modules: [
    {
      id: "mod_1",
      title: "Module 1 — Introduction to React",
      description: "Get started with React fundamentals and understand the core concepts.",
      lessons: [
        {
          id: "les_1", title: "1.1 What is React?", type: "video", duration: "10 mins",
          tasks: [
            { id: "t1", title: "Introduction to React", type: "video" },
            { id: "t2", title: "Why Use React?", type: "richText" },
          ],
        },
        {
          id: "les_2", title: "1.2 JSX Basics", type: "video", duration: "8 mins",
          tasks: [
            { id: "t3", title: "JSX Syntax Overview", type: "video" },
            { id: "t4", title: "JSX Practice Exercise", type: "code" },
          ],
        },
        {
          id: "les_3", title: "1.3 Components Overview", type: "docs", duration: "12 mins",
          tasks: [
            { id: "t5", title: "Functional Components", type: "richText" },
            { id: "t6", title: "Class Components", type: "richText" },
          ],
        },
        {
          id: "les_4", title: "1.4 Module Quiz", type: "quiz", duration: "5 mins",
          tasks: [
            { id: "t7", title: "React Basics Quiz", type: "quiz" },
          ],
        },
      ],
    },
    {
      id: "mod_2",
      title: "Module 2 — Building Components",
      description: "Learn how to build reusable and composable React components.",
      locked: true,
      lessons: [
        {
          id: "les_5", title: "2.1 Props & State", type: "video", duration: "14 mins",
          tasks: [
            { id: "t8", title: "Understanding Props", type: "video" },
            { id: "t9", title: "Managing State", type: "video" },
          ],
        },
        {
          id: "les_6", title: "2.2 Event Handling", type: "video", duration: "9 mins",
          tasks: [
            { id: "t10", title: "Click Events", type: "video" },
            { id: "t11", title: "Form Events Practice", type: "code" },
          ],
        },
        {
          id: "les_7", title: "2.3 Component Practice", type: "code", duration: "20 mins",
          tasks: [
            { id: "t12", title: "Build a Card Component", type: "project" },
          ],
        },
      ],
    },
    {
      id: "mod_3",
      title: "Module 3 — Responsive Design",
      description: "Master responsive layouts with Tailwind CSS.",
      locked: true,
      lessons: [
        {
          id: "les_8", title: "3.1 Tailwind Basics", type: "video", duration: "11 mins",
          tasks: [
            { id: "t13", title: "Utility Classes Overview", type: "video" },
            { id: "t14", title: "Responsive Prefixes", type: "richText" },
          ],
        },
        {
          id: "les_9", title: "3.2 Grid & Flexbox", type: "docs", duration: "13 mins",
          tasks: [
            { id: "t15", title: "Flexbox Layout", type: "video" },
            { id: "t16", title: "Grid Layout Practice", type: "code" },
          ],
        },
        {
          id: "les_10", title: "3.3 Mobile First Design", type: "video", duration: "10 mins",
          tasks: [
            { id: "t17", title: "Mobile First Strategy", type: "video" },
          ],
        },
      ],
    },
    {
      id: "mod_4",
      title: "Module 4 — Hero Section Project",
      description: "Build a complete, production-ready hero section from scratch.",
      locked: true,
      lessons: [
        {
          id: "les_11", title: "4.1 Project Setup", type: "video", duration: "8 mins",
          tasks: [
            { id: "t18", title: "Project Introduction", type: "video" },
            { id: "t19", title: "Starter Files", type: "download" },
          ],
        },
        {
          id: "les_12", title: "4.2 Build the Hero", type: "code", duration: "30 mins",
          tasks: [
            { id: "t20", title: "Layout Structure", type: "code" },
            { id: "t21", title: "Add CTA Buttons", type: "code" },
            { id: "t22", title: "Animations", type: "code" },
          ],
        },
        {
          id: "les_13", title: "4.3 Final Review", type: "quiz", duration: "10 mins",
          tasks: [
            { id: "t23", title: "Final Knowledge Check", type: "quiz" },
          ],
        },
      ],
    },
  ],
};

const TypeIcon = ({ type, className = "w-3.5 h-3.5" }) => {
  const cfg = BLOCK_TYPES.find((t) => t.id === type) || BLOCK_TYPES[1];
  const Icon = cfg.icon;
  return <Icon className={cn(className, cfg.color)} />;
};

export default function OverviewDetailsPage() {
  const { labId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [selectedModule, setSelectedModule] = useState(MOCK_LAB.modules[0]?.id);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const lab = MOCK_LAB;

  const totalLessons = lab.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalModules = lab.modules.length;

  const blockBreakdown = { video: 4, richText: 1, code: 1, quiz: 1, download: 1 };

  const selectedMod = lab.modules.find((m) => m.id === selectedModule);

  const toggleLesson = (id) => setExpandedLesson((prev) => (prev === id ? null : id));

  const handleEnroll = (e) => {
    e.preventDefault();
    if (lab.isFree) {
      setIsEnrolled(true);
    } else {
      setPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    setIsEnrolled(true);
    setPaymentModalOpen(false);
  };

  const handlePaymentFailure = () => {
    setPaymentSuccess(false);
    setPaymentModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8]" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Sticky Navbar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-4">
          <Link to="/labs" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Labs</span>
          </Link>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="text-xs h-8 px-3 border-slate-300">Preview</Button>
          {isEnrolled ? (
            <Button
              type="button"
              size="sm"
              className="text-xs h-8 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold cursor-pointer"
              onClick={() => navigate(`/learning/${lab.id || labId || "lab_1"}`)}
            >
              Start Learning
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="text-xs h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
              onClick={handleEnroll}
            >
              Enroll Now
            </Button>
          )}
        </div>
      </div>

      {/* ── HERO BAND ── */}
      <div className="bg-gradient-to-br from-[#0f1f3d] via-[#1a3560] to-[#1e4080]">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_308px] gap-8 items-center">

          {/* Hero Left */}
          <div className="flex flex-col justify-between h-full gap-5">

            {/* Top: badges + title + desc */}
            <div>
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {lab.isFree && (
                  <span className="bg-emerald-400/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-400/30 tracking-wide">
                    Free
                  </span>
                )}
                <span className="bg-white/10 text-white/80 text-xs font-semibold px-3 py-1 rounded-full border border-white/15 tracking-wide">
                  {lab.difficulty}
                </span>
                {lab.technologies.map((tech) => (
                  <span key={tech} className="bg-orange-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    {tech}
                  </span>
                ))}
              </div>

              {/* Title — bigger, brighter, drop-shadow for contrast */}
              <h1 className="text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight drop-shadow-md">
                {lab.title}
              </h1>

              {/* Description — full white, medium weight for readability */}
              <p className="text-base text-blue-100 font-medium leading-relaxed max-w-xl">
                {lab.shortDescription}
              </p>
            </div>

            {/* Bottom: stats + content badges */}
            <div>
              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-blue-100 mb-4">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= Math.round(lab.rating) ? "text-yellow-400 text-base" : "text-white/20 text-base"}>★</span>
                  ))}
                  <span className="font-bold text-white ml-1 text-sm">{lab.rating}</span>
                  <span className="text-blue-200/70 ml-0.5 text-xs">({lab.studentCount.toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-200/80" />
                  <span>{lab.duration}</span>
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
              </div>
            </div>
          </div>

          {/* Hero Right — Enroll Card: only thumbnail + button */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
            <div className="aspect-video bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-400/30">
                <Play className="w-6 h-6 text-blue-300" />
              </div>
            </div>
            <div className="p-4">
              {isEnrolled ? (
                <Button
                  type="button"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm h-11 gap-2 rounded-lg cursor-pointer"
                  onClick={() => navigate(`/learning/${lab.id || labId || "lab_1"}`)}
                >
                  <Play className="w-4 h-4" />
                  Start Learning
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm h-11 gap-2 rounded-lg cursor-pointer"
                  onClick={handleEnroll}
                >
                  <Play className="w-4 h-4" />
                  Enroll Now
                </Button>
              )}
            </div>
          </div>

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
                  {lab.learningOutcomes.map((item, i) => (
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
                  {lab.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700 leading-snug">
                      <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      {req}
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
                  {lab.learningOutcomes.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700 leading-snug">
                      <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
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
                          <span className="text-[13px] text-slate-700 font-medium">{cfg?.label || type}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Share this Lab */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="w-4 h-4 text-violet-500" />
                  <h3 className="text-sm font-bold text-slate-900">Share this Lab</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">Share this lab with your friends and peers</p>
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
                  {lab.modules.map((mod) => {
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
                      <Lock className="w-3 h-3" /> Preview Mode
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
                            <Lock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
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
                  {!isEnrolled && (
                    <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-t border-blue-100">
                      <p className="text-sm text-slate-600">
                        Enroll in this lab to unlock{" "}
                        <span className="text-blue-600 font-semibold">all lessons</span> and start learning.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 gap-1.5 flex-shrink-0 ml-4 cursor-pointer"
                        onClick={handleEnroll}
                      >
                        <Play className="w-3.5 h-3.5" /> Enroll Now
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
              Enroll in {lab.title} for ${lab.price || 99}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-2">Lab Title:</p>
              <p className="font-semibold text-slate-900">{lab.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handlePaymentSuccess}
              >
                Payment Success
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handlePaymentFailure}
              >
                Payment Failed
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
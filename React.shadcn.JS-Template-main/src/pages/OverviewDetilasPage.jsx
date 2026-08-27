import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Clock, Users, Star, Play, FileText,
  BookOpen, ArrowLeft, Layers,
  CheckCircle2, Lock, Unlock, Award, Zap, Code2, HelpCircle, Download, Check,
  ChevronDown, ChevronRight,
  Copy, Edit, Trash2, X
} from "lucide-react";
import ShareContentCard from "@/components/common/ShareContentCard";
import RichTextContent from "@/components/learning/RichTextContent";
import { pickCourseDescriptionHtml, sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import HeroOverviewMediaCard from "@/components/learning/HeroOverviewMediaCard";
import ContentOverviewPageSkeleton from "@/components/learning/ContentOverviewPageSkeleton";
import {
  mapLabOverviewPayload,
  normalizeOutlineModules,
  getEnrollCtaLabel,
  getEnrollProgressHint,
  resolveEnabledLabCertificate,
} from "@/lib/contentDetailMappers";
import { useEnrollLabMutation } from "@/store/api/learningApi";
import { useGetLabOverviewQuery } from "@/store/api/labApi";
import { checkoutLabPayment } from "@/lib/razorpayCheckout";
import { useToast } from "@/hooks/use-toast";
import { confirmDelete } from "@/lib/confirmAction";
import { useApprovalPreviewMode } from "@/lib/approvalPreview";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { PlatformHeroBadge } from "@/components/common/PlatformBadge";
import { hasPermission } from "@/utils/permissions";

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

const TypeIcon = ({ type, className = "w-3.5 h-3.5" }) => {
  const cfg = BLOCK_TYPES.find((t) => t.id === type) || BLOCK_TYPES[1];
  const Icon = cfg.icon;
  return <Icon className={cn(className, cfg.color)} />;
};

function calculateBlockBreakdown(modules) {
  const breakdown = {};
  (modules || []).forEach(mod => {
    (mod.lessons || []).forEach(lesson => {
      (lesson.blocks || lesson.tasks || []).forEach(block => {
        const type = block.type || "richText";
        breakdown[type] = (breakdown[type] || 0) + 1;
      });
    });
  });
  return breakdown;
}

export default function OverviewDetailsPage({
  slugOverride,
  approvalPreview: approvalPreviewProp = false,
  embedded = false,
}) {
  const { slug: routeSlug } = useParams();
  const slug = slugOverride || routeSlug;
  const navigate = useNavigate();
  const location = useLocation();
  const isApprovalPreview = useApprovalPreviewMode(approvalPreviewProp);
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const user = useSelector((s) => s.auth?.user);
  const { siteName, formatPrice } = usePlatformSettings();
  const [enrollLab] = useEnrollLabMutation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [selectedModule, setSelectedModule] = useState(null);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [paying, setPaying] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const fromCourse = useMemo(
    () => new URLSearchParams(location.search).get("fromCourse") || undefined,
    [location.search]
  );
  const canEditLab = hasPermission("edit_labs");
  const canDeleteLab = hasPermission("delete_labs");

  const {
    data: labRes,
    isLoading,
    isFetching,
    refetch: refetchLab,
  } = useGetLabOverviewQuery(
    { slug, params: fromCourse ? { fromCourse } : {} },
    { skip: !slug }
  );

  const lab = useMemo(() => {
    const raw = labRes?.data?.lab || labRes?.lab;
    const mapped = raw ? mapLabOverviewPayload(raw) : null;
    if (mapped?.slug && slug && mapped.slug !== slug) return null;
    return mapped;
  }, [labRes, slug]);

  const isPageLoading = !slug || isLoading || (isFetching && !lab);

  useEffect(() => {
    if (lab && !selectedModule) {
      const mods = normalizeOutlineModules(lab.modules, { isEnrolled: !!lab.isEnrolled });
      if (mods.length > 0) setSelectedModule(mods[0].id);
    }
  }, [lab]);

  const isEnrolled = !!(lab?.isEnrolled ?? lab?.isPurchased);
  const showEditAction = !!(lab?.canEdit && lab?.editPath && canEditLab);
  const showDeleteAction = !!(lab?.canDelete && canDeleteLab);
  const isProcessing = enrolling || paying;

  const outlineModules = useMemo(
    () => (lab ? normalizeOutlineModules(lab.modules, { isEnrolled }) : []),
    [lab, isEnrolled]
  );

  const ctaLabel = useMemo(
    () =>
      lab
        ? getEnrollCtaLabel({
            isEnrolled,
            progress: lab.enrollmentProgress,
            modulesCompleted: lab.modulesCompleted,
            isFree: lab.isFree,
            isAuthenticated,
            price: lab.price,
            currency: lab.currency,
            formatPrice,
          })
        : "Enroll Now",
    [lab, isEnrolled, isAuthenticated, formatPrice]
  );

  const progressHint = useMemo(
    () =>
      lab && isEnrolled
        ? getEnrollProgressHint({
            modulesCompleted: lab.modulesCompleted,
            totalModules: lab.totalModules || outlineModules.length,
            progress: lab.enrollmentProgress,
          })
        : null,
    [lab, isEnrolled, outlineModules.length]
  );

  const fromCourseSlug = fromCourse;

  const totalLessons = useMemo(
    () => outlineModules.reduce((acc, m) => acc + (m.lessons || []).length, 0),
    [outlineModules]
  );
  const totalModules = outlineModules.length;

  const blockBreakdown = useMemo(
    () =>
      lab?.blockBreakdown && Object.keys(lab.blockBreakdown).length
        ? lab.blockBreakdown
        : calculateBlockBreakdown(lab?.modules),
    [lab]
  );

  const selectedMod = useMemo(
    () => outlineModules.find((m) => m.id === selectedModule),
    [outlineModules, selectedModule]
  );
  const certInfo = useMemo(() => resolveEnabledLabCertificate(lab?.certificate), [lab]);

  if (isPageLoading) {
    return <ContentOverviewPageSkeleton backLabel="Labs" />;
  }

  if (!lab) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-foreground">Lab not found</h2>
        <Link to="/labs" className="text-primary font-semibold hover:underline flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Labs
        </Link>
      </div>
    );
  }
  const certEligible =
    isEnrolled &&
    Number(lab?.enrollmentProgress || 0) >= Number(certInfo?.minProgress ?? 100);

  const downloadCertificate = async () => {
    if (!lab?.id) return;
    setDownloadingCert(true);
    try {
      const res = await api.get(`/me/labs/${lab.id}/certificate`, {
        params: { format: "pdf" },
        responseType: "blob",
        withCredentials: true,
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${lab.slug || lab.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        title: "Certificate",
        description:
          e?.response?.data?.message || "Complete the lab to download your certificate.",
        variant: "destructive",
      });
    } finally {
      setDownloadingCert(false);
    }
  };

  const toggleLesson = (id) => setExpandedLesson((prev) => (prev === id ? null : id));

  const goToLearning = () => {
    const qs = fromCourseSlug ? `?fromCourse=${encodeURIComponent(fromCourseSlug)}` : "";
    navigate(`/labs/${lab.slug}/start${qs}`);
  };

  const runEnroll = async () => {
    if (!lab?.id) return;
    setEnrolling(true);
    try {
      await enrollLab({
        labId: lab.id,
        confirmPurchase: !lab.isFree,
      }).unwrap();
      await refetchLab();
      toast({
        title: "Enrolled successfully",
        description: "Click Start Now to begin learning.",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const runPaidCheckout = async () => {
    if (!lab?.id) return;
    setPaying(true);
    try {
      await checkoutLabPayment({
        labId: lab.id,
        labTitle: lab.title,
        userEmail: user?.email || user?.user_email || "",
        userName: user?.name || user?.full_name || user?.username || "",
        merchantName: siteName,
      });
      await refetchLab();
      toast({
        title: "Payment successful",
        description: "You are enrolled. Click Start Now to begin learning.",
      });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Payment could not be completed";
      if (msg !== "Payment cancelled") {
        toast({ title: "Payment failed", description: msg, variant: "destructive" });
      }
    } finally {
      setPaying(false);
    }
  };

  const handleEnroll = async (e) => {
    e?.preventDefault?.();
    if (!lab || isProcessing || isApprovalPreview) return;
    if (isEnrolled) {
      goToLearning();
      return;
    }
    if (!isAuthenticated) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (lab.isFree || lab.accessViaCourse || lab.includedViaCourseFree || fromCourseSlug) {
      try {
        await runEnroll();
      } catch (err) {
        if (err?.status === 402 || err?.data?.status === 402) {
          await runPaidCheckout();
        }
      }
      return;
    }
    await runPaidCheckout();
  };

  const handleEdit = () => {
    if (lab?.editPath) navigate(lab.editPath);
  };

  const handleDelete = async () => {
    if (!lab?.id) return;
    if (!(await confirmDelete("this lab"))) return;
    try {
      await api.delete(`/labs/${lab.id}`);
      toast({ title: "Lab deleted", description: "The lab has been removed." });
      navigate("/app/labs");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the lab.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn(embedded ? "bg-[#f4f6f8]" : "min-h-screen bg-[#f4f6f8]", "w-full min-w-0 overflow-x-hidden")} style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {isApprovalPreview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900 font-medium">
          Approval review — enroll, purchase, and start are disabled. This is the public overview learners will see.
        </div>
      )}

      {/* ── HERO BAND ── */}
      <div className="bg-gradient-to-br from-[#0f1f3d] via-[#1a3560] to-[#1e4080] w-full min-w-0">
        <div className="max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8">
          {!embedded && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 sm:pt-5">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 h-8 text-blue-100/90 hover:text-white hover:bg-white/10"
                asChild
              >
                <Link to="/labs">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to Labs
                </Link>
              </Button>
              {!isApprovalPreview && (showEditAction || showDeleteAction) && (
                <div className="flex items-center gap-1.5">
                  {showEditAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 px-3 border-white/30 text-white hover:bg-white/10"
                      onClick={handleEdit}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  )}
                  {showDeleteAction && (
                    <Button variant="destructive" size="sm" className="text-xs h-8 px-3" onClick={handleDelete}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        <div className="py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 lg:gap-8 items-center">

          {/* Hero Left (70%) */}
          <div className="flex flex-col gap-5 min-w-0 w-full">

            {/* Top: badges + title + desc */}
            <div>
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {lab.isFree ? (
                  <span className="bg-emerald-400/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-400/30 tracking-wide">
                    Free
                  </span>
                ) : (
                  <span className="bg-amber-400/20 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full border border-amber-400/30 tracking-wide">
                    {formatPrice(lab.price, lab.currency)}
                  </span>
                )}
                <span className="bg-white/10 text-white/80 text-xs font-semibold px-3 py-1 rounded-full border border-white/15 tracking-wide">
                  {lab.difficulty}
                </span>
                <PlatformHeroBadge platform={lab.platform} />
                {(lab.technologies || []).map((tech) => (
                  <span key={tech} className="bg-orange-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    {tech}
                  </span>
                ))}
              </div>

              {/* Title — bigger, brighter, drop-shadow for contrast */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight drop-shadow-md break-words">
                {lab.title}
              </h1>

              {/* Description — rich HTML from lab editor */}
              {stripHtmlToPlain(lab.shortDescription) ? (
                <RichTextContent
                  html={sanitizeCourseDescriptionHtml(
                    pickCourseDescriptionHtml(lab) || lab.shortDescription || "",
                  )}
                  showTitle={false}
                  variant="onDark"
                  className="text-base text-blue-100 font-medium leading-relaxed max-w-xl"
                />
              ) : null}
            </div>

            {/* Middle: stats + content badges */}
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
              <div className="flex flex-wrap gap-2 mb-5">
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

              {/* Enroll / Start + Certificate */}
              {!isApprovalPreview && (
                <div className="flex flex-wrap items-center gap-3">
                  {isEnrolled ? (
                    <div className="flex flex-col items-start gap-1">
                      <Button
                        type="button"
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2 h-12 rounded-lg shadow-xl cursor-pointer"
                        onClick={goToLearning}
                      >
                        <Play className="w-5 h-5 fill-current" /> {ctaLabel}
                      </Button>
                      {progressHint && (
                        <p className="text-xs text-white/80">{progressHint}</p>
                      )}
                      {lab.accessViaCourse && (
                        <p className="text-xs text-green-200">
                          Included with your course — no separate lab purchase required.
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="lg"
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 h-12 rounded-lg shadow-xl cursor-pointer disabled:opacity-60"
                      onClick={handleEnroll}
                    >
                      <Play className="w-5 h-5 fill-current" /> {isProcessing ? "Processing…" : ctaLabel}
                    </Button>
                  )}
                  {certInfo && (
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="h-12 rounded-lg border-amber-400/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:text-white font-bold gap-2 shadow-xl"
                      onClick={() => setCertificateModalOpen(true)}
                    >
                      <Award className="w-5 h-5" /> Certificate
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hero Right (30%) — just the thumbnail/video */}
          <div className="flex items-center justify-center min-h-[250px] sm:min-h-[350px] w-full min-w-0">
            <div className="w-full">
              <HeroOverviewMediaCard
                introVideoUrl={lab.introVideoUrl}
                thumbnail={lab.thumbnail}
                isEnrolled={isEnrolled}
                ctaLabel={ctaLabel}
                onPrimaryClick={isEnrolled ? goToLearning : handleEnroll}
                hideButton={true}
                hideBorderShadow={true}
              />
            </div>
          </div>

        </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 mt-3">
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
      <div className="max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-5 pb-8">

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
                  {(lab.objectives || []).map((item, i) => (
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

              <ShareContentCard kind="lab" slug={lab.slug} title={lab.title} />
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
                                {[
                                  les.type || "lesson",
                                  les.duration,
                                  les.tasks.length
                                    ? `${les.tasks.length} task${les.tasks.length !== 1 ? "s" : ""}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            {isEnrolled
                              ? <Unlock className="w-3.5 h-3.5 flex-shrink-0 text-green-500" />
                              : <Lock className="w-3.5 h-3.5 flex-shrink-0 text-slate-300" />}
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
                                    {isEnrolled
                                      ? <Unlock className="w-3 h-3 flex-shrink-0 text-green-500" />
                                      : <Lock className="w-3 h-3 flex-shrink-0 text-slate-300" />}
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
                  {!isApprovalPreview && !isEnrolled && (
                    <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-t border-blue-100">
                      <p className="text-sm text-slate-600">
                        {lab.isFree ? (
                          <>
                            <span className="text-blue-600 font-semibold">Start now</span> to unlock all lessons.
                          </>
                        ) : (
                          <>
                            Enroll in this lab to unlock{" "}
                            <span className="text-blue-600 font-semibold">all lessons</span> and start learning.
                          </>
                        )}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 gap-1.5 flex-shrink-0 ml-4 cursor-pointer disabled:opacity-60"
                        onClick={handleEnroll}
                      >
                        <Play className="w-3.5 h-3.5" /> {isProcessing ? "Processing…" : ctaLabel}
                      </Button>
                    </div>
                  )}
                  {!isApprovalPreview && isEnrolled && (
                    <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-t border-green-100">
                      <p className="text-sm text-green-700">
                        {progressHint || "You're enrolled! Continue your learning journey."}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4 gap-1.5 flex-shrink-0 ml-4 cursor-pointer"
                        onClick={goToLearning}
                      >
                        <Play className="w-3.5 h-3.5" /> {ctaLabel}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {certInfo && (
        <Dialog open={certificateModalOpen} onOpenChange={setCertificateModalOpen}>
          <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{siteName} Certification</h3>
                    <p className="text-xs text-slate-400">Read-only preview</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCertificateModalOpen(false)}
                  className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-4.5 h-4.5 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500" />

            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-11 gap-5">
                <div className="lg:col-span-5 space-y-3">
                  <div className="aspect-video bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg overflow-hidden border border-amber-200 shadow-md flex items-center justify-center">
                    {certInfo.thumbnail ? (
                      <img
                        src={certInfo.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                          <Award className="w-8 h-8 text-amber-600" />
                        </div>
                        <p className="text-sm font-semibold text-amber-800">Certificate Preview</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-gradient-to-r from-slate-50 to-amber-50 border border-amber-100 rounded-lg p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Verified Learning Certification</h4>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          This certificate is officially issued by {siteName}.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-semibold px-2.5 py-0.5 capitalize">
                      {certInfo.type === "completion" ? "Completion Certificate" : certInfo.type}
                    </Badge>
                    <h2 className="text-xl font-bold text-slate-900 mt-2.5">{certInfo.title}</h2>
                    {certInfo.description && (
                      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{certInfo.description}</p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-lg p-3.5">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">Requirements</h4>
                    <ul className="space-y-1.5">
                      <li className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        Complete lab progress
                      </li>
                      {certInfo.requireQuiz && (
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          Pass all quizzes
                        </li>
                      )}
                      {certInfo.requireTasks && (
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          Complete all tasks
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-200 rounded-lg p-3.5">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Earn After</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                        {certInfo.minProgress}%
                      </span>
                      <span className="text-base font-semibold text-slate-700">lab progress</span>
                    </div>
                  </div>

                  {certInfo.verificationText && (
                    <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                      {certInfo.verificationText}
                    </p>
                  )}

                  <div className="flex items-center gap-2.5 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-slate-700 border-slate-300 hover:bg-slate-50 text-sm"
                      onClick={() => setCertificateModalOpen(false)}
                    >
                      Close
                    </Button>
                    {certEligible && (
                      <Button
                        className="flex-1 h-9 gap-2 bg-amber-500 text-white hover:bg-amber-600 text-sm"
                        onClick={downloadCertificate}
                        disabled={downloadingCert}
                      >
                        <Download className="w-4 h-4" />
                        {downloadingCert ? "Preparing…" : "Download Certificate"}
                      </Button>
                    )}
                  </div>
                  {!certEligible && isEnrolled && (
                    <p className="text-center text-xs text-slate-500">
                      Reach {certInfo.minProgress}% lab progress to unlock your certificate download.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
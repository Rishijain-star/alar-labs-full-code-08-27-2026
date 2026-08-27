import { useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Download,
  FlaskConical,
  Loader2,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { isCertificateEnabled, isCertificateEligible, CONTENT_KIND_META } from "@/lib/learningProgress";

const KIND_THEMES = {
  course: {
    Icon: BookOpen,
    hero: "from-indigo-600 via-blue-600 to-indigo-700",
    glow: "bg-indigo-500/20",
    ring: "ring-indigo-100",
    iconBg: "bg-indigo-100 text-indigo-600",
    accent: "text-indigo-600",
    statAccent: "border-indigo-100 bg-indigo-50/80",
    headline: "Course Complete!",
    subline: "You finished every lesson in this course.",
    browseLabel: "Browse courses",
    browseTo: "/courses",
    reviewLabel: "Review course",
  },
  skill_builder: {
    Icon: Zap,
    hero: "from-amber-500 via-orange-500 to-amber-600",
    glow: "bg-amber-500/20",
    ring: "ring-amber-100",
    iconBg: "bg-amber-100 text-amber-700",
    accent: "text-amber-700",
    statAccent: "border-amber-100 bg-amber-50/80",
    headline: "Skill Builder Complete!",
    subline: "You submitted every task and finished this skill builder lab.",
    browseLabel: "Browse labs",
    browseTo: "/labs",
    reviewLabel: "Review lab",
  },
  lab: {
    Icon: FlaskConical,
    hero: "from-emerald-500 via-teal-500 to-green-600",
    glow: "bg-emerald-500/20",
    ring: "ring-emerald-100",
    iconBg: "bg-emerald-100 text-emerald-700",
    accent: "text-emerald-700",
    statAccent: "border-emerald-100 bg-emerald-50/80",
    headline: "Congratulations!",
    subline: "You have completed all lessons in this lab.",
    browseLabel: "Browse labs",
    browseTo: "/labs",
    reviewLabel: "Review lab",
  },
};

function StatCard({ label, value, className }) {
  return (
    <div className={cn("rounded-2xl border p-4 text-center", className)}>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}

export default function LearningProgressReportPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const kind = state.kind || (location.pathname.includes("/courses/") ? "course" : "lab");
  const kindMeta = CONTENT_KIND_META[kind] || CONTENT_KIND_META.lab;
  const theme = KIND_THEMES[kind] || KIND_THEMES.lab;
  const ThemeIcon = theme.Icon;
  const showDetailedStats = kind === "course" || kind === "skill_builder";
  const title = state.title || (kind === "course" ? "Course" : "Lab");
  const progressPct = state.progressPct ?? 100;
  const tasksDone = state.tasksDone ?? 0;
  const tasksTotal = state.tasksTotal ?? tasksDone;
  const correctCount = state.correctCount ?? 0;
  const wrongCount = state.wrongCount ?? 0;
  const scorePct = state.scorePct ?? progressPct;
  const entityId = state.entityId;
  const certificate = state.certificate;
  const backPath = state.backPath || (kind === "course" ? `/courses/${slug}/learn` : `/labs/${slug}`);

  const [downloading, setDownloading] = useState(false);

  const showCert = isCertificateEnabled(certificate);
  const certEligible = state.certEligible ?? isCertificateEligible(certificate, scorePct);
  const minScore = Number(certificate?.minProgress ?? certificate?.min_progress ?? 80);

  const downloadCertificatePdf = async (type) => {
    if (!entityId) return;
    setDownloading(true);
    try {
      const base = type === "course" ? `/me/courses/${entityId}/certificate` : `/me/labs/${entityId}/certificate`;
      const res = await api.get(base, {
        params: { format: "pdf" },
        responseType: "blob",
        withCredentials: true,
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${slug || entityId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Could not download certificate. Complete all requirements first.";
      window.alert(msg);
    } finally {
      setDownloading(false);
    }
  };

  const openCertificateHtml = async (type) => {
    if (!entityId) return;
    setDownloading(true);
    try {
      const base = type === "course" ? `/me/courses/${entityId}/certificate` : `/me/labs/${entityId}/certificate`;
      const res = await api.get(base, {
        params: { format: "html" },
        withCredentials: true,
      });
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(res.data);
        w.document.close();
      } else {
        window.alert("Allow pop-ups to view your certificate.");
      }
    } catch (e) {
      window.alert(e?.response?.data?.message || "Could not load certificate.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className={cn("absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl", theme.glow)} />
        <div className="absolute top-1/3 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="mb-8 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white/80 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {kind === "course" ? "course" : "lab"}
        </button>

        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60">
          {/* Hero header */}
          <div className={cn("relative px-6 pb-16 pt-10 text-center text-white sm:px-10 sm:pb-20 sm:pt-12", `bg-gradient-to-br ${theme.hero}`)}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)]" />
            <div className="relative">
              {showDetailedStats && (
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-white/90" />
                  {kindMeta.label}
                </span>
              )}

              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg shadow-black/10 ring-8 ring-white/20">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={2.25} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{theme.headline}</h1>
              <p className="mx-auto mt-3 max-w-lg text-base text-white/90 sm:text-lg">{theme.subline}</p>
            </div>
          </div>

          {/* Floating title card */}
          <div className="-mt-10 px-6 sm:px-10">
            <div className={cn("rounded-2xl border bg-white p-5 shadow-md", theme.ring, "ring-4")}>
              <div className="flex items-start gap-4">
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", theme.iconBg)}>
                  <ThemeIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
                  {!showDetailedStats && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Great work — you worked through every lesson. Keep building your skills with more labs.
                    </p>
                  )}
                </div>
                <PartyPopper className={cn("hidden h-8 w-8 shrink-0 sm:block", theme.accent)} />
              </div>
            </div>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            {showDetailedStats && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className={cn("h-4 w-4", theme.accent)} />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Your results</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Progress" value={`${progressPct}%`} className="bg-slate-50 border-slate-200" />
                  <StatCard label="Score" value={`${scorePct}%`} className={theme.statAccent} />
                  <StatCard label="Correct" value={correctCount} className="bg-green-50 border-green-100" />
                  <StatCard label="Wrong" value={wrongCount} className="bg-red-50 border-red-100" />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Trophy className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Tasks submitted</p>
                        <p className="text-xs text-slate-500">Interactive quizzes & exercises</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900">
                      {tasksDone}
                      <span className="text-lg font-medium text-slate-400">/{tasksTotal}</span>
                    </p>
                  </div>
                </div>

                <p className="text-center text-sm leading-relaxed text-slate-600">
                  All lessons were submitted. Review your results above.
                  {showCert && !certEligible && (
                    <> A score of at least {minScore}% is required for the certificate.</>
                  )}
                </p>
              </div>
            )}

            {!showDetailedStats && (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: CheckCircle2, text: "All lessons completed" },
                  { icon: Sparkles, text: "Ready for the next challenge" },
                  { icon: Trophy, text: "Progress saved to your account" },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", theme.iconBg)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">{text}</p>
                  </div>
                ))}
              </div>
            )}

            {showCert && certEligible && (
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50">
                <div className="border-b border-amber-200/80 bg-white/50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-md shadow-amber-200">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800/70">
                        Certificate earned
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        {certificate?.title || "Certificate of Completion"}
                      </h3>
                    </div>
                  </div>
                  {certificate?.description && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{certificate.description}</p>
                  )}
                </div>
                {entityId && (
                  <div className="flex flex-wrap gap-3 px-5 py-4">
                    <Button
                      className="gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
                      onClick={() => downloadCertificatePdf(kind === "course" ? "course" : "lab")}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="border-amber-200 bg-white/80 hover:bg-white"
                      onClick={() => openCertificateHtml(kind === "course" ? "course" : "lab")}
                      disabled={downloading}
                    >
                      View / Print
                    </Button>
                  </div>
                )}
              </div>
            )}

            {showCert && !certEligible && (
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <p className="text-sm leading-relaxed text-slate-600">
                  Certificate not issued — your score ({scorePct}%) is below the required {minScore}%. You can
                  retake the lab from the overview page.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-center">
              <Button asChild variant="outline" size="lg" className="gap-2 sm:min-w-[160px]">
                <Link to={backPath}>
                  <RotateCcw className="h-4 w-4" />
                  {kind === "course" ? "Continue course" : theme.reviewLabel}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className={cn(
                  "gap-2 sm:min-w-[160px] text-white shadow-md",
                  kind === "skill_builder"
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-200"
                    : kind === "course"
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-200"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200"
                )}
              >
                <Link to={theme.browseTo}>{theme.browseLabel}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

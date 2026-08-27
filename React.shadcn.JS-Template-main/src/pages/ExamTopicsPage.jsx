import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, GraduationCap, ArrowLeft, Loader2, CheckCircle2, FileText, Clock, Award, ShieldCheck } from "lucide-react";
import ExamTopicsQuizPlayer from "@/components/exam-topics/ExamTopicsQuizPlayer";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { useGetExamTopicsConfigQuery } from "@/store/api/examTopicsApi";
import { normalizeExamTopicsConfig } from "@/lib/examTopicsConfig";
import SEO from "@/components/Seo";
import { clearAssessmentAutoSave } from "@/hooks/useAssessmentAutoSave";
import { useSelector } from "react-redux";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EXAM_BENEFITS = [
  "Comprehensive practice questions with detailed explanations",
  "Real exam environment simulation and timed tests",
  "Instant feedback and detailed performance analytics",
  "Updated topic coverage for top IT certifications",
];

export default function ExamTopicsPage() {
  const { data, isLoading, isError } = useGetExamTopicsConfigQuery();
  const user = useSelector((state) => state.auth?.user);
  
  const [activeSet, setActiveSet] = useState(null);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem("activeExamTopicsSet");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore the active set if it belongs to the current user
        if (parsed.userId === user?.id) {
          setActiveSet(parsed);
        } else if (!user?.id) {
          // If auth is strictly loading/missing, wait.
          // Don't auto-clear unless we confirm it's a mismatch.
        }
      }
    } catch {}
  }, [user?.id]);
  
  const [playerKey, setPlayerKey] = useState(0);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const [isFinished, setIsFinished] = useState(() => {
    try {
      if (activeSet?.set) {
        const progressKey = `exam_progress_${user?.id || "guest"}_${activeSet.type}_${activeSet.set.id}`;
        const saved = localStorage.getItem(progressKey);
        if (saved) return JSON.parse(saved).finished === true;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    if (activeSet?.set) {
      try {
        const progressKey = `exam_progress_${user?.id || "guest"}_${activeSet.type}_${activeSet.set.id}`;
        const saved = localStorage.getItem(progressKey);
        if (saved) {
          setIsFinished(JSON.parse(saved).finished === true);
          return;
        }
      } catch {}
    }
    setIsFinished(false);
  }, [activeSet, user?.id, playerKey]);

  const config = useMemo(() => {
    const payload = data?.data ?? data;
    let cfg = payload?.config;
    if (typeof cfg === "string") {
      try {
        cfg = JSON.parse(cfg);
      } catch {
        cfg = {};
      }
    }
    return normalizeExamTopicsConfig(cfg);
  }, [data]);

  const startSet = (type, set) => {
    const val = { type, set, userId: user?.id };
    setActiveSet(val);
    localStorage.setItem("activeExamTopicsSet", JSON.stringify(val));
    setPlayerKey((k) => k + 1);
  };

  const handleCancelConfirm = () => {
    if (activeSet?.set) {
      clearAssessmentAutoSave(user?.id, "exam_progress", `${activeSet.type}_${activeSet.set.id}`);
    }
    setActiveSet(null);
    localStorage.removeItem("activeExamTopicsSet");
    setIsCancelOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Exam Topics…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center space-y-4">
        <h1 className="text-xl font-semibold">Exam Topics</h1>
        <p className="text-muted-foreground">
          Exam Topics is not available right now. Please check back later.
        </p>
        <Button variant="outline" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  if (activeSet?.set) {
    const { type, set } = activeSet;
    const isFree = set.is_free ?? (set.price ? Number(set.price) === 0 : true);
    const priceText = isFree ? "FREE" : `₹${set.price || 0}`;
    const hasCert = !!set.certificate_id;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <SEO title={`${set.title} | Exam Topics`} description={stripHtmlToPlain(set.description) || "Practice exam topics"} />
        
        <div className="flex items-center gap-4 mb-6 -ml-2">
          {/* Back button just leaves the page without cancelling progress */}
          <Button variant="ghost" size="sm" onClick={() => {
            setActiveSet(null);
            localStorage.removeItem("activeExamTopicsSet");
          }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Exam Topics
          </Button>
          
          {/* Cancel button triggers the confirmation dialog, hidden if already finished */}
          {!isFinished && (
            <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200" onClick={() => setIsCancelOpen(true)}>
              Cancel Assessment
            </Button>
          )}
        </div>

        <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
              <AlertDialogDescription>
                This will discard all your current progress and answers. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsCancelOpen(false)}>Keep Assessment</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelConfirm} className="bg-rose-600 hover:bg-rose-700 text-white">
                Yes, Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{set.title}</h1>
        {set.description && stripHtmlToPlain(set.description) ? (
          <div className="text-sm text-muted-foreground mb-4 prose prose-sm max-w-none">
            <RichTextContent
              html={sanitizeCourseDescriptionHtml(set.description)}
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-8">
          <Badge variant="outline" className="px-3 py-1 font-semibold">
            {type === "exam" ? "Timed Exam Mode" : "Learning Mode"}
          </Badge>
          <Badge
            variant="secondary"
            className={isFree ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1" : "bg-amber-50 text-amber-700 border-amber-200 font-bold px-3 py-1"}
          >
            {priceText}
          </Badge>
          {hasCert && (
            <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold px-3 py-1 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-600" /> Certificate Provided
            </Badge>
          )}
          <span>
            {type === "exam"
              ? `${set.timeLimitMinutes || 50} minutes limit • ${set.passingPercentage ?? 70}% to pass`
              : "Instant explanations included"}
          </span>
        </div>
        <ExamTopicsQuizPlayer
          key={playerKey}
          mode={type}
          setId={set.id}
          sectionConfig={set}
          onFinish={() => setIsFinished(true)}
          onRetake={() => setIsFinished(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <SEO title="Exam Topics | Certification Practice & Mock Exams" description="Prepare for your IT certifications with practice sets and timed mock exams." />
      <main className="pb-16">
        <Tabs defaultValue="learning" className="w-full">
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/95 via-slate-50 to-indigo-100/70 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08)]">
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.06] motion-reduce:opacity-[0.04]"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1920&q=80')",
              }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50/90 via-white/75 to-indigo-50/60" aria-hidden />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 md:py-10 pb-14 md:pb-16">
              <div className="grid lg:grid-cols-10 gap-6 lg:gap-8 items-center">
                <div className="lg:col-span-6 min-w-0 flex flex-col gap-6 md:gap-8">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md ring-4 ring-blue-500/10">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
                        Exam Topics &amp; Practice Sets
                      </h1>
                      <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                        Master certification topics with self-paced learning sets and full-length timed mock exams.
                      </p>
                    </div>
                  </div>

                  <TabsList className="grid w-full max-w-md grid-cols-2 h-11 p-1 bg-white/80 backdrop-blur-sm border border-slate-200/70 shadow-sm">
                    <TabsTrigger
                      value="learning"
                      className="gap-2 font-bold text-muted-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <BookOpen className="w-4 h-4" />
                      Learning Mode
                    </TabsTrigger>
                    <TabsTrigger
                      value="exam"
                      className="gap-2 font-bold text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <GraduationCap className="w-4 h-4" />
                      Timed Exam
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="lg:col-span-4 min-w-0 lg:self-center">
                  <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground px-4 py-3.5 md:px-5 md:py-4 shadow-md border border-white/10">
                    <h2 className="text-base md:text-lg font-bold mb-2">Why Practice With Us</h2>
                    <ul className="space-y-1.5">
                      {EXAM_BENEFITS.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs md:text-sm leading-snug">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-premium" />
                          <span className="text-primary-foreground/95">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="relative z-10 bg-white pt-10 md:pt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <TabsContent value="learning" className="mt-0">
                {config.learningSets.length === 0 ? (
                  <Card className="border border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground text-sm">
                      No learning sets available right now. Check back soon!
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {config.learningSets.map((set) => {
                      const isFree = set.is_free ?? (set.price ? Number(set.price) === 0 : true);
                      const priceLabel = isFree ? "FREE" : `₹${set.price || 0}`;
                      const hasCert = !!set.certificate_id;

                      return (
                        <Card key={set.id} className="flex flex-col border shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                <FileText className="w-3 h-3 mr-1" />
                                {set.questions?.length || 0} Questions
                              </Badge>
                              <div className="flex items-center gap-1.5">
                                {hasCert && (
                                  <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold py-0.5 flex items-center gap-1" title="Completion Certificate Included">
                                    <Award className="w-3 h-3 text-purple-600" /> Certificate
                                  </Badge>
                                )}
                                <Badge
                                  variant="secondary"
                                  className={isFree ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs" : "bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs"}
                                >
                                  {priceLabel}
                                </Badge>
                              </div>
                            </div>
                            <CardTitle className="text-lg leading-snug">{set.title}</CardTitle>
                            {set.description && stripHtmlToPlain(set.description) ? (
                              <CardDescription className="line-clamp-2 mt-1.5 text-xs text-muted-foreground">
                                {stripHtmlToPlain(set.description)}
                              </CardDescription>
                            ) : null}
                          </CardHeader>
                          <CardContent className="pt-0 pb-5">
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 font-semibold gap-2"
                              onClick={() => startSet("learning", set)}
                            >
                              <BookOpen className="w-4 h-4" /> Start Learning
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="exam" className="mt-0">
                {config.exams.length === 0 ? (
                  <Card className="border border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground text-sm">
                      No timed exam sets available right now. Check back soon!
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {config.exams.map((set) => {
                      const isFree = set.is_free ?? (set.price ? Number(set.price) === 0 : true);
                      const priceLabel = isFree ? "FREE" : `₹${set.price || 0}`;
                      const hasCert = !!set.certificate_id;

                      return (
                        <Card key={set.id} className="flex flex-col border shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {set.questions?.length || 0} Qs
                                </Badge>
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {set.timeLimitMinutes || 50}m
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {hasCert && (
                                  <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold py-0.5 flex items-center gap-1" title="Completion Certificate Included">
                                    <Award className="w-3 h-3 text-purple-600" /> Certificate
                                  </Badge>
                                )}
                                <Badge
                                  variant="secondary"
                                  className={isFree ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs" : "bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs"}
                                >
                                  {priceLabel}
                                </Badge>
                              </div>
                            </div>
                            <CardTitle className="text-lg leading-snug">{set.title}</CardTitle>
                            {set.description && stripHtmlToPlain(set.description) ? (
                              <CardDescription className="line-clamp-2 mt-1.5 text-xs text-muted-foreground">
                                {stripHtmlToPlain(set.description)}
                              </CardDescription>
                            ) : null}
                          </CardHeader>
                          <CardContent className="pt-0 pb-5">
                            <Button
                              className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold gap-2"
                              onClick={() => startSet("exam", set)}
                            >
                              <GraduationCap className="w-4 h-4" /> Start Exam
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
